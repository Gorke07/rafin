import Image from 'next/image'
import Link from 'next/link'
import { BookOpen } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

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
}

export function BookCard({ book }: BookCardProps) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
  const coverSrc = book.coverPath ? `${API_URL}${book.coverPath}` : book.coverUrl || null

  return (
    <Link href={`/dashboard/books/${book.id}`}>
      <Card className="group overflow-hidden transition-colors hover:bg-accent/50">
        <CardContent className="p-0">
          <div className="aspect-[3/4] w-full overflow-hidden bg-muted">
            {coverSrc ? (
              <Image
                src={coverSrc}
                alt={book.title}
                width={200}
                height={267}
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <BookOpen className="h-10 w-10 text-muted-foreground/30" />
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
    </Link>
  )
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
