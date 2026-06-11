'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Sparkles,
  Upload,
  Download,
  RefreshCw,
  X,
  CheckCircle2,
  Loader2,
  ImageIcon,
  Type,
  ShoppingBag,
} from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useGeneratorStore } from '@/lib/store'
import { useModelStore } from '@/store/model-store'
import ProductCard from '@/components/product-card'
import { ThemeToggle } from '@/components/theme-toggle'
import { ModelSelector } from '@/components/settings/ModelSelector'

const CATEGORIES = [
  { value: 'electronics', label: 'Электроника' },
  { value: 'clothing', label: 'Одежда' },
  { value: 'beauty', label: 'Красота' },
  { value: 'home', label: 'Дом и сад' },
  { value: 'sport', label: 'Спорт' },
  { value: 'food', label: 'Еда' },
  { value: 'toys', label: 'Игрушки' },
  { value: 'auto', label: 'Авто' },
  { value: 'books', label: 'Книги' },
  { value: 'other', label: 'Другое' },
]

const STYLES = [
  { value: 'minimalism', label: 'Минимализм' },
  { value: 'premium', label: 'Премиум' },
  { value: 'fun', label: 'Весёлый' },
  { value: 'elegant', label: 'Элегантный' },
  { value: 'sporty', label: 'Спортивный' },
  { value: 'strict', label: 'Строгий' },
]

const BADGE_OPTIONS = [
  { value: 'none', label: 'Без бейджа' },
  { value: 'Хит продаж', label: 'Хит продаж' },
  { value: 'Новинка', label: 'Новинка' },
  { value: 'Лучшая цена', label: 'Лучшая цена' },
  { value: 'Топ выбор', label: 'Топ выбор' },
  { value: 'Эксклюзив', label: 'Эксклюзив' },
]

