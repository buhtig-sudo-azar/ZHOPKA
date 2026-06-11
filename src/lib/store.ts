import { create } from 'zustand'

export interface ProductInput {
  productName: string
  category: string
  sellingPoints: string
  targetAudience: string
  keywords: string
  style: string
  uploadedImage: string | null
  uploadedImageName: string | null
  imageVariants: number
}

export interface GeneratedContent {
  title: string
  subtitle: string
  description: string
  features: string[]
}

interface GeneratorState {
  // Product input
  productInput: ProductInput
  setProductInput: (input: Partial<ProductInput>) => void
  resetProductInput: () => void

  // Generation state
  isGeneratingText: boolean
  isGeneratingImage: boolean
  generatedContent: GeneratedContent | null
  generatedImages: string[]
  selectedImageIndex: number
  completedImageCount: number

  // Model/token sync with model-store
  selectedModel: string
  apiToken: string
  setSelectedModel: (model: string) => void
  setApiToken: (token: string) => void

  // Actions
  setGeneratingText: (v: boolean) => void
  setGeneratingImage: (v: boolean) => void
  setGeneratedContent: (content: GeneratedContent) => void
  addGeneratedImage: (image: string) => void
  setSelectedImageIndex: (index: number) => void
  setCompletedImageCount: (count: number) => void
  updateContentField: (field: keyof GeneratedContent, value: string | string[]) => void
  resetResults: () => void
}

const defaultInput: ProductInput = {
  productName: '',
  category: '',
  sellingPoints: '',
  targetAudience: '',
  keywords: '',
  style: '',
  uploadedImage: null,
  uploadedImageName: null,
  imageVariants: 2,
}

export const useGeneratorStore = create<GeneratorState>((set) => ({
  productInput: { ...defaultInput },
  setProductInput: (input) =>
    set((state) => ({
      productInput: { ...state.productInput, ...input },
    })),
  resetProductInput: () => set({ productInput: { ...defaultInput } }),

  isGeneratingText: false,
  isGeneratingImage: false,
  generatedContent: null,
  generatedImages: [],
  selectedImageIndex: 0,
  completedImageCount: 0,

  // Model/token sync fields
  selectedModel: 'moonshotai/kimi-k2.6:free',
  apiToken: '',
  setSelectedModel: (model) => set({ selectedModel: model }),
  setApiToken: (token) => set({ apiToken: token }),

  setGeneratingText: (v) => set({ isGeneratingText: v }),
  setGeneratingImage: (v) => set({ isGeneratingImage: v }),
  setGeneratedContent: (content) => set({ generatedContent: content }),
  addGeneratedImage: (image) =>
    set((state) => ({
      generatedImages: [...state.generatedImages, image],
    })),
  setSelectedImageIndex: (index) => set({ selectedImageIndex: index }),
  setCompletedImageCount: (count) => set({ completedImageCount: count }),
  updateContentField: (field, value) =>
    set((state) => {
      if (!state.generatedContent) return state
      return {
        generatedContent: { ...state.generatedContent, [field]: value },
      }
    }),
  resetResults: () =>
    set({
      generatedContent: null,
      generatedImages: [],
      selectedImageIndex: 0,
      completedImageCount: 0,
      isGeneratingText: false,
      isGeneratingImage: false,
    }),
}))
