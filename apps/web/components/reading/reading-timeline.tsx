'use client'

import { BookCoverPlaceholder } from '@/components/books/BookCoverPlaceholder'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface TimelineEntry {
  bookId: number
  title: string
  coverPath: string | null
  coverUrl: string | null
  pageCount: number | null
  status: string
  startedAt: string | null
  finishedAt: string | null
}

interface ReadingTimelineProps {
  timeline: TimelineEntry[]
}

function groupByMonth(entries: TimelineEntry[]): Map<string, TimelineEntry[]> {
  const groups = new Map<string, TimelineEntry[]>()
  for (const entry of entries) {
    const dateStr = entry.finishedAt || entry.startedAt
    if (!dateStr) continue
    const date = new Date(dateStr)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const group = groups.get(key) || []
    group.push(entry)
    groups.set(key, group)
  }
  return groups
}

function formatMonthLabel(key: string): string {
  const [year, m] = key.split('-')
  const date = new Date(Number(year), Number(m) - 1)
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

export function ReadingTimeline({ timeline }: ReadingTimelineProps) {
  const t = useTranslations('readingStats')
  const [showAll, setShowAll] = useState(false)

  const visibleEntries = showAll ? timeline : timeline.slice(0, 10)
  const grouped = groupByMonth(visibleEntries)

  if (timeline.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('timeline')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('noData')}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('timeline')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.from(grouped.entries()).map(([monthKey, entries]) => (
          <div key={monthKey}>
            <p className="mb-2 text-xs font-medium text-muted-foreground uppercase">
              {formatMonthLabel(monthKey)}
            </p>
            <div className="relative border-l-2 border-muted pl-4 space-y-3">
              {entries.map((entry) => {
                const coverSrc = entry.coverPath
                  ? `${API_URL}${entry.coverPath}`
                  : entry.coverUrl || null
                const dateStr = entry.finishedAt || entry.startedAt
                const formattedDate = dateStr ? new Date(dateStr).toLocaleDateString() : null

                return (
                  <div key={entry.bookId} className="relative">
                    <div className="absolute -left-[21px] top-2 h-2.5 w-2.5 rounded-full border-2 border-background bg-muted-foreground" />
                    <Link
                      href={`/dashboard/books/${entry.bookId}`}
                      className="flex gap-3 rounded-md p-1.5 transition-colors hover:bg-accent/50"
                    >
                      <div className="h-14 w-10 shrink-0 overflow-hidden rounded bg-muted">
                        {coverSrc ? (
                          <img
                            src={coverSrc}
                            alt={entry.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <BookCoverPlaceholder title={entry.title} size="sm" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm font-medium">{entry.title}</p>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                          <Badge
                            variant={entry.status === 'completed' ? 'default' : 'secondary'}
                            className="text-[10px] px-1.5 py-0"
                          >
                            {entry.status === 'completed' ? t('finished') : t('started')}
                          </Badge>
                          {formattedDate && (
                            <span className="text-[10px] text-muted-foreground">
                              {formattedDate}
                            </span>
                          )}
                        </div>
                        {entry.pageCount && (
                          <p className="mt-0.5 text-[10px] text-muted-foreground">
                            {entry.pageCount} {t('pages')}
                          </p>
                        )}
                      </div>
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {!showAll && timeline.length > 10 && (
          <Button variant="ghost" size="sm" className="w-full" onClick={() => setShowAll(true)}>
            {t('loadMore')}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