export default function Home() {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const previewWrapperRef = useRef<HTMLDivElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [selectedBadge, setSelectedBadge] = useState('none')
  const [isDownloading, setIsDownloading] = useState(false)
  const [cardScale, setCardScale] = useState(1)
  const [usedModel, setUsedModel] = useState<string | null>(null)

  const {
    productInput,
    setProductInput,
    isGeneratingText,
    generatedContent,
    generatedImages,
    setGeneratingText,
    setGeneratedContent,
    updateContentField,
    resetResults,
  } = useGeneratorStore()

  // Get model and token from model-store
  const { currentModel, apiToken } = useModelStore()

  const isGenerating = isGeneratingText
  const hasResults = generatedContent || generatedImages.length > 0 || productInput.uploadedImage
  const isCardVisible = generatedContent && productInput.uploadedImage

  // Масштабирование карточки — пересчитываем при любом изменении размера и при появлении карточки
  useEffect(() => {
    const updateScale = () => {
      if (previewWrapperRef.current) {
        const containerWidth = previewWrapperRef.current.offsetWidth
        setCardScale(containerWidth / 900)
      }
    }

    updateScale()

    const observer = new ResizeObserver(updateScale)
    if (previewWrapperRef.current) {
      observer.observe(previewWrapperRef.current)
    }

    return () => observer.disconnect()
  }, [isCardVisible])

  const handleImageUpload = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) {
        toast({ title: 'Ошибка', description: 'Загрузите изображение (jpg, png, webp)', variant: 'destructive' })
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: 'Ошибка', description: 'Размер файла не должен превышать 10 МБ', variant: 'destructive' })
        return
      }
      const reader = new FileReader()
      reader.onload = (e) => {
        const base64 = e.target?.result as string
        setProductInput({ uploadedImage: base64, uploadedImageName: file.name })
      }
      reader.readAsDataURL(file)
    },
    [setProductInput, toast]
  )

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleImageUpload(file)
  }, [handleImageUpload])

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragOver(true) }, [])
  const handleDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragOver(false) }, [])
  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleImageUpload(file)
  }, [handleImageUpload])

  const removeUploadedImage = useCallback(() => {
    setProductInput({ uploadedImage: null, uploadedImageName: null })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [setProductInput])

  const productImageForCard = productInput.uploadedImage

  const handleGenerate = useCallback(async () => {
    if (!productInput.productName.trim()) {
      toast({ title: 'Укажите название товара', description: 'Название обязательно для генерации', variant: 'destructive' })
      return
    }
    if (!productInput.uploadedImage) {
      toast({ title: 'Загрузите фото товара', description: 'Для генерации карточки необходимо загрузить фото', variant: 'destructive' })
      return
    }

    setGeneratingText(true)
    setUsedModel(null)
    try {
      const textRes = await fetch('/api/generate-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productName: productInput.productName,
          category: productInput.category,
          sellingPoints: productInput.sellingPoints,
          targetAudience: productInput.targetAudience,
          keywords: productInput.keywords,
          style: productInput.style,
          model: currentModel,
          apiToken: apiToken || undefined,
        }),
      })

      let textData
      try { textData = await textRes.json() } catch { throw new Error('Сервер вернул некорректный ответ') }
      if (!textRes.ok) throw new Error(textData?.error || 'Ошибка генерации текста')

      // Extract used model from response header
      const modelUsed = textRes.headers?.get('X-Model-Used')
      if (modelUsed) {
        setUsedModel(modelUsed)
      }

      setGeneratedContent(textData)
      toast({
        title: 'Карточка готова',
        description: modelUsed && modelUsed !== currentModel
          ? `Использована модель: ${modelUsed.split('/').pop()?.replace(':free', '')}`
          : 'Текст сгенерирован, карточка готова к скачиванию',
      })
    } catch (err) {
      toast({ title: 'Ошибка генерации', description: err instanceof Error ? err.message : 'Попробуйте ещё раз', variant: 'destructive' })
    } finally {
      setGeneratingText(false)
    }
  }, [productInput, setGeneratingText, setGeneratedContent, toast, currentModel, apiToken])

  const handleDownloadCard = useCallback(async () => {
    if (!cardRef.current) return
    setIsDownloading(true)
    try {
      const domToImage = (await import('dom-to-image-more')).default
      const dataUrl = await domToImage.toPng(cardRef.current, {
        width: 900, height: 1200, quality: 1,
        style: { transform: 'none' },
      })
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = `${productInput.productName || 'product'}-card.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast({ title: 'Скачано', description: 'Карточка товара сохранена' })
    } catch {
      toast({ title: 'Ошибка скачивания', description: 'Не удалось сохранить карточку', variant: 'destructive' })
    } finally {
      setIsDownloading(false)
    }
  }, [productInput.productName, toast])

  const handleRegenerate = useCallback(() => {
    useGeneratorStore.setState({ generatedImages: [], selectedImageIndex: 0, completedImageCount: 0 })
    handleGenerate()
  }, [handleGenerate])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex h-12 sm:h-14 md:h-16 max-w-7xl items-center justify-between px-3 sm:px-5 md:px-6 lg:px-8">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base md:text-lg font-bold leading-tight">E-Commerce Генератор</h1>
              <p className="hidden md:block text-xs text-muted-foreground">Готовые карточки для маркетплейсов</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <ModelSelector />
            <ThemeToggle />
            {hasResults && (
              <Button variant="outline" size="sm" onClick={resetResults} className="gap-1.5 text-xs h-8 sm:h-9">
                <RefreshCw className="h-3 w-3" />
                <span className="hidden sm:inline">Начать заново</span>
                <span className="sm:hidden">Заново</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-3 py-3 sm:px-5 sm:py-4 md:px-6 md:py-6 lg:px-8 lg:py-8">
        <div className="grid gap-3 sm:gap-4 md:gap-6 lg:grid-cols-2">
          {/* LEFT PANEL — Input Form */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card>
              <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6 pt-4 sm:pt-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Type className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Данные о товаре
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Заполните информацию — на основе неё сгенерируется готовая карточка
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 md:space-y-5 px-4 sm:px-6 pb-4 sm:pb-6">
                {/* Product Image Upload */}
                <div className="space-y-1.5 sm:space-y-2">
                  <Label className="text-xs sm:text-sm">Фото товара <span className="text-destructive font-normal">* обязательно</span></Label>
                  {!productInput.uploadedImage ? (
                    <div
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onClick={() => fileInputRef.current?.click()}
                      className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 sm:p-6 transition-colors ${
                        isDragOver
                          ? 'border-primary bg-primary/5'
                          : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
                      }`}
                    >
                      <Upload className={`mb-2 h-6 w-6 sm:h-8 sm:w-8 ${isDragOver ? 'text-primary' : 'text-muted-foreground'}`} />
                      <p className="text-xs sm:text-sm font-medium text-muted-foreground">
                        Перетащите фото или нажмите
                      </p>
                      <p className="mt-1 text-[10px] sm:text-xs text-muted-foreground/70">
                        JPG, PNG, WebP (до 10 МБ)
                      </p>
                    </div>
                  ) : (
                    <div className="relative inline-block">
                      <img
                        src={productInput.uploadedImage}
                        alt="Фото товара"
                        className="h-20 sm:h-28 md:h-32 w-auto max-w-full rounded-lg border object-contain"
                      />
                      <Button variant="destructive" size="icon" className="absolute -right-2 -top-2 h-6 w-6" onClick={removeUploadedImage}>
                        <X className="h-3 w-3" />
                      </Button>
                      <p className="mt-1 text-[10px] sm:text-xs text-muted-foreground truncate max-w-[200px] sm:max-w-none">
                        {productInput.uploadedImageName}
                      </p>
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileInput} />
                </div>

                {/* Product Name */}
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="productName" className="text-xs sm:text-sm">
                    Название товара <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="productName"
                    placeholder='Беспроводные наушники SoundMax Pro'
                    value={productInput.productName}
                    onChange={(e) => setProductInput({ productName: e.target.value })}
                    className="text-sm"
                  />
                </div>

                {/* Category + Style */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-xs sm:text-sm">Категория</Label>
                    <Select value={productInput.category} onValueChange={(value) => setProductInput({ category: value })}>
                      <SelectTrigger className="w-full text-sm"><SelectValue placeholder="Выберите" /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (<SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label className="text-xs sm:text-sm">Стиль карточки</Label>
                    <Select value={productInput.style} onValueChange={(value) => setProductInput({ style: value })}>
                      <SelectTrigger className="w-full text-sm"><SelectValue placeholder="Выберите" /></SelectTrigger>
                      <SelectContent>
                        {STYLES.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Key Selling Points */}
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="sellingPoints" className="text-xs sm:text-sm">Ключевые преимущества</Label>
                  <Textarea
                    id="sellingPoints"
                    placeholder={"Активное шумоподавление\nВремя работы 30 часов\nВодозащита IPX5"}
                    value={productInput.sellingPoints}
                    onChange={(e) => setProductInput({ sellingPoints: e.target.value })}
                    rows={3}
                    className="text-sm"
                  />
                  <p className="text-[10px] sm:text-xs text-muted-foreground">Каждое преимущество с новой строки</p>
                </div>

                {/* Target Audience + Keywords */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="targetAudience" className="text-xs sm:text-sm">Целевая аудитория</Label>
                    <Input id="targetAudience" placeholder='женщины 25-35' value={productInput.targetAudience} onChange={(e) => setProductInput({ targetAudience: e.target.value })} className="text-sm" />
                  </div>
                  <div className="space-y-1.5 sm:space-y-2">
                    <Label htmlFor="keywords" className="text-xs sm:text-sm">Ключевые слова</Label>
                    <Input id="keywords" placeholder='наушники, звук' value={productInput.keywords} onChange={(e) => setProductInput({ keywords: e.target.value })} className="text-sm" />
                  </div>
                </div>

                {/* Badge */}
                <div className="space-y-1.5 sm:space-y-2">
                  <Label className="text-xs sm:text-sm">Бейдж на карточке</Label>
                  <Select value={selectedBadge} onValueChange={setSelectedBadge}>
                    <SelectTrigger className="w-full text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BADGE_OPTIONS.map((b) => (<SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Generate Button */}
                <Button
                  size="lg"
                  className="w-full gap-2 text-sm sm:text-base h-11 sm:h-12"
                  onClick={handleGenerate}
                  disabled={isGenerating || !productInput.productName.trim()}
                >
                  {isGenerating ? (
                    <><Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />Генерация...</>
                  ) : (
                    <><Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />Сгенерировать карточку</>
                  )}
                </Button>

                {/* Model info hint */}
                {usedModel && usedModel !== currentModel && (
                  <p className="text-[10px] text-muted-foreground text-center">
                    Использована резервная модель: {usedModel.split('/').pop()?.replace(':free', '')}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Editable Text Section */}
            {generatedContent && (
              <Card className="mt-3 sm:mt-4 md:mt-6">
                <CardHeader className="pb-2 sm:pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
                  <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                    <Type className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
                    Редактировать текст карточки
                  </CardTitle>
                  <CardDescription className="text-xs">Изменения сразу отображаются на карточке</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 sm:space-y-3 px-4 sm:px-6 pb-4 sm:pb-6">
                  <div className="space-y-1">
                    <Label className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground">Заголовок</Label>
                    <Input value={generatedContent.title} onChange={(e) => updateContentField('title', e.target.value)} className="font-semibold text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground">Подзаголовок</Label>
                    <Input value={generatedContent.subtitle} onChange={(e) => updateContentField('subtitle', e.target.value)} className="text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground">Преимущества</Label>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {generatedContent.features.map((feature, index) => (
                        <Badge key={index} variant="secondary" className="gap-1 px-2 py-1 sm:px-3 sm:py-1.5 text-xs sm:text-sm">
                          <CheckCircle2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-primary" />
                          <input
                            value={feature}
                            onChange={(e) => {
                              const newFeatures = [...generatedContent.features]
                              newFeatures[index] = e.target.value
                              updateContentField('features', newFeatures)
                            }}
                            className="w-auto min-w-[2rem] bg-transparent outline-none text-xs sm:text-sm"
                            style={{ width: `${Math.max(feature.length + 1, 4)}ch` }}
                          />
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>

          {/* RIGHT PANEL — Ready Card Preview */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="space-y-3 sm:space-y-4"
          >
            <Card>
              <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6 pt-4 sm:pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                      <ImageIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                      Готовая карточка
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      900×1200 • для WB, Ozon, Яндекс Маркет
                    </CardDescription>
                  </div>
                  {isGeneratingText && (
                    <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span className="hidden sm:inline">Генерация текста...</span>
                      <span className="sm:hidden">Генерация...</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                {isCardVisible ? (
                  <div className="space-y-3 sm:space-y-4">
                    {/* Внешний обёрточный контейнер — ОГРАНИЧИВАЕТ ширину */}
                    <div
                      ref={previewWrapperRef}
                      className="w-full overflow-hidden rounded-lg border bg-muted/30"
                    >
                      {/* Контейнер с правильными пропорциями 900:1200 */}
                      <div
                        style={{
                          position: 'relative',
                          width: '100%',
                          paddingBottom: `${(1200 / 900) * 100}%`,
                          overflow: 'hidden',
                        }}
                      >
                        {/* Внутренний div с масштабированием */}
                        <div
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '900px',
                            height: '1200px',
                            transform: `scale(${cardScale})`,
                            transformOrigin: 'top left',
                          }}
                        >
                          <div ref={cardRef}>
                            <ProductCard
                              productImage={productImageForCard}
                              title={generatedContent?.title || productInput.productName}
                              subtitle={generatedContent?.subtitle || ''}
                              features={generatedContent?.features || []}
                              style={productInput.style || 'minimalism'}
                              badge={selectedBadge === 'none' ? null : selectedBadge}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 sm:gap-3">
                      <Button
                        className="flex-1 gap-1.5 sm:gap-2 text-xs sm:text-sm h-10 sm:h-11"
                        onClick={handleDownloadCard}
                        disabled={isGenerating || isDownloading || !productImageForCard}
                      >
                        {isDownloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                        Скачать PNG
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 gap-1.5 sm:gap-2 text-xs sm:text-sm h-10 sm:h-11"
                        onClick={handleRegenerate}
                        disabled={isGenerating}
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                        Перегенерировать
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 sm:py-12 md:py-16 rounded-lg border border-dashed bg-muted/20">
                    <ShoppingBag className="mb-3 h-10 w-10 sm:h-14 md:h-16 sm:w-14 md:w-16 text-muted-foreground/30" />
                    <p className="text-sm sm:text-base font-medium text-muted-foreground">
                      Готовая карточка появится здесь
                    </p>
                    <p className="mt-1 text-xs sm:text-sm text-muted-foreground/60">
                      Заполните данные и нажмите «Сгенерировать»
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-2.5 sm:py-3 md:py-4">
        <div className="mx-auto max-w-7xl px-3 text-center text-[10px] sm:text-xs text-muted-foreground sm:px-6 lg:px-8">
          E-Commerce Генератор by Azar
        </div>
      </footer>

    </div>
  )
}
