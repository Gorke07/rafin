'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { BookOpen, Loader2, Plus, Search, User, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useEffect, useState } from 'react'

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

  const fetchAuthors = async (q?: string) => {
    try {
      const url = q
        ? `${API_URL}/api/authors?q=${encodeURIComponent(q)}`
        : `${API_URL}/api/authors`
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
  }

  useEffect(() => {
    fetchAuthors()
  }, [])

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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          {!isLoading && authors.length > 0 && (
            <p className="mt-1 text-sm text-muted-foreground">
              {t('authorCount', { count: authors.length })}
            </p>
          )}
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
          {showForm ? tc('cancel') : t('addAuthor')}
        </Button>
      </div>

      {/* Inline create form */}
      {showForm && (
        <div className="flex gap-3 rounded-lg border bg-card p-4">
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
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tc('create')}
            </Button>
          </div>
        </div>
      )}

      {/* Search */}
      <form onSubmit={handleSearch} className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder={t('searchAuthors')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-4 text-sm"
        />
      </form>

      {/* Content */}
      {isLoading ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary" />
          <p className="mt-4 text-sm text-muted-foreground">{tc('loading')}</p>
        </div>
      ) : authors.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <User className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <h3 className="mt-4 text-lg font-medium">{t('noAuthors')}</h3>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {authors.map((author) => (
            <Link
              key={author.id}
              href={`/dashboard/authors/${author.id}`}
              className="group rounded-lg border bg-card p-4 transition-all hover:shadow-md hover:border-primary/40"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <User className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold leading-tight truncate group-hover:text-primary">
                    {author.name}
                  </h3>
                  <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>{t('bookCount', { count: author.bookCount })}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
