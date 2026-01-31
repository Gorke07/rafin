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
import { Loader2, Plus, Search, User, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface Author {
  id: number
  name: string
  bio?: string | null
  photoUrl?: string | null
  bookCount: number
}

export default function AuthorsPage() {
  const t = useTranslations('authors')
  const tc = useTranslations('common')
  const { addToast } = useToast()

  const [authors, setAuthors] = useState<Author[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const fetchAuthors = useCallback(async (q?: string) => {
    try {
      const url = q ? `${API_URL}/api/authors?q=${encodeURIComponent(q)}` : `${API_URL}/api/authors`
      const response = await fetch(url, { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setAuthors(data.authors || [])
      }
    } catch {
      console.error('Failed to fetch authors')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAuthors()
  }, [fetchAuthors])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchAuthors(searchQuery)
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    setIsCreating(true)
    try {
      const response = await fetch(`${API_URL}/api/authors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newName.trim() }),
      })
      if (response.ok) {
        addToast(t('authorCreated'), 'success')
        setNewName('')
        setShowForm(false)
        fetchAuthors()
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
          !isLoading && authors.length > 0 ? t('authorCount', { count: authors.length }) : undefined
        }
      >
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? tc('cancel') : t('addAuthor')}
        </Button>
      </PageHeader>

      {/* Inline create form */}
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

      {/* Search */}
      <form onSubmit={handleSearch} className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder={t('searchAuthors')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </form>

      {/* Content */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="flex items-start gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : authors.length === 0 ? (
        <EmptyState icon={User} title={t('noAuthors')} description={t('noAuthorsHint')} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {authors.map((author) => (
            <Link key={author.id} href={`/dashboard/authors/${author.id}`}>
              <Card className="group h-full transition-colors hover:bg-accent/50">
                <CardContent className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold leading-tight group-hover:text-primary">
                      {author.name}
                    </h3>
                    <div className="mt-1.5">
                      <Badge variant="secondary">
                        {t('bookCount', { count: author.bookCount })}
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
