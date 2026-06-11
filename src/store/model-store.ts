'use client'

import { create } from 'zustand'

export interface FreeModel {
  id: string
  name: string
  label: string
}

export interface ModelRateLimit {
  available: boolean
  reason?: string
  remaining?: number
  limit?: number
  reset?: number
  checkedAt?: number
}

interface ModelStoreState {
  currentModel: string
  apiToken: string
  availableModels: FreeModel[]
  rateLimits: Record<string, ModelRateLimit>
  isLoadingModels: boolean
  isCheckingAll: boolean

  setCurrentModel: (model: string) => void
  setApiToken: (token: string) => void
  setAvailableModels: (models: FreeModel[]) => void
  setRateLimit: (modelId: string, info: ModelRateLimit) => void
  setLoadingModels: (v: boolean) => void
  setCheckingAll: (v: boolean) => void

  fetchAvailableModels: () => Promise<void>
  checkModel: (modelId: string) => Promise<ModelRateLimit>
  checkAllModels: () => Promise<void>
  markModelRateLimited: (modelId: string) => void
}

const STORAGE_KEY_MODEL = 'zhopka-current-model'
const STORAGE_KEY_TOKEN = 'zhopka-api-token'
const STORAGE_KEY_RATES = 'zhopka-rate-limits'

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : fallback
  } catch {
    return fallback
  }
}

function saveToStorage(key: string, value: unknown) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // ignore storage errors
  }
}

export const useModelStore = create<ModelStoreState>((set, get) => ({
  currentModel: 'moonshotai/kimi-k2.6:free',
  apiToken: '',
  availableModels: [],
  rateLimits: {},
  isLoadingModels: false,
  isCheckingAll: false,

  setCurrentModel: (model) => {
    set({ currentModel: model })
    saveToStorage(STORAGE_KEY_MODEL, model)
  },

  setApiToken: (token) => {
    set({ apiToken: token })
    saveToStorage(STORAGE_KEY_TOKEN, token)
  },

  setAvailableModels: (models) => set({ availableModels: models }),
  setRateLimit: (modelId, info) =>
    set((state) => {
      const rateLimits = { ...state.rateLimits, [modelId]: info }
      saveToStorage(STORAGE_KEY_RATES, rateLimits)
      return { rateLimits }
    }),

  setLoadingModels: (v) => set({ isLoadingModels: v }),
  setCheckingAll: (v) => set({ isCheckingAll: v }),

  fetchAvailableModels: async () => {
    set({ isLoadingModels: true })
    try {
      const res = await fetch('/api/models')
      const data = await res.json()
      if (data.models && Array.isArray(data.models)) {
        set({ availableModels: data.models })
      }
    } catch (err) {
      console.error('[model-store] Failed to fetch models:', err)
    } finally {
      set({ isLoadingModels: false })
    }
  },

  checkModel: async (modelId) => {
    const { apiToken } = get()
    try {
      const res = await fetch('/api/models/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelId, apiToken }),
      })
      const data = await res.json()
      const info: ModelRateLimit = {
        available: data.available ?? false,
        reason: data.reason,
        remaining: data.rateLimit?.remaining,
        limit: data.rateLimit?.limit,
        reset: data.rateLimit?.reset,
        checkedAt: Date.now(),
      }
      get().setRateLimit(modelId, info)
      return info
    } catch (err) {
      const info: ModelRateLimit = {
        available: false,
        reason: err instanceof Error ? err.message : 'Ошибка проверки',
        checkedAt: Date.now(),
      }
      get().setRateLimit(modelId, info)
      return info
    }
  },

  checkAllModels: async () => {
    const { availableModels } = get()
    if (availableModels.length === 0) return
    set({ isCheckingAll: true })
    try {
      // Check in batches of 3 to avoid overwhelming
      for (let i = 0; i < availableModels.length; i += 3) {
        const batch = availableModels.slice(i, i + 3)
        await Promise.all(batch.map((m) => get().checkModel(m.id)))
      }
    } finally {
      set({ isCheckingAll: false })
    }
  },

  markModelRateLimited: (modelId) => {
    get().setRateLimit(modelId, {
      available: false,
      reason: 'Rate limited',
      checkedAt: Date.now(),
    })
  },
}))

// Hydrate from localStorage on client
if (typeof window !== 'undefined') {
  const savedModel = loadFromStorage<string>(STORAGE_KEY_MODEL, '')
  const savedToken = loadFromStorage<string>(STORAGE_KEY_TOKEN, '')
  const savedRates = loadFromStorage<Record<string, ModelRateLimit>>(STORAGE_KEY_RATES, {})

  if (savedModel) {
    useModelStore.setState({ currentModel: savedModel })
  }
  if (savedToken) {
    useModelStore.setState({ apiToken: savedToken })
  }
  if (Object.keys(savedRates).length > 0) {
    useModelStore.setState({ rateLimits: savedRates })
  }
}
