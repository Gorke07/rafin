'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { BookOpen, Building2, Loader2, Plus, Search, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useEffect, useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface Publisher {
  id: number
  name: string
  website?: string | null
  bookCount: number
}

export default function PublishersPage() {
  const t = useTranslations('publishers')
  const tc = useTranslations('common')
  const { addToast } = useToast()

  const [publishers, setPublishers] = useState<Publisher[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const fetchPublishers = async (q?: string) => {
    try {
      const url = q
        ? `${API_URL}/api/publishers?q=${encodeURIComponent(q)}`
        : `${API_URL}/api/publishers`
      const response = await fetch(url, { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setPublishers(data.publishers || [])
      }
    } catch {
      console.error('Failed to fetch publishers')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPublishers()
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchPublishers(searchQuery)
  }

  const handleCreate = async () => {
    if (!newName.trim()) return
    setIsCreating(true)
    try {
      const response = await fetch(`${API_URL}/api/publishers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: newName.trim() }),
      })
      if (response.ok) {
        addToast(t('publisherCreated'), 'success')
        setNewName('')
        setShowForm(false)
        fetchPublishers()
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
          {!isLoading && publishers.length > 0 && (
            <p className="mt-1 text-sm text-muted-foreground">
              {t('publisherCount', { count: publishers.length })}
            </p>
          )}
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
          {showForm ? tc('cancel') : t('addPublisher')}
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
          placeholder={t('searchPublishers')}
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
      ) : publishers.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <h3 className="mt-4 text-lg font-medium">{t('noPublishers')}</h3>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {publishers.map((publisher) => (
            <Link
              key={publisher.id}
              href={`/dashboard/publishers/${publisher.id}`}
              className="group rounded-lg border bg-card p-4 transition-all hover:shadow-md hover:border-primary/40"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold leading-tight truncate group-hover:text-primary">
                    {publisher.name}
                  </h3>
                  <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <BookOpen className="h-3.5 w-3.5" />
                    <span>{t('bookCount', { count: publisher.bookCount })}</span>
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
