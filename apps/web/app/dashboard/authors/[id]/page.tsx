'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import {
  ArrowLeft,
  BookOpen,
  Edit2,
  Image as ImageIcon,
  Loader2,
  Save,
  Trash2,
  User,
  X,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { use, useEffect, useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface Author {
  id: number
  name: string
  bio?: string | null
  photoUrl?: string | null
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

export default function AuthorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const t = useTranslations('authors')
  const tc = useTranslations('common')
  const router = useRouter()
  const { addToast } = useToast()

  const [author, setAuthor] = useState<Author | null>(null)
  const [books, setBooks] = useState<BookItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', bio: '', photoUrl: '' })
  const [isSaving, setIsSaving] = useState(false)

  const fetchAuthor = async () => {
    try {
      const response = await fetch(`${API_URL}/api/authors/${id}`, { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setAuthor(data.author)
        setBooks(data.books || [])
        setEditForm({
          name: data.author.name || '',
          bio: data.author.bio || '',
          photoUrl: data.author.photoUrl || '',
        })
      }
    } catch {
      console.error('Failed to fetch author')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAuthor()
  }, [id])

  const handleSave = async () => {
    if (!editForm.name.trim()) return
    setIsSaving(true)
    try {
      const response = await fetch(`${API_URL}/api/authors/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: editForm.name.trim(),
          bio: editForm.bio.trim() || undefined,
          photoUrl: editForm.photoUrl.trim() || undefined,
        }),
      })
      if (response.ok) {
        addToast(t('authorUpdated'), 'success')
        setIsEditing(false)
        fetchAuthor()
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
      const response = await fetch(`${API_URL}/api/authors/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (response.ok) {
        addToast(t('authorDeleted'), 'success')
        router.push('/dashboard/authors')
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

  if (!author) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/authors"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
          {t('title')}
        </Link>
        <p className="text-center text-muted-foreground py-8">{t('noAuthors')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/authors" className="rounded-md p-2 hover:bg-accent">
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
                <Label>{t('bio')}</Label>
                <Textarea
                  value={editForm.bio}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, bio: e.target.value }))}
                  rows={3}
                />
              </div>
              <div>
                <Label>{t('photoUrl')}</Label>
                <Input
                  value={editForm.photoUrl}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, photoUrl: e.target.value }))}
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
                  <User className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold">{author.name}</h1>
                  {author.bio && (
                    <p className="mt-1 text-muted-foreground">{author.bio}</p>
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
          <p className="text-sm text-muted-foreground">{t('noAuthors')}</p>
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
