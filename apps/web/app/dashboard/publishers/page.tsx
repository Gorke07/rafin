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
import { Building2, Loader2, Plus, Search, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

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

  const fetchPublishers = useCallback(async (q?: string) => {
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
  }, [])

  useEffect(() => {
    fetchPublishers()
  }, [fetchPublishers])

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
      <PageHeader
        title={t('title')}
        description={
          !isLoading && publishers.length > 0
            ? t('publisherCount', { count: publishers.length })
            : undefined
        }
      >
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? tc('cancel') : t('addPublisher')}
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
          placeholder={t('searchPublishers')}
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
      ) : publishers.length === 0 ? (
        <EmptyState icon={Building2} title={t('noPublishers')} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {publishers.map((publisher) => (
            <Link key={publisher.id} href={`/dashboard/publishers/${publisher.id}`}>
              <Card className="group h-full transition-colors hover:bg-accent/50">
                <CardContent className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold leading-tight group-hover:text-primary">
                      {publisher.name}
                    </h3>
                    <div className="mt-1.5">
                      <Badge variant="secondary">
                        {t('bookCount', { count: publisher.bookCount })}
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
