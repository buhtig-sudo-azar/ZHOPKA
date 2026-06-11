'use client'

import { useState } from 'react'
import { Key, Eye, EyeOff, Trash2, CheckCircle2, XCircle, Loader2, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useModelStore } from '@/store/model-store'
import { useToast } from '@/hooks/use-toast'

export function ApiTokenInput() {
  const { apiToken, setApiToken } = useModelStore()
  const { toast } = useToast()
  const [showToken, setShowToken] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  const handleSave = () => {
    const trimmed = inputValue.trim()
    if (!trimmed) {
      toast({ title: 'Ошибка', description: 'Введите API ключ', variant: 'destructive' })
      return
    }
    setApiToken(trimmed)
    setInputValue('')
    setIsEditing(false)
    toast({ title: 'Сохранено', description: 'API ключ сохранён в браузере' })
  }

  const handleRemove = () => {
    setApiToken('')
    setInputValue('')
    setIsEditing(false)
    toast({ title: 'Удалено', description: 'API ключ удалён' })
  }

  const handleVerify = async () => {
    setIsVerifying(true)
    try {
      const res = await fetch('/api/models/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'moonshotai/kimi-k2.6:free', apiToken: apiToken || inputValue.trim() }),
      })
      const data = await res.json()

      if (data.available) {
        toast({
          title: 'Ключ валиден',
          description: `Модель доступна, задержка: ${data.latency}мс`,
        })
      } else {
        toast({
          title: 'Проблема с ключом',
          description: data.reason || 'Ключ не прошёл проверку',
          variant: 'destructive',
        })
      }
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось проверить ключ', variant: 'destructive' })
    } finally {
      setIsVerifying(false)
    }
  }

  const maskedToken = apiToken
    ? `${apiToken.slice(0, 6)}${'•'.repeat(Math.max(0, apiToken.length - 10))}${apiToken.slice(-4)}`
    : ''

  if (apiToken && !isEditing) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Key className="h-3 w-3" />
          <span>API ключ OpenRouter</span>
          <CheckCircle2 className="h-3 w-3 text-green-500" />
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex-1 rounded-md border bg-muted/50 px-2.5 py-1.5 text-xs font-mono truncate">
            {showToken ? apiToken : maskedToken}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => setShowToken(!showToken)}
          >
            {showToken ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={handleVerify}
            disabled={isVerifying}
          >
            {isVerifying ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
            onClick={handleRemove}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Key className="h-3 w-3" />
        <span>API ключ OpenRouter</span>
        {!apiToken && <XCircle className="h-3 w-3 text-muted-foreground/50" />}
      </div>
      <div className="flex items-center gap-1.5">
        <Input
          type="password"
          placeholder="sk-or-v1-..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          className="h-7 text-xs font-mono"
        />
        <Button
          variant="default"
          size="sm"
          className="h-7 text-xs shrink-0"
          onClick={handleSave}
          disabled={!inputValue.trim()}
        >
          Сохранить
        </Button>
      </div>
      <div className="flex items-center justify-between">
        <a
          href="https://openrouter.ai/keys"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[10px] text-primary hover:underline"
        >
          Получить бесплатный ключ <ExternalLink className="h-2.5 w-2.5" />
        </a>
        {apiToken && (
          <Button
            variant="ghost"
            size="sm"
            className="h-5 text-[10px] text-muted-foreground"
            onClick={() => setIsEditing(false)}
          >
            Отмена
          </Button>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground/70">
        Ключ хранится только в браузере и не отправляется на сервер
      </p>
    </div>
  )
}
