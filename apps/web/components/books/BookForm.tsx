'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { EntityCombobox } from '@/components/ui/entity-combobox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { plainTextToHtml } from '@/lib/html-utils'
import { cn } from '@/lib/utils'
import { Check, Loader2, Plus, Search, Tag, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { CoverUpload } from './CoverUpload'
import type { BookLookupResult } from './ISBNLookup'
import { ISBNLookup } from './ISBNLookup'

interface Entity {
  id: number
  name: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface BookFormData {
  title: string
  originalTitle?: string
  authorIds?: number[]
  publisherIds?: number[]
  isbn?: string
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
  children?: Location[]
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

function buildLocationChain(locationId: number, flat: Location[]) {
  const chain: { room?: number; furniture?: number; shelf?: number } = {}
  let current = flat.find((l) => l.id === locationId)
  while (current) {
    if (current.type === 'room' || current.type === 'furniture' || current.type === 'shelf') {
      chain[current.type] = current.id
    }
    current = current.parentId ? flat.find((l) => l.id === current!.parentId) : undefined
  }
  return chain
}

export function BookForm({ initialData, mode = 'create' }: BookFormProps) {
  const router = useRouter()
  const { addToast } = useToast()
  const t = useTranslations('books')
  const tc = useTranslations('common')
  const tAuth = useTranslations('authors')
  const tPub = useTranslations('publishers')
  const tLoc = useTranslations('locations')

  const bindingTypes = [
    { value: 'paperback', label: t('paperback') },
    { value: 'hardcover', label: t('hardcover') },
    { value: 'ebook', label: t('ebook') },
  ]

  const [formData, setFormData] = useState<BookFormData>({
    title: '',
    originalTitle: '',
    isbn: '',
    translator: '',
    description: '',
    language: '',
    currency: 'TRY',
    ...initialData,
  })

  const [selectedAuthors, setSelectedAuthors] = useState<Entity[]>([])
  const [selectedPublishers, setSelectedPublishers] = useState<Entity[]>([])

  const [locationTree, setLocationTree] = useState<Location[]>([])
  const [allLocations, setAllLocations] = useState<Location[]>([])
  const [selectedRoom, setSelectedRoom] = useState<string>('')
  const [selectedFurniture, setSelectedFurniture] = useState<string>('')
  const [selectedShelf, setSelectedShelf] = useState<string>('')
  const [categories, setCategories] = useState<Category[]>([])
  const [collections, setCollections] = useState<Collection[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [coverRemoved, setCoverRemoved] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // If editing, fetch book's current authors and publishers
  useEffect(() => {
    if (mode === 'edit' && initialData?.id) {
      fetch(`${API_URL}/api/books/${initialData.id}`, { credentials: 'include' })
        .then((res) => res.json())
        .then((data) => {
          if (data.book?.authors) {
            const auths = data.book.authors.map((a: Entity) => ({ id: a.id, name: a.name }))
            setSelectedAuthors(auths)
            setFormData((prev) => ({ ...prev, authorIds: auths.map((a: Entity) => a.id) }))
          }
          if (data.book?.publishers) {
            const pubs = data.book.publishers.map((p: Entity) => ({ id: p.id, name: p.name }))
            setSelectedPublishers(pubs)
            setFormData((prev) => ({ ...prev, publisherIds: pubs.map((p: Entity) => p.id) }))
          }
        })
        .catch(console.error)
    }
  }, [mode, initialData?.id])

  useEffect(() => {
    // Fetch locations (tree + flat)
    fetch(`${API_URL}/api/locations`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        setLocationTree(data.locations || [])
        setAllLocations(data.flat || [])
      })
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

  // Populate cascading selects when editing a book with an existing locationId
  useEffect(() => {
    if (formData.locationId && allLocations.length > 0) {
      const chain = buildLocationChain(formData.locationId, allLocations)
      if (chain.room) setSelectedRoom(String(chain.room))
      if (chain.furniture) setSelectedFurniture(String(chain.furniture))
      if (chain.shelf) setSelectedShelf(String(chain.shelf))
    }
  }, [formData.locationId, allLocations])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'locationId' ? (value ? Number(value) : undefined) : value,
    }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  // Cascading location lists
  const rooms = locationTree
  const furnitureList = selectedRoom
    ? rooms.find((r) => r.id === Number(selectedRoom))?.children || []
    : []
  const shelves = selectedFurniture
    ? furnitureList.find((f) => f.id === Number(selectedFurniture))?.children || []
    : []

  const handleRoomChange = (value: string) => {
    setSelectedRoom(value)
    setSelectedFurniture('')
    setSelectedShelf('')
    setFormData((prev) => ({ ...prev, locationId: value ? Number(value) : undefined }))
  }

  const handleFurnitureChange = (value: string) => {
    setSelectedFurniture(value)
    setSelectedShelf('')
    setFormData((prev) => ({ ...prev, locationId: value ? Number(value) : undefined }))
  }

  const handleShelfChange = (value: string) => {
    setSelectedShelf(value)
    setFormData((prev) => ({ ...prev, locationId: value ? Number(value) : undefined }))
  }

  const handleISBNFound = async (book: BookLookupResult) => {
    // Auto-create/find author
    if (book.author) {
      const names = book.author
        .split(/[,&]/)
        .map((n) => n.trim())
        .filter(Boolean)
      const newAuthors: Entity[] = []
      for (const name of names) {
        try {
          const res = await fetch(`${API_URL}/api/authors`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ name }),
          })
          if (res.ok) {
            const data = await res.json()
            newAuthors.push(data.author)
          }
        } catch {
          /* skip */
        }
      }
      if (newAuthors.length > 0) {
        setSelectedAuthors(newAuthors)
        setFormData((prev) => ({ ...prev, authorIds: newAuthors.map((a) => a.id) }))
      }
    }

    // Auto-create/find publisher
    if (book.publisher) {
      try {
        const res = await fetch(`${API_URL}/api/publishers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ name: book.publisher }),
        })
        if (res.ok) {
          const data = await res.json()
          setSelectedPublishers([data.publisher])
          setFormData((prev) => ({ ...prev, publisherIds: [data.publisher.id] }))
        }
      } catch {
        /* skip */
      }
    }

    // Set remaining fields (exclude author/publisher text)
    const { author, publisher, ...rest } = book
    setFormData((prev) => ({
      ...prev,
      ...rest,
      title: prev.title || rest.title || '',
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
    if (selectedAuthors.length === 0) {
      newErrors.author = t('authorRequired')
    }
    if (
      formData.publishedYear &&
      (formData.publishedYear < 1000 || formData.publishedYear > 2100)
    ) {
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
      const url =
        mode === 'edit' && initialData?.id
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
        cleanData.coverPath = undefined
        cleanData.coverUrl = undefined
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

      addToast(mode === 'edit' ? t('bookUpdated') : t('bookAdded'), 'success')
      router.push('/dashboard/books')
    } catch {
      addToast(tc('error'), 'error')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <ISBNLookup onBookFound={handleISBNFound} onError={(msg) => addToast(msg, 'warning')} />

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
                <Label htmlFor="title" required>
                  {t('titleColumn')}
                </Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  error={errors.title}
                />
                {errors.title && <p className="mt-1 text-sm text-destructive">{errors.title}</p>}
              </div>

              <div>
                <Label required>{t('author')}</Label>
                <EntityCombobox
                  selected={selectedAuthors}
                  onSelectionChange={(entities) => {
                    setSelectedAuthors(entities)
                    setFormData((prev) => ({ ...prev, authorIds: entities.map((e) => e.id) }))
                    if (errors.author) setErrors((prev) => ({ ...prev, author: '' }))
                  }}
                  searchEndpoint="/api/authors"
                  createEndpoint="/api/authors"
                  entityKey="author"
                  placeholder={tAuth('selectAuthors')}
                  createNewLabel={(name) => tAuth('createNew', { name })}
                  noResultsLabel={tAuth('noResults')}
                  orderable
                />
                {errors.author && <p className="mt-1 text-sm text-destructive">{errors.author}</p>}
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
                  <Label>{t('publisher')}</Label>
                  <EntityCombobox
                    selected={selectedPublishers}
                    onSelectionChange={(entities) => {
                      setSelectedPublishers(entities)
                      setFormData((prev) => ({ ...prev, publisherIds: entities.map((e) => e.id) }))
                    }}
                    searchEndpoint="/api/publishers"
                    createEndpoint="/api/publishers"
                    entityKey="publisher"
                    placeholder={tPub('selectPublishers')}
                    createNewLabel={(name) => tPub('createNew', { name })}
                    noResultsLabel={tPub('noResults')}
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

              <div>
                <Label htmlFor="originalTitle">{t('originalTitle')}</Label>
                <Input
                  id="originalTitle"
                  name="originalTitle"
                  value={formData.originalTitle || ''}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="details" className="space-y-4 pt-4">
          <div>
            <Label htmlFor="description">{t('description')}</Label>
            <RichTextEditor
              content={plainTextToHtml(formData.description)}
              onChange={(html) => setFormData((prev) => ({ ...prev, description: html }))}
              placeholder={t('descriptionPlaceholder')}
              labels={{
                bold: t('richText.bold'),
                italic: t('richText.italic'),
                underline: t('richText.underline'),
                heading2: t('richText.heading2'),
                heading3: t('richText.heading3'),
                bulletList: t('richText.bulletList'),
                orderedList: t('richText.orderedList'),
                blockquote: t('richText.blockquote'),
                link: t('richText.link'),
                clearFormatting: t('richText.clearFormatting'),
                linkPrompt: t('richText.linkPrompt'),
              }}
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
              <Label>{t('bindingType')}</Label>
              <Select
                value={formData.bindingType || ''}
                onValueChange={(v) => handleSelectChange('bindingType', v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('selectBinding')} />
                </SelectTrigger>
                <SelectContent>
                  {bindingTypes.map((bt) => (
                    <SelectItem key={bt.value} value={bt.value}>
                      {bt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
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
              <Label>{t('currency')}</Label>
              <Select
                value={formData.currency || 'TRY'}
                onValueChange={(v) => handleSelectChange('currency', v)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="organization" className="space-y-4 pt-4">
          <div>
            <Label>{t('location')}</Label>
            {rooms.length > 0 ? (
              <div className="mt-2 grid gap-4 md:grid-cols-3">
                <div>
                  <Label>{tLoc('room')}</Label>
                  <Select value={selectedRoom} onValueChange={handleRoomChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t('selectRoom')} />
                    </SelectTrigger>
                    <SelectContent>
                      {rooms.map((room) => (
                        <SelectItem key={room.id} value={String(room.id)}>
                          {room.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {furnitureList.length > 0 && (
                  <div>
                    <Label>{tLoc('furniture')}</Label>
                    <Select value={selectedFurniture} onValueChange={handleFurnitureChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('selectFurniture')} />
                      </SelectTrigger>
                      <SelectContent>
                        {furnitureList.map((f) => (
                          <SelectItem key={f.id} value={String(f.id)}>
                            {f.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {shelves.length > 0 && (
                  <div>
                    <Label>{tLoc('shelf')}</Label>
                    <Select value={selectedShelf} onValueChange={handleShelfChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('selectShelf')} />
                      </SelectTrigger>
                      <SelectContent>
                        {shelves.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-sm text-muted-foreground">{tLoc('noLocations')}</p>
                <Link href="/dashboard/locations">
                  <Button type="button" variant="outline" size="sm" className="h-7 w-7 p-0">
                    <Plus className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            )}
          </div>

          <CategoryPicker
            categories={categories}
            selectedIds={formData.categoryIds || []}
            onChange={(ids) => setFormData((prev) => ({ ...prev, categoryIds: ids }))}
            onCategoryCreated={(cat) => setCategories((prev) => [...prev, cat])}
          />

          <CollectionPicker
            collections={collections}
            selectedIds={formData.collectionIds || []}
            onChange={(ids) => setFormData((prev) => ({ ...prev, collectionIds: ids }))}
            onCollectionCreated={(col) => setCollections((prev) => [...prev, col])}
          />
        </TabsContent>
      </Tabs>

      <div className="flex gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={() => router.back()}>
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

/* ─── Category Picker ──────────────────────────────────────────── */

const PRESET_COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#6b7280',
]

function CategoryPicker({
  categories,
  selectedIds,
  onChange,
  onCategoryCreated,
}: {
  categories: Category[]
  selectedIds: number[]
  onChange: (ids: number[]) => void
  onCategoryCreated: (cat: Category) => void
}) {
  const t = useTranslations('books')
  const tc = useTranslations('common')
  const { addToast } = useToast()
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = search
    ? categories.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : categories

  const selectedCats = categories.filter((c) => selectedIds.includes(c.id))

  const toggle = (id: number) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter((i) => i !== id) : [...selectedIds, id])
  }

  const remove = (id: number) => {
    onChange(selectedIds.filter((i) => i !== id))
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    setIsCreating(true)
    try {
      const res = await fetch(`${API_URL}/api/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newName.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        const cat = data.category
        onCategoryCreated(cat)
        onChange([...selectedIds, cat.id])
        setNewName('')
        setShowCreate(false)
      }
    } catch {
      addToast('Error', 'error')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{t('categories')}</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-xs text-muted-foreground"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="h-3 w-3" />
          {t('quickAddCategory')}
        </Button>
      </div>

      {/* Selected badges */}
      {selectedCats.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedCats.map((cat) => (
            <Badge key={cat.id} variant="secondary" className="gap-1 py-1 pl-2.5 pr-1 text-xs">
              <Tag className="h-3 w-3 opacity-50" />
              {cat.name}
              <button
                type="button"
                onClick={() => remove(cat.id)}
                className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-foreground/10"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Search + List */}
      <div className="rounded-lg border bg-card">
        {categories.length > 5 && (
          <div className="border-b px-3 py-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('searchCategories')}
                className="w-full bg-transparent py-1 pl-7 pr-2 text-sm outline-none placeholder:text-muted-foreground/60"
              />
            </div>
          </div>
        )}
        <div className="max-h-40 overflow-y-auto p-1">
          {filtered.length > 0 ? (
            filtered.map((cat) => {
              const isSelected = selectedIds.includes(cat.id)
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggle(cat.id)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors',
                    isSelected
                      ? 'bg-primary/10 text-foreground'
                      : 'text-foreground/80 hover:bg-muted',
                  )}
                >
                  <div
                    className={cn(
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-input',
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </div>
                  {cat.name}
                </button>
              )
            })
          ) : categories.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">
              {t('noCategories')}
            </p>
          ) : (
            <p className="px-3 py-3 text-center text-xs text-muted-foreground">
              {t('noBooksFiltered')}
            </p>
          )}
        </div>
      </div>

      {/* Quick-create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('quickAddCategory')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="new-cat-name">{t('categoryNameLabel')}</Label>
              <Input
                id="new-cat-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Fiction, Science, History..."
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleCreate()
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
              {tc('cancel')}
            </Button>
            <Button type="button" onClick={handleCreate} disabled={isCreating || !newName.trim()}>
              {isCreating && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {isCreating ? t('creating') : tc('create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/* ─── Collection Picker ────────────────────────────────────────── */

function CollectionPicker({
  collections,
  selectedIds,
  onChange,
  onCollectionCreated,
}: {
  collections: Collection[]
  selectedIds: number[]
  onChange: (ids: number[]) => void
  onCollectionCreated: (col: Collection) => void
}) {
  const t = useTranslations('books')
  const tc = useTranslations('common')
  const { addToast } = useToast()
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState('#3b82f6')
  const [isCreating, setIsCreating] = useState(false)

  const filtered = search
    ? collections.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : collections

  const selectedCols = collections.filter((c) => selectedIds.includes(c.id))

  const toggle = (id: number) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter((i) => i !== id) : [...selectedIds, id])
  }

  const remove = (id: number) => {
    onChange(selectedIds.filter((i) => i !== id))
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    setIsCreating(true)
    try {
      const res = await fetch(`${API_URL}/api/collections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newName.trim(), color: newColor }),
      })
      if (res.ok) {
        const data = await res.json()
        const col = data.collection
        onCollectionCreated(col)
        onChange([...selectedIds, col.id])
        setNewName('')
        setNewColor('#3b82f6')
        setShowCreate(false)
      }
    } catch {
      addToast('Error', 'error')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{t('collections')}</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-xs text-muted-foreground"
          onClick={() => setShowCreate(true)}
        >
          <Plus className="h-3 w-3" />
          {t('quickAddCollection')}
        </Button>
      </div>

      {/* Selected badges */}
      {selectedCols.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedCols.map((col) => (
            <Badge
              key={col.id}
              variant="outline"
              className="gap-1.5 py-1 pl-2 pr-1 text-xs"
              style={{
                borderColor: col.color || undefined,
                backgroundColor: col.color ? `${col.color}10` : undefined,
              }}
            >
              {col.color && (
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: col.color }} />
              )}
              {col.name}
              <button
                type="button"
                onClick={() => remove(col.id)}
                className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-foreground/10"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Search + List */}
      <div className="rounded-lg border bg-card">
        {collections.length > 5 && (
          <div className="border-b px-3 py-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('searchCollections')}
                className="w-full bg-transparent py-1 pl-7 pr-2 text-sm outline-none placeholder:text-muted-foreground/60"
              />
            </div>
          </div>
        )}
        <div className="max-h-40 overflow-y-auto p-1">
          {filtered.length > 0 ? (
            filtered.map((col) => {
              const isSelected = selectedIds.includes(col.id)
              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => toggle(col.id)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors',
                    isSelected
                      ? 'bg-primary/10 text-foreground'
                      : 'text-foreground/80 hover:bg-muted',
                  )}
                >
                  <div
                    className={cn(
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                      isSelected
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-input',
                    )}
                    style={
                      isSelected && col.color
                        ? { borderColor: col.color, backgroundColor: col.color }
                        : undefined
                    }
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </div>
                  <div className="flex items-center gap-2">
                    {col.color && (
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: col.color }}
                      />
                    )}
                    {col.name}
                  </div>
                </button>
              )
            })
          ) : collections.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">
              {t('noCollections')}
            </p>
          ) : (
            <p className="px-3 py-3 text-center text-xs text-muted-foreground">
              {t('noBooksFiltered')}
            </p>
          )}
        </div>
      </div>

      {/* Quick-create dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('quickAddCollection')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="new-col-name">{t('collectionNameLabel')}</Label>
              <Input
                id="new-col-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Favorites, To Read, Classics..."
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleCreate()
                  }
                }}
              />
            </div>
            <div>
              <Label>{t('colorLabel')}</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewColor(color)}
                    className={cn(
                      'h-7 w-7 rounded-full transition-all',
                      newColor !== color && 'hover:scale-110',
                    )}
                    style={{
                      backgroundColor: color,
                      ...(newColor === color
                        ? { boxShadow: `0 0 0 2px var(--background), 0 0 0 4px ${color}` }
                        : {}),
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
              {tc('cancel')}
            </Button>
            <Button type="button" onClick={handleCreate} disabled={isCreating || !newName.trim()}>
              {isCreating && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {isCreating ? t('creating') : tc('create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
