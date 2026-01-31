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
import { ArrowLeft, Edit2, Loader2, Save, Tag, Trash2, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { use, useCallback, useEffect, useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface Category {
  id: number
  name: string
  slug: string
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

export default function CategoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const t = useTranslations('categories')
  const tc = useTranslations('common')
  const router = useRouter()
  const { addToast } = useToast()

  const [category, setCategory] = useState<Category | null>(null)
  const [books, setBooks] = useState<BookItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const fetchCategory = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/categories/${id}`, { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setCategory(data.category)
        setBooks(data.books || [])
        setEditName(data.category.name || '')
      }
    } catch {
      console.error('Failed to fetch category')
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchCategory()
  }, [fetchCategory])

  const handleSave = async () => {
    if (!editName.trim()) return
    setIsSaving(true)
    try {
      const response = await fetch(`${API_URL}/api/categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: editName.trim() }),
      })
      if (response.ok) {
        addToast(t('categoryUpdated'), 'success')
        setIsEditing(false)
        fetchCategory()
      }
    } catch {
      addToast(tc('error'), 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      const response = await fetch(`${API_URL}/api/categories/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (response.ok) {
        addToast(t('categoryDeleted'), 'success')
        router.push('/dashboard/categories')
      } else {
        const data = await response.json()
        addToast(data.error || tc('error'), 'error')
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
            <Skeleton className="h-10 w-10 rounded-lg" />
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

  if (!category) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/categories">
            <ArrowLeft className="h-4 w-4" />
            {t('title')}
          </Link>
        </Button>
        <p className="py-8 text-center text-muted-foreground">{t('categoryNotFound')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[{ label: t('title'), href: '/dashboard/categories' }, { label: category.name }]}
      />

      <div className="flex items-center gap-4">
        <div className="flex-1">
          {isEditing ? (
            <Card>
              <CardContent className="space-y-3">
                <div>
                  <Label>{t('name')}</Label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
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
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Tag className="h-5 w-5" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">{category.name}</h1>
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
                        {t('deleteConfirmDescription', { name: category.name })}
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

      <Card>
        <CardContent>
          <div className="mb-4 flex items-center gap-2">
            <h2 className="text-lg font-semibold">{t('books')}</h2>
            <Badge variant="secondary">{t('bookCount', { count: books.length })}</Badge>
          </div>
          {books.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('noBooksInCategory')}</p>
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
