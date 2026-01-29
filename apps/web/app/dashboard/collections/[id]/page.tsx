'use client'

import { useState, useEffect, use } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Book, Loader2, Trash2, Edit, X, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ToastProvider, useToast } from '@/components/ui/toast'

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
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!collection) {
    return (
      <div className="space-y-4">
        <Link href="/dashboard/collections" className="flex items-center gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
          {t('backToCollections')}
        </Link>
        <p className="text-center text-muted-foreground py-8">{t('collectionNotFound')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/collections"
          className="rounded-md p-2 hover:bg-accent"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex items-center gap-3 flex-1">
          <div
            className="h-8 w-8 shrink-0 rounded-lg"
            style={{ backgroundColor: collection.color || '#6b7280' }}
          />
          {isEditing ? (
            <div className="flex items-center gap-2 flex-1">
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
              <Button size="sm" onClick={handleUpdate}>{tc('save')}</Button>
              <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <h1 className="text-3xl font-bold">{collection.name}</h1>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsEditing(!isEditing)}>
            <Edit className="mr-1 h-4 w-4" />
            {tc('edit')}
          </Button>
          <Button variant="outline" size="sm" className="text-destructive" onClick={handleDelete}>
            <Trash2 className="mr-1 h-4 w-4" />
            {tc('delete')}
          </Button>
        </div>
      </div>

      {collection.description && (
        <p className="text-muted-foreground">{collection.description}</p>
      )}

      <p className="text-sm text-muted-foreground">{t('booksCount', { count: books.length })}</p>

      {/* Books Grid */}
      {books.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Book className="mb-4 h-16 w-16 text-muted-foreground/30" />
          <h2 className="text-lg font-semibold">{t('noBooksInCollection')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('addBooksHint')}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {books.map(({ book }) => {
            const coverSrc = book.coverPath
              ? `${API_URL}${book.coverPath}`
              : book.coverUrl || null

            return (
              <div
                key={book.id}
                className="group flex gap-4 rounded-lg border bg-card p-4 transition-shadow hover:shadow-md"
              >
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

                <div className="flex flex-1 flex-col justify-between min-w-0">
                  <div>
                    <Link
                      href={`/dashboard/books/${book.id}`}
                      className="font-semibold hover:text-primary truncate block"
                    >
                      {book.title}
                    </Link>
                    <p className="text-sm text-muted-foreground truncate">{book.author}</p>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{book.pageCount ? `${book.pageCount} ${tc('pages')}` : ''}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveBook(book.id)}
                      className="rounded-md p-1 text-destructive opacity-0 transition-opacity hover:bg-destructive/10 group-hover:opacity-100"
                      title={t('removeBook')}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function CollectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  return (
    <ToastProvider>
      <CollectionDetailContent id={id} />
    </ToastProvider>
  )
}
