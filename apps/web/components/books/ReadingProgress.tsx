'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import { BookOpen, CheckCircle, Clock, Minus, Plus, XCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

type ReadingStatus = 'tbr' | 'reading' | 'completed' | 'dnf'

interface ReadingProgressProps {
  bookId: number
  totalPages?: number
  userBook?: {
    id: number
    status: ReadingStatus
    currentPage: number
    startedAt?: string | null
    finishedAt?: string | null
  } | null
  onUpdate?: () => void
}

export function ReadingProgress({ bookId, totalPages, userBook, onUpdate }: ReadingProgressProps) {
  const t = useTranslations('readingProgress')
  const [status, setStatus] = useState<ReadingStatus>(userBook?.status || 'tbr')
  const [currentPage, setCurrentPage] = useState(userBook?.currentPage || 0)
  const [isUpdating, setIsUpdating] = useState(false)

  const statusConfig: Record<ReadingStatus, { label: string; icon: typeof Clock; color: string }> =
    {
      tbr: {
        label: t('tbr'),
        icon: Clock,
        color:
          'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
      },
      reading: {
        label: t('reading'),
        icon: BookOpen,
        color:
          'bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800',
      },
      completed: {
        label: t('completed'),
        icon: CheckCircle,
        color:
          'bg-green-100 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800',
      },
      dnf: {
        label: t('dnf'),
        icon: XCircle,
        color:
          'bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800',
      },
    }

  const progressPercent =
    totalPages && totalPages > 0 ? Math.min(Math.round((currentPage / totalPages) * 100), 100) : 0

  const updateProgress = async (newStatus?: ReadingStatus, newPage?: number) => {
    setIsUpdating(true)

    try {
      if (!userBook) {
        await fetch(`${API_URL}/api/user-books/${bookId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            status: newStatus || status,
            currentPage: newPage ?? currentPage,
          }),
        })
      } else {
        await fetch(`${API_URL}/api/user-books/${bookId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            status: newStatus || status,
            currentPage: newPage ?? currentPage,
          }),
        })
      }

      if (newStatus) setStatus(newStatus)
      if (newPage !== undefined) setCurrentPage(newPage)
      onUpdate?.()
    } catch (err) {
      console.error('Failed to update progress:', err)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleStatusChange = (newStatus: ReadingStatus) => {
    setStatus(newStatus)
    let page = currentPage
    if (newStatus === 'completed' && totalPages) {
      page = totalPages
      setCurrentPage(totalPages)
    } else if (newStatus === 'tbr') {
      page = 0
      setCurrentPage(0)
    }
    updateProgress(newStatus, page)
  }

  const handlePageChange = (delta: number) => {
    const newPage = Math.max(0, Math.min(currentPage + delta, totalPages || 9999))
    setCurrentPage(newPage)
    updateProgress(undefined, newPage)
  }

  return (
    <Card>
      <CardContent className="space-y-4">
        <h3 className="font-semibold">{t('title')}</h3>

        {/* Status buttons */}
        <div className="grid grid-cols-2 gap-2">
          {(
            Object.entries(statusConfig) as [ReadingStatus, (typeof statusConfig)[ReadingStatus]][]
          ).map(([key, config]) => {
            const Icon = config.icon
            return (
              <Button
                key={key}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange(key)}
                disabled={isUpdating}
                className={cn('justify-start gap-2', status === key && config.color)}
              >
                <Icon className="h-4 w-4" />
                {config.label}
              </Button>
            )
          })}
        </div>

        {/* Progress bar and page counter */}
        {totalPages && totalPages > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('progress')}</span>
              <span className="font-medium">{progressPercent}%</span>
            </div>

            <Progress value={progressPercent} className="h-2" />

            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(-10)}
                disabled={isUpdating || currentPage <= 0}
              >
                <Minus className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-2 text-sm">
                <Input
                  type="number"
                  min="0"
                  max={totalPages}
                  value={currentPage}
                  onChange={(e) => {
                    const val = Math.max(0, Math.min(Number(e.target.value), totalPages))
                    setCurrentPage(val)
                  }}
                  onBlur={() => updateProgress(undefined, currentPage)}
                  className="w-20 text-center"
                />
                <span className="text-muted-foreground">/ {totalPages}</span>
              </div>

              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => handlePageChange(10)}
                disabled={isUpdating || currentPage >= totalPages}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
