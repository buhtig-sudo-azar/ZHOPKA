const jsonRes = (data: Record<string, unknown>, status = 200, headers?: Record<string, string>) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  })

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

// Free models cache for fallback chain
let cachedFreeModels: { id: string }[] = []
let modelsCacheExpiry = 0
const MODELS_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

async function fetchFreeModels(): Promise<string[]> {
  const now = Date.now()
  if (cachedFreeModels.length > 0 && now < modelsCacheExpiry) {
    return cachedFreeModels.map((m) => m.id)
  }

  try {
    const res = await fetch('https://openrouter.ai/api/v1/models')
    if (!res.ok) throw new Error(`API ${res.status}`)
    const data = await res.json()
    const models = (data.data || [])
      .filter((m: { id: string }) => m.id.endsWith(':free') && !m.id.includes('content-safety'))
      .map((m: { id: string }) => ({ id: m.id }))
    cachedFreeModels = models
    modelsCacheExpiry = now + MODELS_CACHE_TTL
    return models.map((m) => m.id)
  } catch {
    // Fallback model list
    return [
      'moonshotai/kimi-k2.6:free',
      'nvidia/nemotron-3-ultra-550b-a55b:free',
      'google/gemma-3-27b-it:free',
      'mistralai/mistral-small-3.1-24b-instruct:free',
      'deepseek/deepseek-chat-v3-0324:free',
      'qwen/qwen3-235b-a22b:free',
      'meta-llama/llama-4-maverick:free',
    ]
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      productName,
      category,
      sellingPoints,
      targetAudience,
      keywords,
      style,
      model: clientModel,
      apiToken,
      max_tokens = 1024,
      temperature = 0.7,
    } = body as {
      productName?: string
      category?: string
      sellingPoints?: string
      targetAudience?: string
      keywords?: string
      style?: string
      model?: string
      apiToken?: string
      max_tokens?: number
      temperature?: number
    }

    // Resolve API token: user's token takes priority
    const token = apiToken || OPENROUTER_API_KEY
    if (!token) {
      return jsonRes({ error: 'API ключ не настроен. Добавьте ключ в настройках модели.' }, 500)
    }

    if (!productName) {
      return jsonRes({ error: 'Название товара обязательно' }, 400)
    }

    const styleDescriptions: Record<string, string> = {
      minimalism: 'минималистичный, чистый, лаконичный',
      premium: 'премиальный, роскошный, эксклюзивный',
      fun: 'весёлый, яркий, энергичный',
      elegant: 'элегантный, утончённый, изысканный',
      sporty: 'спортивный, динамичный, активный',
      strict: 'строгий, профессиональный, деловой',
    }

    const styleDesc = styleDescriptions[style || ''] || style || 'минималистичный'

    const systemPrompt = `Ты — профессиональный e-commerce копирайтер с многолетним опытом создания продающих текстов для маркетплейсов. Твои тексты увеличивают конверсию и привлекают внимание покупателей. Ты пишешь на русском языке. Ты всегда отвечаешь ТОЛЬКО в формате JSON без какого-либо дополнительного текста или комментариев.`

    const userPrompt = `Создай маркетинговый контент для товара со следующими характеристиками:

Название товара: ${productName}
Категория: ${category || 'Не указана'}
Ключевые преимущества: ${sellingPoints || 'Не указаны'}
Целевая аудитория: ${targetAudience || 'Широкая аудитория'}
Ключевые слова/теги: ${keywords || 'Не указаны'}
Стиль подачи: ${styleDesc}

Верни результат СТРОГО в формате JSON (без markdown, без \`\`\`, только чистый JSON):
{
  "title": "Заголовок товара (максимум 80 символов, привлекательный, с ключевыми словами)",
  "subtitle": "Подзаголовок (максимум 120 символов, раскрывающий основную выгоду)",
  "description": "Краткое описание (2-3 предложения, эмоциональное и продающее)",
  "features": ["Преимущество 1", "Преимущество 2", "Преимущество 3", "Преимущество 4", "Преимущество 5"]
}

Требования:
- Заголовок должен быть SEO-оптимизированным и содержать ключевые слова
- Подзаголовок должен вызывать желание узнать больше
- Описание должно быть эмоциональным и подчёркивать выгоды для покупателя
- Каждый элемент features должен быть кратким (до 50 символов) и начинаться с существенного слова
- Стиль текста: ${styleDesc}
- Язык: русский`

    // Build fallback model chain
    const preferredModel = clientModel || OPENROUTER_API_KEY ? (clientModel || 'moonshotai/kimi-k2.6:free') : 'moonshotai/kimi-k2.6:free'
    const freeModels = await fetchFreeModels()
    const otherModels = freeModels.filter((m) => m !== preferredModel)
    const modelChain = [preferredModel, ...otherModels]

    let usedModel = ''
    let responseText = ''

    for (const model of modelChain) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000)

      try {
        const response = await fetch(OPENROUTER_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            max_tokens,
            temperature,
          }),
          signal: controller.signal,
        })

        clearTimeout(timeout)

        if (response.status === 401 || response.status === 403) {
          // Auth error — no point trying other models with the same bad key
          console.error(`[generate-text] Auth error (${response.status}) — API ключ невалиден`)
          return jsonRes({ error: 'API ключ невалиден. Проверьте ключ в настройках модели.' }, 401)
        }

        if (response.status === 429 || response.status === 404) {
          // Rate limited or not found, try next model
          console.warn(`[generate-text] Model ${model} returned ${response.status}, trying next...`)
          continue
        }

        if (!response.ok) {
          const errText = await response.text().catch(() => '')
          console.error(`[generate-text] Model ${model} error:`, response.status, errText)
          continue
        }

        const data = await response.json()
        const content = data.choices?.[0]?.message?.content

        if (!content) {
          console.warn(`[generate-text] Model ${model} returned empty content`)
          continue
        }

        usedModel = model
        responseText = content
        break
      } catch (err) {
        clearTimeout(timeout)
        if (err instanceof DOMException && err.name === 'AbortError') {
          console.warn(`[generate-text] Model ${model} timed out`)
        } else {
          console.error(`[generate-text] Model ${model} error:`, err)
        }
        continue
      }
    }

    if (!usedModel || !responseText) {
      return jsonRes({ error: 'Все модели недоступны. Попробуйте позже.' }, 503)
    }

    let parsed: { title: string; subtitle: string; description: string; features: string[] }
    try {
      const cleanedContent = responseText
        .replace(/```json\s*/g, '')
        .replace(/```\s*/g, '')
        .trim()
      parsed = JSON.parse(cleanedContent)
    } catch {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        console.error('[generate-text] Could not parse response:', responseText.slice(0, 200))
        return jsonRes({ error: 'Не удалось распарсить ответ сервиса' }, 500)
      }
      parsed = JSON.parse(jsonMatch[0])
    }

    if (!parsed.title || !parsed.subtitle || !parsed.description || !Array.isArray(parsed.features)) {
      console.error('[generate-text] Incomplete response:', JSON.stringify(parsed).slice(0, 200))
      return jsonRes({ error: 'Неполный ответ от сервиса' }, 500)
    }

    return jsonRes(
      {
        title: parsed.title,
        subtitle: parsed.subtitle,
        description: parsed.description,
        features: parsed.features,
      },
      200,
      { 'X-Model-Used': usedModel }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[generate-text] Error:', message)
    return jsonRes({ error: 'Ошибка генерации текста. Попробуйте ещё раз.' }, 500)
  }
}
