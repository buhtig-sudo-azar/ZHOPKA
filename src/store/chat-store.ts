'use client'

import { create } from 'zustand'
import { useModelStore } from './model-store'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  isStreaming?: boolean
}

interface ChatStoreState {
  messages: ChatMessage[]
  isOpen: boolean
  isStreaming: boolean
  abortController: AbortController | null

  setIsOpen: (v: boolean) => void
  toggleOpen: () => void
  sendMessage: (text: string, systemPrompt?: string) => Promise<void>
  appendToLastMessage: (content: string) => void
  finalizeLastMessage: () => void
  cancelStream: () => void
  retryLastMessage: () => Promise<void>
  clearMessages: () => void
}

let messageCounter = 0

function createMessage(role: 'user' | 'assistant' | 'system', content: string): ChatMessage {
  return {
    id: `msg-${Date.now()}-${messageCounter++}`,
    role,
    content,
    timestamp: Date.now(),
  }
}

export const useChatStore = create<ChatStoreState>((set, get) => ({
  messages: [],
  isOpen: false,
  isStreaming: false,
  abortController: null,

  setIsOpen: (v) => set({ isOpen: v }),

  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),

  sendMessage: async (text, systemPrompt) => {
    const userMsg = createMessage('user', text)
    const assistantMsg = createMessage('assistant', '')
    assistantMsg.isStreaming = true

    set((state) => ({
      messages: [...state.messages, userMsg, assistantMsg],
      isStreaming: true,
    }))

    const { currentModel, apiToken } = useModelStore.getState()

    const controller = new AbortController()
    set({ abortController: controller })

    try {
      const allMessages = [
        ...get().messages.filter((m) => !m.isStreaming).map((m) => ({
          role: m.role,
          content: m.content,
        })),
      ]

      const body: Record<string, unknown> = {
        messages: allMessages,
        model: currentModel,
        apiToken: apiToken || undefined,
        max_tokens: 1024,
        temperature: 0.7,
      }

      if (systemPrompt) {
        body.systemPrompt = systemPrompt
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Ошибка чата' }))
        get().appendToLastMessage(`❌ ${errData.error || 'Ошибка чата'}`)
        get().finalizeLastMessage()
        return
      }

      const reader = res.body?.getReader()
      if (!reader) {
        get().appendToLastMessage('❌ Нет потока данных')
        get().finalizeLastMessage()
        return
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              if (parsed.type === 'content' && parsed.content) {
                get().appendToLastMessage(parsed.content)
              } else if (parsed.type === 'error') {
                get().appendToLastMessage(`❌ ${parsed.message || 'Ошибка'}`)
              }
            } catch {
              // Not JSON, treat as plain text
              if (data && data !== '[DONE]') {
                get().appendToLastMessage(data)
              }
            }
          }
        }
      }

      get().finalizeLastMessage()
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        get().appendToLastMessage('\n\n⏹ Генерация остановлена')
        get().finalizeLastMessage()
      } else {
        get().appendToLastMessage(`❌ ${err instanceof Error ? err.message : 'Ошибка'}`)
        get().finalizeLastMessage()
      }
    } finally {
      set({ isStreaming: false, abortController: null })
    }
  },

  appendToLastMessage: (content) =>
    set((state) => {
      const messages = [...state.messages]
      const last = messages[messages.length - 1]
      if (last) {
        messages[messages.length - 1] = {
          ...last,
          content: last.content + content,
        }
      }
      return { messages }
    }),

  finalizeLastMessage: () =>
    set((state) => {
      const messages = [...state.messages]
      const last = messages[messages.length - 1]
      if (last) {
        messages[messages.length - 1] = {
          ...last,
          isStreaming: false,
        }
      }
      return { messages }
    }),

  cancelStream: () => {
    const { abortController } = get()
    if (abortController) {
      abortController.abort()
    }
  },

  retryLastMessage: async () => {
    const { messages, isStreaming } = get()
    if (isStreaming) return

    // Find last user message
    let lastUserIndex = -1
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserIndex = i
        break
      }
    }
    if (lastUserIndex === -1) return

    const lastUserMsg = messages[lastUserIndex].content

    // Remove last user message and any assistant messages after it
    const trimmed = messages.slice(0, lastUserIndex)
    set({ messages: trimmed })

    await get().sendMessage(lastUserMsg)
  },

  clearMessages: () => set({ messages: [] }),
}))
