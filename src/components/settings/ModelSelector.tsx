'use client'

import { useEffect, useMemo, useState } from 'react'
import { Cpu, Search, Loader2, CheckCircle2, XCircle, MinusCircle, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useModelStore, type FreeModel, type ModelRateLimit } from '@/store/model-store'
import { ApiTokenInput } from './ApiTokenInput'

function RateIndicator({ rateLimit }: { rateLimit?: ModelRateLimit }) {
  if (!rateLimit || !rateLimit.checkedAt) {
    return <MinusCircle className="h-3 w-3 text-muted-foreground/40" />
  }

  if (rateLimit.available) {
    return <CheckCircle2 className="h-3 w-3 text-green-500" />
  }
  return <XCircle className="h-3 w-3 text-red-500" />
}

export function ModelSelector() {
  const {
    currentModel,
    setCurrentModel,
    availableModels,
    rateLimits,
    isLoadingModels,
    isCheckingAll,
    fetchAvailableModels,
    checkAllModels,
  } = useModelStore()

  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [customModel, setCustomModel] = useState('')

  useEffect(() => {
    if (open && availableModels.length === 0) {
      fetchAvailableModels()
    }
  }, [open, availableModels.length, fetchAvailableModels])

  const filteredModels = useMemo(() => {
    if (!search.trim()) return availableModels
    const q = search.toLowerCase()
    return availableModels.filter(
      (m: FreeModel) =>
        m.id.toLowerCase().includes(q) || m.label.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)
    )
  }, [availableModels, search])

  const currentLabel = useMemo(() => {
    const found = availableModels.find((m: FreeModel) => m.id === currentModel)
    if (found) return found.label
    // For custom models, show the ID without :free suffix
    return currentModel.replace(/:free$/, '').split('/').pop() || currentModel
  }, [currentModel, availableModels])

  const handleSelect = (modelId: string) => {
    setCurrentModel(modelId)
    setOpen(false)
    setSearch('')
  }

  const handleCustomModel = () => {
    if (!customModel.trim()) return
    const modelId = customModel.trim()
    setCurrentModel(modelId)
    setCustomModel('')
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8 sm:h-9 max-w-[200px] sm:max-w-[260px]">
          <Cpu className="h-3 w-3 shrink-0" />
          <span className="truncate">{currentLabel}</span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="end">
        <div className="p-3 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Поиск модели..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>

          {/* Model List */}
          <ScrollArea className="max-h-64">
            <div className="space-y-0.5">
              {isLoadingModels ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-xs text-muted-foreground">Загрузка моделей...</span>
                </div>
              ) : filteredModels.length === 0 ? (
                <div className="py-4 text-center text-xs text-muted-foreground">
                  Модели не найдены
                </div>
              ) : (
                filteredModels.map((model: FreeModel) => (
                  <button
                    key={model.id}
                    className={`w-full flex items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs hover:bg-accent transition-colors ${
                      currentModel === model.id ? 'bg-accent/80' : ''
                    }`}
                    onClick={() => handleSelect(model.id)}
                  >
                    <RateIndicator rateLimit={rateLimits[model.id]} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{model.label}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{model.id}</div>
                    </div>
                    {currentModel === model.id && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Custom model input */}
          <div className="space-y-1">
            <div className="text-[10px] text-muted-foreground font-medium">Своё название модели:</div>
            <div className="flex gap-1.5">
              <Input
                placeholder="org/model:free"
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCustomModel()}
                className="h-7 text-xs font-mono"
              />
              <Button
                variant="secondary"
                size="sm"
                className="h-7 text-xs shrink-0"
                onClick={handleCustomModel}
                disabled={!customModel.trim()}
              >
                ОК
              </Button>
            </div>
          </div>

          <Separator />

          {/* Check All Button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs h-8"
            onClick={checkAllModels}
            disabled={isCheckingAll || availableModels.length === 0}
          >
            {isCheckingAll ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                Проверка...
              </>
            ) : (
              'Проверить все'
            )}
          </Button>

          <Separator />

          {/* API Token Input */}
          <ApiTokenInput />

          {/* Rate limit legend */}
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1">
              <CheckCircle2 className="h-2.5 w-2.5 text-green-500" />
              Доступна
            </div>
            <div className="flex items-center gap-1">
              <XCircle className="h-2.5 w-2.5 text-red-500" />
              Недоступна
            </div>
            <div className="flex items-center gap-1">
              <MinusCircle className="h-2.5 w-2.5 text-muted-foreground/40" />
              Не проверена
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
