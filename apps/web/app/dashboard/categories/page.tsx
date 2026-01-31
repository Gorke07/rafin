'use client'

import { EmptyState } from '@/components/dashboard/empty-state'
import { PageHeader } from '@/components/dashboard/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Plus, Search, Tag, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface Category {
  id: number
  name: string
  slug: string
  bookCount: number
}

export default function CategoriesPage() {
  const t = useTranslations('categories')
  const tc = useTranslations('common')
  const { addToast } = useToast()

  const [categories, setCategories] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/categories`, { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories || [])
      }
    } catch {
      console.error('Failed to fetch categories')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const filtered = searchQuery
    ? categories.filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : categories

  const handleCreate = async () => {
    if (!newName.trim()) return
    setIsCreating(true)
    try {
      const response = await fetch(`${API_URL}/api/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newName.trim() }),
      })
      if (response.ok) {
        addToast(t('categoryCreated'), 'success')
        setNewName('')
        setShowForm(false)
        fetchCategories()
      }
    } catch {
      addToast(tc('error'), 'error')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        description={
          !isLoading && categories.length > 0
            ? t('categoryCount', { count: categories.length })
            : undefined
        }
      >
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? tc('cancel') : t('addCategory')}
        </Button>
      </PageHeader>

      {showForm && (
        <Card>
          <CardContent className="flex gap-3">
            <div className="flex-1">
              <Label>{t('name')}</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t('name')}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleCreate} disabled={isCreating || !newName.trim()}>
                {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
                {tc('create')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder={t('searchCategories')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="flex items-start gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Tag} title={t('noCategories')} description={t('organizeBooks')} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((category) => (
            <Link key={category.id} href={`/dashboard/categories/${category.id}`}>
              <Card className="group h-full transition-colors hover:bg-accent/50">
                <CardContent className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Tag className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold leading-tight group-hover:text-primary">
                      {category.name}
                    </h3>
                    <div className="mt-1.5">
                      <Badge variant="secondary">
                        {t('bookCount', { count: category.bookCount })}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
