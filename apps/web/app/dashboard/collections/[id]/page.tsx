'use client'

import { useState, useEffect, use } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Book, Edit, Image as ImageIcon, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
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
import { EmptyState } from '@/components/dashboard/empty-state'
import { useToast } from '@/hooks/use-toast'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface CollectionDetail {
  id: number
  name: string
  description: string | null
  color: string | null
  isSmart: boolean
  createdAt: string
}

interface CollectionBook {
  book: {
    id: number
    title: string
    author: string
    coverPath: string | null
    coverUrl: string | null
    pageCount: number | null
    publishedYear: number | null
  }
  addedAt: string
  position: number | null
}

function CollectionDetailContent({ id }: { id: string }) {
  const t = useTranslations('collections')
  const tc = useTranslations('common')
  const router = useRouter()
  const { addToast } = useToast()

  const [collection, setCollection] = useState<CollectionDetail | null>(null)
  const [books, setBooks] = useState<CollectionBook[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')

  const fetchCollection = async () => {
    try {
      const response = await fetch(`${API_URL}/api/collections/${id}`, {
        credentials: 'include',
      })
      const data = await response.json()
      if (data.collection) {
        setCollection(data.collection)
        setEditName(data.collection.name)
        setEditColor(data.collection.color || '#6b7280')
      }
      if (data.books) {
        setBooks(data.books)
      }
    } catch (err) {
      console.error('Failed to fetch collection:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchCollection()
  }, [id])

  const handleUpdate = async () => {
    try {
      await fetch(`${API_URL}/api/collections/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: editName,
          color: editColor,
        }),
      })
      addToast(t('updated'), 'success')
      setIsEditing(false)
      fetchCollection()
    } catch {
      addToast(t('updateFailed'), 'error')
    }
  }

  const handleDelete = async () => {
    try {
      await fetch(`${API_URL}/api/collections/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      addToast(t('deleted'), 'success')
      router.push('/dashboard/collections')
    } catch {
      addToast(t('deleteFailed'), 'error')
    }
  }

  const handleRemoveBook = async (bookId: number) => {
    try {
      await fetch(`${API_URL}/api/collections/${id}/books/${bookId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      setBooks((prev) => prev.filter((b) => b.book.id !== bookId))
      addToast(t('bookRemoved'), 'success')
    } catch {
      addToast(t('operationFailed'), 'error')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="flex gap-4">
                <Skeleton className="h-24 w-16 rounded-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (!collection) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/collections">
            <ArrowLeft className="h-4 w-4" />
            {t('backToCollections')}
          </Link>
        </Button>
        <p className="py-8 text-center text-muted-foreground">{t('collectionNotFound')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/collections">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex flex-1 items-center gap-3">
          <div
            className="h-8 w-8 shrink-0 rounded-lg"
            style={{ backgroundColor: collection.color || '#6b7280' }}
          />
          {isEditing ? (
            <div className="flex flex-1 items-center gap-2">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="max-w-xs"
              />
              <input
                type="color"
                value={editColor}
                onChange={(e) => setEditColor(e.target.value)}
                className="h-10 w-10 cursor-pointer rounded-md border"
              />
              <Button size="sm" onClick={handleUpdate}>
                {tc('save')}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <h1 className="text-2xl font-bold tracking-tight">{collection.name}</h1>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>
            <Edit className="mr-1 h-4 w-4" />
            {tc('edit')}
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Trash2 className="mr-1 h-4 w-4" />
                {tc('delete')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('deleteCollection')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('deleteCollectionDescription', { name: collection.name })}
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
      </div>

      {collection.description && <p className="text-muted-foreground">{collection.description}</p>}

      <Badge variant="secondary">{t('booksCount', { count: books.length })}</Badge>

      {/* Books Grid */}
      {books.length === 0 ? (
        <EmptyState
          icon={Book}
          title={t('noBooksInCollection')}
          description={t('addBooksHint')}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {books.map(({ book }) => {
            const coverSrc = book.coverPath ? `${API_URL}${book.coverPath}` : book.coverUrl || null

            return (
              <Card key={book.id} className="group">
                <CardContent className="flex gap-4">
                  <Link
                    href={`/dashboard/books/${book.id}`}
                    className="h-24 w-16 shrink-0 overflow-hidden rounded-md bg-muted"
                  >
                    {coverSrc ? (
                      <img
                        src={coverSrc}
                        alt={book.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-muted-foreground/30" />
                      </div>
                    )}
                  </Link>

                  <div className="flex min-w-0 flex-1 flex-col justify-between">
                    <div>
                      <Link
                        href={`/dashboard/books/${book.id}`}
                        className="block truncate font-semibold hover:text-primary"
                      >
                        {book.title}
                      </Link>
                      <p className="truncate text-sm text-muted-foreground">{book.author}</p>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{book.pageCount ? `${book.pageCount} ${tc('pages')}` : ''}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive opacity-0 transition-opacity group-hover:opacity-100"
                        onClick={() => handleRemoveBook(book.id)}
                        title={t('removeBook')}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function CollectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  return <CollectionDetailContent id={id} />
}
