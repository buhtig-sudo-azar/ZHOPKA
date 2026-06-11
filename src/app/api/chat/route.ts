const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY

// Same cache as /api/models for fallback chain
let cachedFreeModels: { id: string }[] = []
let cacheExpiry = 0
const CACHE_TTL = 5 * 60 * 1000

async function fetchFreeModels(): Promise<string[]> {
  const now = Date.now()
  if (cachedFreeModels.length > 0 && now < cacheExpiry) {
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
    cacheExpiry = now + CACHE_TTL
    return models.map((m) => m.id)
  } catch {
    return [
      'moonshotai/kimi-k2.6:free',
      'nvidia/nemotron-3-ultra-550b-a55b:free',
      'google/gemma-3-27b-it:free',
      'mistralai/mistral-small-3.1-24b-instruct:free',
      'deepseek/deepseek-chat-v3-0324:free',
    ]
  }
}

interface RateLimitedModel {
  model: string
  reason: string
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      messages,
      systemPrompt,
      model: clientModel,
      apiToken,
      max_tokens = 1024,
      temperature = 0.7,
    } = body as {
      messages?: { role: string; content: string }[]
      systemPrompt?: string
      model?: string
      apiToken?: string
      max_tokens?: number
      temperature?: number
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: 'Сообщения не указаны' }, { status: 400 })
    }

    const token = apiToken || OPENROUTER_API_KEY
    if (!token) {
      return Response.json({ error: 'API ключ не настроен' }, { status: 500 })
    }

    const preferredModel = clientModel || 'moonshotai/kimi-k2.6:free'
    const freeModels = await fetchFreeModels()

    // Build model fallback chain: preferred first, then others
    const otherModels = freeModels.filter((m) => m !== preferredModel)
    const modelChain = [preferredModel, ...otherModels]

    const rateLimited: RateLimitedModel[] = []
    let usedModel = ''
    let chatResponse: Response | null = null

    // Prepare messages with system prompt
    const chatMessages = [...messages]
    if (systemPrompt) {
      chatMessages.unshift({ role: 'system', content: systemPrompt })
    }

    for (const model of modelChain) {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000)

      try {
        chatResponse = await fetch(OPENROUTER_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            model,
            messages: chatMessages,
            max_tokens,
            temperature,
            stream: true,
          }),
          signal: controller.signal,
        })

        clearTimeout(timeout)

        if (chatResponse.status === 429) {
          rateLimited.push({ model, reason: 'Rate limited' })
          continue
        }

        if (chatResponse.status === 404) {
          rateLimited.push({ model, reason: 'Не найдена' })
          continue
        }

        if (!chatResponse.ok) {
          rateLimited.push({ model, reason: `Ошибка ${chatResponse.status}` })
          continue
        }

        usedModel = model
        break
      } catch (err) {
        clearTimeout(timeout)
        if (err instanceof DOMException && err.name === 'AbortError') {
          rateLimited.push({ model, reason: 'Таймаут' })
        } else {
          rateLimited.push({ model, reason: 'Ошибка соединения' })
        }
        continue
      }
    }

    if (!chatResponse || !usedModel) {
      return Response.json(
        { error: 'Все модели недоступны. Попробуйте позже.', rateLimited },
        { status: 503 }
      )
    }

    // Stream the response as SSE
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        // Send model_info event
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: 'model_info', model: usedModel, rateLimited })}\n\n`
          )
        )

        const reader = chatResponse!.body?.getReader()
        if (!reader) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'Нет потока' })}\n\n`)
          )
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
          return
        }

        const decoder = new TextDecoder()
        let buffer = ''

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() || ''

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue
              const data = line.slice(6).trim()
              if (data === '[DONE]') {
                controller.enqueue(encoder.encode('data: [DONE]\n\n'))
                continue
              }

              try {
                const parsed = JSON.parse(data)
                const content = parsed.choices?.[0]?.delta?.content
                if (content) {
                  controller.enqueue(
                    encoder.encode(
                      `data: ${JSON.stringify({ type: 'content', content })}\n\n`
                    )
                  )
                }
              } catch {
                // skip unparseable chunks
              }
            }
          }

          // Ensure [DONE] is sent
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        } catch (err) {
          console.error('[api/chat] Stream error:', err)
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'error', message: 'Ошибка потока' })}\n\n`
            )
          )
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Model-Used': usedModel,
      },
    })
  } catch (err) {
    console.error('[api/chat] Error:', err)
    return Response.json(
      { error: 'Ошибка чата. Попробуйте ещё раз.' },
      { status: 500 }
    )
  }
}
