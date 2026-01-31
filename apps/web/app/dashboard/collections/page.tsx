'use client'

import {
  EMPTY_SMART_FILTERS,
  SmartCollectionRuleBuilder,
  type SmartFilters,
} from '@/components/collections/SmartCollectionRuleBuilder'
import { EmptyState } from '@/components/dashboard/empty-state'
import { PageHeader } from '@/components/dashboard/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { Library, Loader2, MoreVertical, Plus, Sparkles } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface Collection {
  id: number
  name: string
  description: string | null
  color: string | null
  icon: string | null
  isSmart: boolean
  bookCount: number
  createdAt: string
}

function CollectionsContent() {
  const t = useTranslations('collections')
  const tc = useTranslations('common')
  const { addToast } = useToast()

  const [collections, setCollections] = useState<Collection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newColor, setNewColor] = useState('#3b82f6')
  const [isCreating, setIsCreating] = useState(false)
  const [isSmart, setIsSmart] = useState(false)
  const [smartFilters, setSmartFilters] = useState<SmartFilters>(EMPTY_SMART_FILTERS)
  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchCollections = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/collections`, {
        credentials: 'include',
      })
      const data = await response.json()
      setCollections(data.collections || [])
    } catch (err) {
      console.error('Failed to fetch collections:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCollections()
  }, [fetchCollections])

  const fetchPreview = useCallback(async (filters: SmartFilters) => {
    const validRules = filters.rules.filter((r) => r.value !== '')
    if (validRules.length === 0) {
      setPreviewCount(null)
      return
    }

    setIsLoadingPreview(true)
    try {
      const response = await fetch(`${API_URL}/api/collections/preview-smart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          smartFilters: { ...filters, rules: validRules },
        }),
      })
      const data = await response.json()
      setPreviewCount(data.count ?? null)
    } catch {
      setPreviewCount(null)
    } finally {
      setIsLoadingPreview(false)
    }
  }, [])

  const handleSmartFiltersChange = useCallback(
    (filters: SmartFilters) => {
      setSmartFilters(filters)
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current)
      previewTimerRef.current = setTimeout(() => fetchPreview(filters), 500)
    },
    [fetchPreview],
  )

  const resetForm = () => {
    setNewName('')
    setNewDescription('')
    setNewColor('#3b82f6')
    setIsSmart(false)
    setSmartFilters(EMPTY_SMART_FILTERS)
    setPreviewCount(null)
    setShowForm(false)
  }

  const handleCreate = async () => {
    if (!newName.trim()) return

    const validRules = smartFilters.rules.filter((r) => r.value !== '')
    if (isSmart && validRules.length === 0) return

    setIsCreating(true)
    try {
      const response = await fetch(`${API_URL}/api/collections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: newName,
          description: newDescription || undefined,
          color: newColor,
          isSmart,
          smartFilters: isSmart ? { ...smartFilters, rules: validRules } : undefined,
        }),
      })

      if (response.ok) {
        addToast(t('created'), 'success')
        resetForm()
        fetchCollections()
      }
    } catch {
      addToast(t('createFailed'), 'error')
    } finally {
      setIsCreating(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await fetch(`${API_URL}/api/collections/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      addToast(t('deleted'), 'success')
      setCollections((prev) => prev.filter((c) => c.id !== id))
    } catch {
      addToast(t('deleteFailed'), 'error')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')}>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" />
          {t('addCollection')}
        </Button>
      </PageHeader>

      {showForm && (
        <Card>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">{t('newCollection')}</h2>
              <Button
                type="button"
                variant={isSmart ? 'default' : 'outline'}
                size="sm"
                onClick={() => setIsSmart(!isSmart)}
              >
                <Sparkles className="mr-1 h-4 w-4" />
                {t('smartCollection')}
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="col-name">{t('collectionName')}</Label>
                <Input
                  id="col-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={t('namePlaceholder')}
                />
              </div>
              <div>
                <Label htmlFor="col-color">{t('color')}</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    id="col-color"
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    className="h-10 w-14 cursor-pointer rounded-md border border-input bg-background"
                  />
                  <Input
                    value={newColor}
                    onChange={(e) => setNewColor(e.target.value)}
                    className="flex-1"
                    placeholder="#3b82f6"
                  />
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="col-desc">{t('descriptionOptional')}</Label>
              <Input
                id="col-desc"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder={t('descriptionPlaceholder')}
              />
            </div>

            {isSmart && (
              <SmartCollectionRuleBuilder
                value={smartFilters}
                onChange={handleSmartFiltersChange}
                previewCount={previewCount}
                isLoadingPreview={isLoadingPreview}
              />
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                onClick={handleCreate}
                disabled={
                  isCreating ||
                  !newName.trim() ||
                  (isSmart && smartFilters.rules.every((r) => r.value === ''))
                }
              >
                {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
                {tc('create')}
              </Button>
              <Button type="button" variant="ghost" onClick={resetForm}>
                {tc('cancel')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="flex items-start gap-3">
                <Skeleton className="mt-1 h-8 w-8 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : collections.length === 0 ? (
        <EmptyState
          icon={Library}
          title={t('noCollections')}
          description={t('noCollectionsHint')}
          action={
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4" />
              {t('addCollection')}
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {collections.map((col) => (
            <Card key={col.id} className="group relative transition-colors hover:bg-accent/50">
              <CardContent>
                <Link href={`/dashboard/collections/${col.id}`} className="block">
                  <div className="flex items-start gap-3">
                    <div
                      className="mt-1 h-8 w-8 shrink-0 rounded-lg"
                      style={{ backgroundColor: col.color || '#6b7280' }}
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold">
                        {col.name}
                        {col.isSmart && (
                          <Badge variant="secondary" className="ml-2 align-middle">
                            <Sparkles className="mr-1 h-3 w-3" />
                            {t('smartCollection')}
                          </Badge>
                        )}
                      </h3>
                      {col.description && (
                        <p className="mt-0.5 truncate text-sm text-muted-foreground">
                          {col.description}
                        </p>
                      )}
                      <p className="mt-2 text-sm text-muted-foreground">
                        {t('booksCount', { count: col.bookCount })}
                      </p>
                    </div>
                  </div>
                </Link>

                <div className="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/collections/${col.id}`}>{tc('edit')}</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDelete(col.id)}
                      >
                        {tc('delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default function CollectionsPage() {
  return <CollectionsContent />
}
