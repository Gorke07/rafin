'use client'

import { use, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Edit2, Loader2, Save, Trash2, User, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
import { BookCard, BookCardSkeleton } from '@/components/dashboard/book-card'
import { useToast } from '@/hooks/use-toast'

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

  if (!author) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/authors">
            <ArrowLeft className="h-4 w-4" />
            {t('title')}
          </Link>
        </Button>
        <p className="py-8 text-center text-muted-foreground">{t('noAuthors')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/authors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
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
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, photoUrl: e.target.value }))
                    }
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
                  <User className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">{author.name}</h1>
                  {author.bio && <p className="mt-1 text-muted-foreground">{author.bio}</p>}
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
                        {t('deleteConfirmDescription', { name: author.name })}
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
            <p className="text-sm text-muted-foreground">{t('noAuthors')}</p>
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
