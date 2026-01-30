'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import {
  ArrowLeft,
  BookOpen,
  Building2,
  Edit2,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  Save,
  Trash2,
  X,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { use, useEffect, useState } from 'react'

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

  const fetchPublisher = async () => {
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
  }

  useEffect(() => {
    fetchPublisher()
  }, [id])

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
    if (!confirm(t('deleteConfirm'))) return
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
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!publisher) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/publishers"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
          {t('title')}
        </Link>
        <p className="text-center text-muted-foreground py-8">{t('noPublishers')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/publishers" className="rounded-md p-2 hover:bg-accent">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          {isEditing ? (
            <div className="space-y-3">
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
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">{publisher.name}</h1>
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
                <Button variant="outline" size="sm" onClick={handleDelete}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {tc('delete')}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Books */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">
          {t('books')} ({t('bookCount', { count: books.length })})
        </h2>
        {books.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('noPublishers')}</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {books.map((book) => {
              const coverSrc = book.coverPath
                ? `${API_URL}${book.coverPath}`
                : book.coverUrl || null
              return (
                <Link
                  key={book.id}
                  href={`/dashboard/books/${book.id}`}
                  className="group overflow-hidden rounded-lg border bg-card transition-all hover:shadow-md hover:border-primary/40"
                >
                  <div className="aspect-[3/4] w-full overflow-hidden bg-muted">
                    {coverSrc ? (
                      <img
                        src={coverSrc}
                        alt={book.title}
                        className="h-full w-full object-contain transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <ImageIcon className="h-12 w-12 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold leading-tight line-clamp-2">{book.title}</h3>
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      {book.publishedYear && <span>{book.publishedYear}</span>}
                      {book.publishedYear && book.pageCount && (
                        <span className="text-border">&middot;</span>
                      )}
                      {book.pageCount && <span>{book.pageCount} s.</span>}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
