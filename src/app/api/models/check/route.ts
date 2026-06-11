const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

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

    const start = Date.now()

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    try {
      const res = await fetch(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeout)
      const latency = Date.now() - start

      if (res.status === 429) {
        const rateLimitLimit = res.headers.get('x-ratelimit-limit')
        const rateLimitRemaining = res.headers.get('x-ratelimit-remaining')
        const rateLimitReset = res.headers.get('x-ratelimit-reset')

        return Response.json({
          available: false,
          model,
          reason: 'Rate limited',
          latency,
          rateLimit: {
            limit: rateLimitLimit ? parseInt(rateLimitLimit) : undefined,
            remaining: rateLimitRemaining ? parseInt(rateLimitRemaining) : 0,
            reset: rateLimitReset ? parseInt(rateLimitReset) : undefined,
          },
        })
      }

      if (res.status === 404) {
        return Response.json({
          available: false,
          model,
          reason: 'Модель не найдена',
          latency,
        })
      }

      if (res.status === 401 || res.status === 403) {
        return Response.json({
          available: false,
          model,
          reason: 'Неверный API ключ',
          latency,
        })
      }

      if (!res.ok) {
        return Response.json({
          available: false,
          model,
          reason: `Ошибка ${res.status}`,
          latency,
        })
      }

      // Model is available
      const rateLimitLimit = res.headers.get('x-ratelimit-limit')
      const rateLimitRemaining = res.headers.get('x-ratelimit-remaining')
      const rateLimitReset = res.headers.get('x-ratelimit-reset')

      return Response.json({
        available: true,
        model,
        latency,
        rateLimit: {
          limit: rateLimitLimit ? parseInt(rateLimitLimit) : undefined,
          remaining: rateLimitRemaining ? parseInt(rateLimitRemaining) : undefined,
          reset: rateLimitReset ? parseInt(rateLimitReset) : undefined,
        },
      })
    } catch (fetchErr) {
      clearTimeout(timeout)
      if (fetchErr instanceof DOMException && fetchErr.name === 'AbortError') {
        return Response.json({
          available: false,
          model,
          reason: 'Таймаут (8с)',
          latency: Date.now() - start,
        })
      }
      throw fetchErr
    }
  } catch (err) {
    console.error('[api/models/check] Error:', err)
    return Response.json(
      { error: 'Ошибка проверки модели' },
      { status: 500 }
    )
  }
}
