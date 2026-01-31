'use client'

import { BookCard, BookCardSkeleton } from '@/components/dashboard/book-card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Building2, Edit2, ExternalLink, Loader2, Save, Trash2, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { use, useCallback, useEffect, useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface Publisher {
  id: number
  name: string
  website?: string | null
  createdAt: string
}

interface BookItem {
  id: number
  title: string
  coverPath?: string | null
  coverUrl?: string | null
  publishedYear?: number | null
  pageCount?: number | null
}

export default function PublisherDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const t = useTranslations('publishers')
  const tc = useTranslations('common')
  const router = useRouter()
  const { addToast } = useToast()

  const [publisher, setPublisher] = useState<Publisher | null>(null)
  const [books, setBooks] = useState<BookItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', website: '' })
  const [isSaving, setIsSaving] = useState(false)

  const fetchPublisher = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/publishers/${id}`, { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setPublisher(data.publisher)
        setBooks(data.books || [])
        setEditForm({
          name: data.publisher.name || '',
          website: data.publisher.website || '',
        })
      }
    } catch {
      console.error('Failed to fetch publisher')
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchPublisher()
  }, [fetchPublisher])

  const handleSave = async () => {
    if (!editForm.name.trim()) return
    setIsSaving(true)
    try {
      const response = await fetch(`${API_URL}/api/publishers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: editForm.name.trim(),
          website: editForm.website.trim() || undefined,
        }),
      })
      if (response.ok) {
        addToast(t('publisherUpdated'), 'success')
        setIsEditing(false)
        fetchPublisher()
      }
    } catch {
      addToast(tc('error'), 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      const response = await fetch(`${API_URL}/api/publishers/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (response.ok) {
        addToast(t('publisherDeleted'), 'success')
        router.push('/dashboard/publishers')
      } else {
        const data = await response.json()
        addToast(data.error || t('cannotDelete'), 'error')
      }
    } catch {
      addToast(tc('error'), 'error')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-md" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <BookCardSkeleton key={i} />
          ))}
        </div>
      </div>
    )
  }

  if (!publisher) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/publishers">
            <ArrowLeft className="h-4 w-4" />
            {t('title')}
          </Link>
        </Button>
        <p className="py-8 text-center text-muted-foreground">{t('noPublishers')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[{ label: t('title'), href: '/dashboard/publishers' }, { label: publisher.name }]}
      />

      <div className="flex items-center gap-4">
        <div className="flex-1">
          {isEditing ? (
            <Card>
              <CardContent className="space-y-3">
                <div>
                  <Label>{t('name')}</Label>
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>{t('website')}</Label>
                  <Input
                    value={editForm.website}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, website: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    {tc('save')}
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    <X className="mr-2 h-4 w-4" />
                    {tc('cancel')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">{publisher.name}</h1>
                  {publisher.website && (
                    <a
                      href={publisher.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      {publisher.website}
                    </a>
                  )}
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  {tc('edit')}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Trash2 className="mr-2 h-4 w-4" />
                      {tc('delete')}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('deleteConfirm')}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t('deleteConfirmDescription', { name: publisher.name })}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{tc('cancel')}</AlertDialogCancel>
                      <AlertDialogAction variant="destructive" onClick={handleDelete}>
                        {tc('delete')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Books */}
      <Card>
        <CardContent>
          <div className="mb-4 flex items-center gap-2">
            <h2 className="text-lg font-semibold">{t('books')}</h2>
            <Badge variant="secondary">{t('bookCount', { count: books.length })}</Badge>
          </div>
          {books.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('noPublishers')}</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {books.map((book) => (
                <BookCard key={book.id} book={book} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
