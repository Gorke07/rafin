'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ISBNLookup } from './ISBNLookup'
import { CoverUpload } from './CoverUpload'
import { useToast } from '@/components/ui/toast'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface BookFormData {
  title: string
  author: string
  isbn?: string
  publisher?: string
  publishedYear?: number
  pageCount?: number
  translator?: string
  description?: string
  language?: string
  bindingType?: 'paperback' | 'hardcover' | 'ebook'
  purchaseDate?: string
  purchasePrice?: number
  currency?: string
  store?: string
  copyNote?: string
  locationId?: number
  coverPath?: string
  coverUrl?: string
  categoryIds?: number[]
  collectionIds?: number[]
}

interface Location {
  id: number
  name: string
  type: string
  parentId?: number | null
}

interface Category {
  id: number
  name: string
  slug: string
}

interface Collection {
  id: number
  name: string
  color?: string | null
}

interface BookFormProps {
  initialData?: Partial<BookFormData> & { id?: number }
  mode?: 'create' | 'edit'
}

const currencies = [
  { value: 'TRY', label: 'TRY (₺)' },
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
]

export function BookForm({ initialData, mode = 'create' }: BookFormProps) {
  const router = useRouter()
  const { addToast } = useToast()
  const t = useTranslations('books')
  const tc = useTranslations('common')

  const bindingTypes = [
    { value: '', label: t('selectBinding') },
    { value: 'paperback', label: t('paperback') },
    { value: 'hardcover', label: t('hardcover') },
    { value: 'ebook', label: t('ebook') },
  ]

  const [formData, setFormData] = useState<BookFormData>({
    title: '',
    author: '',
    isbn: '',
    publisher: '',
    translator: '',
    description: '',
    language: '',
    currency: 'TRY',
    ...initialData,
  })

  const [locations, setLocations] = useState<Location[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [coverRemoved, setCoverRemoved] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    // Fetch locations
    fetch(`${API_URL}/api/locations`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => setLocations(data.locations || []))
      .catch(console.error)

    // Fetch categories
    fetch(`${API_URL}/api/categories`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => setCategories(data.categories || []))
      .catch(console.error)

    // Fetch collections
    fetch(`${API_URL}/api/collections`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => setCollections(data.collections || []))
      .catch(console.error)
  }, [])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'number' ? (value ? Number(value) : undefined) : value,
    }))
    // Clear error when field changes
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const handleISBNFound = (book: BookFormData) => {
    setFormData((prev) => ({
      ...prev,
      ...book,
      // Don't overwrite fields that already have values
      title: prev.title || book.title,
      author: prev.author || book.author,
    }))
    addToast(t('bookInfoFilled'), 'success')
  }

  const handleCoverChange = (data: { coverPath?: string; coverUrl?: string }) => {
    const isRemoval = 'coverPath' in data && !data.coverPath && 'coverUrl' in data && !data.coverUrl
    setCoverRemoved(isRemoval)
    setFormData((prev) => ({
      ...prev,
      coverPath: 'coverPath' in data ? data.coverPath : prev.coverPath,
      coverUrl: 'coverUrl' in data ? data.coverUrl : prev.coverUrl,
    }))
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.title?.trim()) {
      newErrors.title = t('titleRequired')
    }
    if (!formData.author?.trim()) {
      newErrors.author = t('authorRequired')
    }
    if (formData.publishedYear && (formData.publishedYear < 1000 || formData.publishedYear > 2100)) {
      newErrors.publishedYear = t('invalidYear')
    }
    if (formData.pageCount && formData.pageCount < 1) {
      newErrors.pageCount = t('invalidPageCount')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      addToast(t('checkForm'), 'error')
      return
    }

    setIsLoading(true)

    try {
      const url = mode === 'edit' && initialData?.id
        ? `${API_URL}/api/books/${initialData.id}`
        : `${API_URL}/api/books`

      const method = mode === 'edit' ? 'PATCH' : 'POST'

      // Clean form data: strip empty strings, convert types
      const cleanData: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(formData)) {
        if (value === undefined || value === null || value === '') continue
        cleanData[key] = value
      }
      // Ensure number fields are numbers
      if (cleanData.publishedYear) cleanData.publishedYear = Number(cleanData.publishedYear)
      if (cleanData.pageCount) cleanData.pageCount = Number(cleanData.pageCount)
      if (cleanData.locationId) cleanData.locationId = Number(cleanData.locationId)
      if (cleanData.purchasePrice) cleanData.purchasePrice = String(cleanData.purchasePrice)
      // Signal cover removal to API
      if (coverRemoved) {
        delete cleanData.coverPath
        delete cleanData.coverUrl
        cleanData.removeCover = true
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(cleanData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        addToast(errorData.error || tc('error'), 'error')
        return
      }

      addToast(
        mode === 'edit' ? t('bookUpdated') : t('bookAdded'),
        'success'
      )
      router.push('/dashboard/books')
    } catch {
      addToast(tc('error'), 'error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <ISBNLookup
        onBookFound={handleISBNFound}
        onError={(msg) => addToast(msg, 'warning')}
      />

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="w-full grid grid-cols-4">
          <TabsTrigger value="basic">{t('basicInfo')}</TabsTrigger>
          <TabsTrigger value="details">{t('details')}</TabsTrigger>
          <TabsTrigger value="purchase">{t('purchase')}</TabsTrigger>
          <TabsTrigger value="organization">{t('editing')}</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4 pt-4">
          <div className="grid gap-6 md:grid-cols-[200px_1fr]">
            <div>
              <Label>{t('cover')}</Label>
              <div className="mt-2">
                <CoverUpload
                  coverPath={formData.coverPath}
                  coverUrl={formData.coverUrl}
                  onCoverChange={handleCoverChange}
                  onError={(msg) => addToast(msg, 'error')}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="title" required>{t('titleColumn')}</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  error={errors.title}
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-destructive">{errors.title}</p>
                )}
              </div>

              <div>
                <Label htmlFor="author" required>{t('author')}</Label>
                <Input
                  id="author"
                  name="author"
                  value={formData.author}
                  onChange={handleChange}
                  error={errors.author}
                />
                {errors.author && (
                  <p className="mt-1 text-sm text-destructive">{errors.author}</p>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="isbn">{t('isbn')}</Label>
                  <Input
                    id="isbn"
                    name="isbn"
                    value={formData.isbn || ''}
                    onChange={handleChange}
                    placeholder="978-975-..."
                  />
                </div>

                <div>
                  <Label htmlFor="publisher">{t('publisher')}</Label>
                  <Input
                    id="publisher"
                    name="publisher"
                    value={formData.publisher || ''}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label htmlFor="publishedYear">{t('publishedYear')}</Label>
                  <Input
                    id="publishedYear"
                    name="publishedYear"
                    type="number"
                    min="1000"
                    max="2100"
                    value={formData.publishedYear || ''}
                    onChange={handleChange}
                    error={errors.publishedYear}
                  />
                </div>

                <div>
                  <Label htmlFor="pageCount">{t('pageCount')}</Label>
                  <Input
                    id="pageCount"
                    name="pageCount"
                    type="number"
                    min="1"
                    value={formData.pageCount || ''}
                    onChange={handleChange}
                    error={errors.pageCount}
                  />
                </div>

                <div>
                  <Label htmlFor="translator">{t('translator')}</Label>
                  <Input
                    id="translator"
                    name="translator"
                    value={formData.translator || ''}
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="details" className="space-y-4 pt-4">
          <div>
            <Label htmlFor="description">{t('description')}</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description || ''}
              onChange={handleChange}
              rows={4}
              placeholder={t('descriptionPlaceholder')}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="language">{t('language')}</Label>
              <Input
                id="language"
                name="language"
                value={formData.language || ''}
                onChange={handleChange}
              />
            </div>

            <div>
              <Label htmlFor="bindingType">{t('bindingType')}</Label>
              <Select
                id="bindingType"
                name="bindingType"
                value={formData.bindingType || ''}
                onChange={handleChange}
              >
                {bindingTypes.map((bt) => (
                  <option key={bt.value} value={bt.value}>
                    {bt.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="copyNote">{t('copyNote')}</Label>
            <Textarea
              id="copyNote"
              name="copyNote"
              value={formData.copyNote || ''}
              onChange={handleChange}
              rows={2}
              placeholder={t('copyNotePlaceholder')}
            />
          </div>
        </TabsContent>

        <TabsContent value="purchase" className="space-y-4 pt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="store">{t('store')}</Label>
              <Input
                id="store"
                name="store"
                value={formData.store || ''}
                onChange={handleChange}
                placeholder={t('storePlaceholder')}
              />
            </div>

            <div>
              <Label htmlFor="purchaseDate">{t('date')}</Label>
              <Input
                id="purchaseDate"
                name="purchaseDate"
                type="date"
                value={formData.purchaseDate || ''}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="purchasePrice">{t('price')}</Label>
              <Input
                id="purchasePrice"
                name="purchasePrice"
                type="number"
                min="0"
                step="0.01"
                value={formData.purchasePrice || ''}
                onChange={handleChange}
              />
            </div>

            <div>
              <Label htmlFor="currency">{t('currency')}</Label>
              <Select
                id="currency"
                name="currency"
                value={formData.currency || 'TRY'}
                onChange={handleChange}
              >
                {currencies.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="organization" className="space-y-4 pt-4">
          <div>
            <Label htmlFor="locationId">{t('location')}</Label>
            <Select
              id="locationId"
              name="locationId"
              value={formData.locationId || ''}
              onChange={handleChange}
            >
              <option value="">{t('selectBinding')}</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name} ({loc.type})
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label>{t('categories')}</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {categories.map((cat) => (
                <label
                  key={cat.id}
                  className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                    formData.categoryIds?.includes(cat.id)
                      ? 'border-primary bg-primary/10'
                      : 'border-input hover:bg-accent'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={formData.categoryIds?.includes(cat.id) || false}
                    onChange={(e) => {
                      const newIds = e.target.checked
                        ? [...(formData.categoryIds || []), cat.id]
                        : (formData.categoryIds || []).filter((id) => id !== cat.id)
                      setFormData((prev) => ({ ...prev, categoryIds: newIds }))
                    }}
                  />
                  {cat.name}
                </label>
              ))}
              {categories.length === 0 && (
                <p className="text-sm text-muted-foreground">{t('noCategories')}</p>
              )}
            </div>
          </div>

          <div>
            <Label>{t('collections')}</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {collections.map((col) => (
                <label
                  key={col.id}
                  className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                    formData.collectionIds?.includes(col.id)
                      ? 'border-primary bg-primary/10'
                      : 'border-input hover:bg-accent'
                  }`}
                  style={{
                    borderColor: formData.collectionIds?.includes(col.id) && col.color
                      ? col.color
                      : undefined,
                  }}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={formData.collectionIds?.includes(col.id) || false}
                    onChange={(e) => {
                      const newIds = e.target.checked
                        ? [...(formData.collectionIds || []), col.id]
                        : (formData.collectionIds || []).filter((id) => id !== col.id)
                      setFormData((prev) => ({ ...prev, collectionIds: newIds }))
                    }}
                  />
                  {col.color && (
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: col.color }}
                    />
                  )}
                  {col.name}
                </label>
              ))}
              {collections.length === 0 && (
                <p className="text-sm text-muted-foreground">{t('noCollections')}</p>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex gap-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          {tc('cancel')}
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === 'edit' ? t('update') : t('addBook')}
        </Button>
      </div>
    </form>
  )
}
