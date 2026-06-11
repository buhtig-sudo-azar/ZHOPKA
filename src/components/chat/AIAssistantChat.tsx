'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageCircle,
  X,
  Minimize2,
  Maximize2,
  Send,
  StopCircle,
  RotateCcw,
  Trash2,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { useChatStore } from '@/store/chat-store'

const SUGGESTIONS = [
  'Помоги придумать заголовок для товара',
  'Какие преимущества указать?',
  'Подскажи ключевые слова',
  'Как описать товар для WB?',
]

const SYSTEM_PROMPT = `Ты — AI-ассистент для создания карточек товаров на маркетплейсах (Wildberries, Ozon, Яндекс Маркет). Ты помогаешь продавцам создавать продающие тексты, подбирать ключевые слова и оптимизировать карточки. Отвечай кратко и по делу на русском языке. Если пользователь просит помочь с конкретным товаром, давай конкретные рекомендации.`

export function AIAssistantChat() {
  const {
    messages,
    isOpen,
    isStreaming,
    toggleOpen,
    setIsOpen,
    sendMessage,
    cancelStream,
    retryLastMessage,
    clearMessages,
  } = useChatStore()

  const [input, setInput] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Focus input when opening
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || isStreaming) return
    setInput('')
    await sendMessage(text, SYSTEM_PROMPT)
  }, [input, isStreaming, sendMessage])

  const handleSuggestion = useCallback(
    (text: string) => {
      setInput('')
      sendMessage(text, SYSTEM_PROMPT)
    },
    [sendMessage]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50"
          >
            <Button
              onClick={toggleOpen}
              size="lg"
              className="h-12 w-12 sm:h-14 sm:w-14 rounded-full shadow-lg hover:shadow-xl transition-shadow"
            >
              <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`fixed z-50 flex flex-col bg-card border rounded-xl shadow-2xl overflow-hidden ${
              isExpanded
                ? 'inset-4 sm:inset-8 md:inset-16'
                : 'bottom-4 right-4 sm:bottom-6 sm:right-6 w-[calc(100vw-2rem)] sm:w-96 h-[70vh] sm:h-[500px]'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b bg-card">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <div>
                  <h3 className="text-sm font-semibold">AI-Ассистент</h3>
                  <p className="text-[10px] text-muted-foreground">Помощь с карточками товаров</p>
                </div>
              </div>
              <div className="flex items-center gap-0.5">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={clearMessages}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsExpanded(!isExpanded)}>
                  {isExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsOpen(false)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <Sparkles className="h-8 w-8 text-primary/40 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Привет! Я помогу с карточками
                  </p>
                  <p className="text-xs text-muted-foreground/70 mb-4">
                    Выберите вопрос или напишите свой
                  </p>
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        onClick={() => handleSuggestion(s)}
                        className="text-[11px] px-2.5 py-1.5 rounded-full border hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-lg px-3 py-2 text-xs sm:text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                    {msg.isStreaming && (
                      <span className="inline-block w-1.5 h-3.5 bg-foreground/50 animate-pulse ml-0.5 align-text-bottom" />
                    )}
                  </div>
                </div>
              ))}

              {isStreaming && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-3 py-2 text-xs text-muted-foreground">
                    Печатает...
                  </div>
                </div>
              )}
            </div>

            {/* Suggestions in chat */}
            {messages.length > 0 && !isStreaming && (
              <div className="px-3 pb-1.5 flex flex-wrap gap-1">
                {SUGGESTIONS.slice(0, 2).map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSuggestion(s)}
                    className="text-[10px] px-2 py-1 rounded-full border hover:bg-accent transition-colors text-muted-foreground"
                  >
                    {s}
                  </button>
                ))}
                {messages.length > 1 && (
                  <button
                    onClick={retryLastMessage}
                    className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full border hover:bg-accent transition-colors text-muted-foreground"
                  >
                    <RotateCcw className="h-2.5 w-2.5" />
                    Повторить
                  </button>
                )}
              </div>
            )}

            {/* Input */}
            <div className="p-2.5 border-t bg-card">
              <div className="flex items-center gap-1.5">
                <Input
                  ref={inputRef}
                  placeholder="Спросите что-нибудь..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isStreaming}
                  className="h-9 text-xs"
                />
                {isStreaming ? (
                  <Button
                    variant="destructive"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={cancelStream}
                  >
                    <StopCircle className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={handleSend}
                    disabled={!input.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
