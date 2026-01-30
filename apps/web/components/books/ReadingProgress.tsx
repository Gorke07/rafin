'use client'

import { useState } from 'react'
import { BookOpen, CheckCircle, Clock, XCircle, Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

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

const statusConfig = {
  tbr: { label: 'Okunacak', icon: Clock, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  reading: {
    label: 'Okunuyor',
    icon: BookOpen,
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  },
  completed: {
    label: 'Tamamlandı',
    icon: CheckCircle,
    color: 'bg-green-100 text-green-700 border-green-200',
  },
  dnf: { label: 'Bırakıldı', icon: XCircle, color: 'bg-red-100 text-red-700 border-red-200' },
}

export function ReadingProgress({ bookId, totalPages, userBook, onUpdate }: ReadingProgressProps) {
  const [status, setStatus] = useState<ReadingStatus>(userBook?.status || 'tbr')
  const [currentPage, setCurrentPage] = useState(userBook?.currentPage || 0)
  const [isUpdating, setIsUpdating] = useState(false)

  const progressPercent =
    totalPages && totalPages > 0 ? Math.min(Math.round((currentPage / totalPages) * 100), 100) : 0

  const updateProgress = async (newStatus?: ReadingStatus, newPage?: number) => {
    setIsUpdating(true)

    try {
      if (!userBook) {
        // Create user-book relationship first
        await fetch(`${API_URL}/api/user-books`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            bookId,
            status: newStatus || status,
            currentPage: newPage ?? currentPage,
          }),
        })
      } else {
        // Update existing relationship
        await fetch(`${API_URL}/api/user-books/${userBook.id}`, {
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
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <h3 className="font-semibold">Okuma İlerlemesi</h3>

      {/* Status buttons */}
      <div className="grid grid-cols-2 gap-2">
        {(Object.entries(statusConfig) as [ReadingStatus, typeof statusConfig.tbr][]).map(
          ([key, config]) => {
            const Icon = config.icon
            return (
              <button
                key={key}
                type="button"
                onClick={() => handleStatusChange(key)}
                disabled={isUpdating}
                className={cn(
                  'flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                  status === key ? config.color : 'border-input bg-background hover:bg-accent',
                )}
              >
                <Icon className="h-4 w-4" />
                {config.label}
              </button>
            )
          },
        )}
      </div>

      {/* Progress bar and page counter */}
      {totalPages && totalPages > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">İlerleme</span>
            <span className="font-medium">{progressPercent}%</span>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

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
    </div>
  )
}
