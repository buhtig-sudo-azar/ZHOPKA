const FALLBACK_MODELS = [
  { id: 'moonshotai/kimi-k2.6:free', name: 'Kimi K2.6', label: 'Kimi K2.6' },
  { id: 'nvidia/nemotron-3-ultra-550b-a55b:free', name: 'Nemotron Ultra', label: 'Nemotron Ultra' },
  { id: 'google/gemma-3-27b-it:free', name: 'Gemma 3 27B', label: 'Gemma 3 27B' },
  { id: 'mistralai/mistral-small-3.1-24b-instruct:free', name: 'Mistral Small 3.1', label: 'Mistral Small 3.1' },
  { id: 'meta-llama/llama-4-maverick:free', name: 'Llama 4 Maverick', label: 'Llama 4 Maverick' },
  { id: 'qwen/qwen3-235b-a22b:free', name: 'Qwen3 235B', label: 'Qwen3 235B' },
  { id: 'deepseek/deepseek-r1-0528:free', name: 'DeepSeek R1', label: 'DeepSeek R1' },
  { id: 'deepseek/deepseek-chat-v3-0324:free', name: 'DeepSeek V3', label: 'DeepSeek V3' },
  { id: 'microsoft/phi-4-reasoning-plus:free', name: 'Phi-4 Reasoning+', label: 'Phi-4 Reasoning+' },
  { id: 'rekaai/reka-flash-3:free', name: 'Reka Flash 3', label: 'Reka Flash 3' },
  { id: 'google/gemma-3-12b-it:free', name: 'Gemma 3 12B', label: 'Gemma 3 12B' },
  { id: 'meta-llama/llama-4-scout:free', name: 'Llama 4 Scout', label: 'Llama 4 Scout' },
  { id: 'qwen/qwen3-30b-a3b:free', name: 'Qwen3 30B', label: 'Qwen3 30B' },
  { id: 'mistralai/devstral-small-2507:free', name: 'Devstral Small', label: 'Devstral Small' },
]

// Simple in-memory cache
let cachedModels: { models: typeof FALLBACK_MODELS } | null = null
let cacheExpiry = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function GET() {
  const now = Date.now()

  if (cachedModels && now < cacheExpiry) {
    return Response.json(cachedModels)
  }

  try {
    const res = await fetch('https://openrouter.ai/api/v1/models', {
      next: { revalidate: 300 },
    })

    if (!res.ok) {
      throw new Error(`API returned ${res.status}`)
    }

    const data = await res.json()
    const allModels = data.data || []

    const freeModels = allModels
      .filter(
        (m: { id: string; name: string }) =>
          m.id.endsWith(':free') && !m.id.includes('content-safety')
      )
      .map((m: { id: string; name: string }) => ({
        id: m.id,
        name: m.name || m.id,
        label: m.name?.replace(/:free$/, '') || m.id.replace(/:free$/, ''),
      }))

    if (freeModels.length === 0) {
      throw new Error('No free models found')
    }

    cachedModels = { models: freeModels }
    cacheExpiry = now + CACHE_TTL

    return Response.json(cachedModels)
  } catch (err) {
    console.error('[api/models] Failed to fetch, using fallback:', err)

    cachedModels = { models: FALLBACK_MODELS }
    cacheExpiry = now + CACHE_TTL

    return Response.json(cachedModels)
  }
}
