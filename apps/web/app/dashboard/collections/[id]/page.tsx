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
import { Breadcrumbs } from '@/components/ui/breadcrumbs'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowLeft, Book, Edit, GripVertical, Loader2, Sparkles, Trash2, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { use, useCallback, useEffect, useRef, useState } from 'react'

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

function SortableBookCard({
  item,
  isSmart,
  onRemove,
}: {
  item: CollectionBook
  isSmart: boolean
  onRemove: (bookId: number) => void
}) {
  const tc = useTranslations('common')
  const t = useTranslations('collections')
  const { book } = item
  const coverSrc = book.coverPath ? `${API_URL}${book.coverPath}` : book.coverUrl || null

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: book.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? 'relative z-10 opacity-80' : ''}>
      <Card className="group">
        <CardContent className="flex gap-4">
          {!isSmart && (
            <button
              type="button"
              className="flex shrink-0 cursor-grab items-center text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-5 w-5" />
            </button>
          )}

          <Link
            href={`/dashboard/books/${book.id}`}
            className="relative h-24 w-16 shrink-0 overflow-hidden rounded-md bg-muted"
          >
            {coverSrc ? (
              <Image src={coverSrc} alt={book.title} fill className="object-cover" sizes="64px" />
            ) : (
              <BookCoverPlaceholder title={book.title} author={book.authorNames} size="sm" />
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
              <p className="truncate text-sm text-muted-foreground">{book.authorNames || ''}</p>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{book.pageCount ? `${book.pageCount} ${tc('pages')}` : ''}</span>
              {!isSmart && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => onRemove(book.id)}
                  title={t('removeBook')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
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

  const reorderTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

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

  const saveReorder = useCallback(
    (orderedBooks: CollectionBook[]) => {
      if (reorderTimeoutRef.current) clearTimeout(reorderTimeoutRef.current)
      reorderTimeoutRef.current = setTimeout(async () => {
        try {
          const bookIds = orderedBooks.map((b) => b.book.id)
          await fetch(`${API_URL}/api/collections/${id}/reorder`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ bookIds }),
          })
          addToast(t('reorderSaved'), 'success')
        } catch {
          addToast(t('operationFailed'), 'error')
        }
      }, 600)
    },
    [id, addToast, t],
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setBooks((prev) => {
      const oldIndex = prev.findIndex((b) => b.book.id === active.id)
      const newIndex = prev.findIndex((b) => b.book.id === over.id)
      if (oldIndex === -1 || newIndex === -1) return prev

      const next = [...prev]
      const [moved] = next.splice(oldIndex, 1)
      next.splice(newIndex, 0, moved)
      saveReorder(next)
      return next
    })
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

  const bookIds = books.map((b) => b.book.id)

  return (
    <div className="space-y-6">
      <Breadcrumbs
        items={[{ label: t('title'), href: '/dashboard/collections' }, { label: collection.name }]}
      />

      <div className="flex items-center gap-4">
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
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={bookIds} strategy={verticalListSortingStrategy}>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {books.map((item) => (
                <SortableBookCard
                  key={item.book.id}
                  item={item}
                  isSmart={collection.isSmart}
                  onRemove={handleRemoveBook}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  )
}

export default function CollectionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  return <CollectionDetailContent id={id} />
}
