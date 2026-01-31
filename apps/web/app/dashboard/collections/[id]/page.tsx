'use client'

import { BookCoverPlaceholder } from '@/components/books/BookCoverPlaceholder'
import {
  EMPTY_SMART_FILTERS,
  SmartCollectionRuleBuilder,
  type SmartFilters,
} from '@/components/collections/SmartCollectionRuleBuilder'
import { EmptyState } from '@/components/dashboard/empty-state'
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
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Book, Edit, Loader2, Sparkles, Trash2, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { use, useCallback, useEffect, useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface CollectionDetail {
  id: number
  name: string
  description: string | null
  color: string | null
  isSmart: boolean
  smartFilters: SmartFilters | null
  createdAt: string
}

interface CollectionBook {
  book: {
    id: number
    title: string
    authorNames?: string
    coverPath: string | null
    coverUrl: string | null
    pageCount: number | null
    publishedYear: number | null
  }
  addedAt: string | null
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
  const [isEditingRules, setIsEditingRules] = useState(false)
  const [editSmartFilters, setEditSmartFilters] = useState<SmartFilters>(EMPTY_SMART_FILTERS)
  const [isSavingRules, setIsSavingRules] = useState(false)

  const fetchCollection = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/collections/${id}`, {
        credentials: 'include',
      })
      const data = await response.json()
      if (data.collection) {
        setCollection(data.collection)
        setEditName(data.collection.name)
        setEditColor(data.collection.color || '#6b7280')
        if (data.collection.smartFilters) {
          setEditSmartFilters(data.collection.smartFilters)
        }
      }
      if (data.books) {
        setBooks(data.books)
      }
    } catch (err) {
      console.error('Failed to fetch collection:', err)
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchCollection()
  }, [fetchCollection])

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

  const handleSaveRules = async () => {
    const validRules = editSmartFilters.rules.filter((r) => r.value !== '')
    if (validRules.length === 0) return

    setIsSavingRules(true)
    try {
      await fetch(`${API_URL}/api/collections/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          smartFilters: { ...editSmartFilters, rules: validRules },
        }),
      })
      addToast(t('updated'), 'success')
      setIsEditingRules(false)
      fetchCollection()
    } catch {
      addToast(t('updateFailed'), 'error')
    } finally {
      setIsSavingRules(false)
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
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{collection.name}</h1>
              {collection.isSmart && (
                <Badge variant="secondary">
                  <Sparkles className="mr-1 h-3 w-3" />
                  {t('smartCollection')}
                </Badge>
              )}
            </div>
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

      {collection.isSmart && (
        <div className="space-y-3">
          {isEditingRules ? (
            <>
              <SmartCollectionRuleBuilder value={editSmartFilters} onChange={setEditSmartFilters} />
              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={handleSaveRules} disabled={isSavingRules}>
                  {isSavingRules && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                  {tc('save')}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsEditingRules(false)
                    if (collection.smartFilters) setEditSmartFilters(collection.smartFilters)
                  }}
                >
                  {tc('cancel')}
                </Button>
              </div>
            </>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditingRules(true)}
            >
              <Edit className="mr-1 h-4 w-4" />
              {t('smartRules.editRules')}
            </Button>
          )}
        </div>
      )}

      {books.length === 0 ? (
        <EmptyState
          icon={Book}
          title={collection.isSmart ? t('smartRules.noMatchingBooks') : t('noBooksInCollection')}
          description={collection.isSmart ? t('smartRules.adjustRulesHint') : t('addBooksHint')}
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
                      <img src={coverSrc} alt={book.title} className="h-full w-full object-cover" />
                    ) : (
                      <BookCoverPlaceholder
                        title={book.title}
                        author={book.authorNames}
                        size="sm"
                      />
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
                      <p className="truncate text-sm text-muted-foreground">
                        {book.authorNames || ''}
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{book.pageCount ? `${book.pageCount} ${tc('pages')}` : ''}</span>
                      {!collection.isSmart && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive opacity-0 transition-opacity group-hover:opacity-100"
                          onClick={() => handleRemoveBook(book.id)}
                          title={t('removeBook')}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
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
