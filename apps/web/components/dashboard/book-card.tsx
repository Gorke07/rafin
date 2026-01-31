import { BookCoverPlaceholder } from '@/components/books/BookCoverPlaceholder'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'
import Link from 'next/link'

interface BookCardProps {
  book: {
    id: number
    title: string
    authorNames?: string
    coverPath?: string | null
    coverUrl?: string | null
    publishedYear?: number | null
    pageCount?: number | null
  }
  selectable?: boolean
  selected?: boolean
  onSelect?: (id: number) => void
}

export function BookCard({ book, selectable, selected, onSelect }: BookCardProps) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
  const coverSrc = book.coverPath ? `${API_URL}${book.coverPath}` : book.coverUrl || null

  const content = (
    <Card
      className={cn(
        'group overflow-hidden transition-colors hover:bg-accent/50',
        selected && 'ring-2 ring-primary',
      )}
    >
      <CardContent className="p-0">
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-muted">
          {coverSrc ? (
            <img
              src={coverSrc}
              alt={book.title}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <BookCoverPlaceholder title={book.title} author={book.authorNames} size="lg" />
          )}
          {selectable && (
            <div
              className={cn(
                'absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-md border-2 transition-colors',
                selected
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-white/80 bg-black/20 backdrop-blur-sm',
              )}
            >
              {selected && <Check className="h-4 w-4" />}
            </div>
          )}
        </div>
        <div className="p-3">
          <h3 className="line-clamp-2 text-sm font-medium leading-tight">{book.title}</h3>
          {book.authorNames && (
            <p className="mt-1 truncate text-xs text-muted-foreground">{book.authorNames}</p>
          )}
          {(book.publishedYear || book.pageCount) && (
            <p className="mt-1 text-xs text-muted-foreground">
              {[book.publishedYear, book.pageCount ? `${book.pageCount}p` : null]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )

  if (selectable) {
    return (
      <button type="button" className="w-full text-left" onClick={() => onSelect?.(book.id)}>
        {content}
      </button>
    )
  }

  return <Link href={`/dashboard/books/${book.id}`}>{content}</Link>
}

export function BookCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <Skeleton className="aspect-[3/4] w-full rounded-none" />
        <div className="p-3">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="mt-1.5 h-3 w-1/2" />
        </div>
      </CardContent>
    </Card>
  )
}
