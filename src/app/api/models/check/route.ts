const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models'
const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions'
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

// Cache models list for 5 min
let cachedModelIds: Set<string> | null = null
let modelsCacheExpiry = 0
const MODELS_CACHE_TTL = 5 * 60 * 1000

async function fetchAvailableModelIds(): Promise<Set<string>> {
  const now = Date.now()
  if (cachedModelIds && now < modelsCacheExpiry) {
    return cachedModelIds
  }

  try {
    const res = await fetch(OPENROUTER_MODELS_URL)
    if (!res.ok) throw new Error(`API ${res.status}`)
    const data = await res.json()
    const ids = new Set<string>(
      (data.data || [])
        .filter((m: { id: string }) => m.id.endsWith(':free') && !m.id.includes('content-safety'))
        .map((m: { id: string }) => m.id)
    )
    cachedModelIds = ids
    modelsCacheExpiry = now + MODELS_CACHE_TTL
    return ids
  } catch {
    // If we can't fetch models list, assume they exist
    return new Set()
  }
}

// Verify API key works by making one lightweight chat request
let keyVerified = false
let keyVerifyExpiry = 0
const KEY_VERIFY_TTL = 2 * 60 * 1000 // re-verify every 2 min

async function verifyApiKey(token: string): Promise<{ valid: boolean; reason?: string }> {
  const now = Date.now()
  if (keyVerified && now < keyVerifyExpiry) {
    return { valid: true }
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10000)

    const res = await fetch(OPENROUTER_CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        model: 'google/gemma-3-12b-it:free',
        messages: [{ role: 'user', content: 'Hi, respond with just "ok"' }],
        max_tokens: 5,
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (res.status === 401 || res.status === 403) {
      return { valid: false, reason: 'Неверный API ключ' }
    }

    if (res.status === 429) {
      // Key is valid but rate limited — still mark as valid
      keyVerified = true
      keyVerifyExpiry = now + KEY_VERIFY_TTL
      return { valid: true }
    }

    if (res.ok) {
      keyVerified = true
      keyVerifyExpiry = now + KEY_VERIFY_TTL
      return { valid: true }
    }

    // Other errors — key might be valid, model might be down
    // Don't mark as invalid, just not verified
    return { valid: true }
  } catch {
    // Network error — can't verify, assume valid
    return { valid: true }
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { model, apiToken } = body as { model?: string; apiToken?: string }

    if (!model) {
      return Response.json({ error: 'Модель не указана' }, { status: 400 })
    }

    const token = apiToken || OPENROUTER_API_KEY
    if (!token) {
      return Response.json({
        available: false,
        model,
        reason: 'Нет API ключа',
      })
    }

    // Step 1: Check if API key is valid
    const keyCheck = await verifyApiKey(token)
    if (!keyCheck.valid) {
      return Response.json({
        available: false,
        model,
        reason: keyCheck.reason || 'Неверный API ключ',
      })
    }

    // Step 2: Check if model exists in OpenRouter's model list
    const availableModelIds = await fetchAvailableModelIds()

    if (availableModelIds.size > 0 && !availableModelIds.has(model)) {
      return Response.json({
        available: false,
        model,
        reason: 'Модель не найдена на OpenRouter',
      })
    }

    // Model exists in the list and key is valid — it's available
    return Response.json({
      available: true,
      model,
    })
  } catch (err) {
    console.error('[api/models/check] Error:', err)
    return Response.json(
      { error: 'Ошибка проверки модели' },
      { status: 500 }
    )
  }
}
