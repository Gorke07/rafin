'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Star, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface Review {
  id: number
  rating: number
  content: string | null
  createdAt: string
  updatedAt: string
}

interface BookReviewProps {
  bookId: number
}

export function BookReview({ bookId }: BookReviewProps) {
  const t = useTranslations('reviews')
  const [review, setReview] = useState<Review | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [hoverRating, setHoverRating] = useState(0)
  const [editRating, setEditRating] = useState(0)
  const [editContent, setEditContent] = useState('')

  const fetchReview = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/books/${bookId}/review`, {
        credentials: 'include',
      })
      const data = await response.json()
      setReview(data.review || null)
    } catch (err) {
      console.error('Failed to fetch review:', err)
    } finally {
      setIsLoading(false)
    }
  }, [bookId])

  useEffect(() => {
    fetchReview()
  }, [fetchReview])

  const handleStartEdit = () => {
    setEditRating(review?.rating || 0)
    setEditContent(review?.content || '')
    setIsEditing(true)
  }

  const handleSave = async () => {
    if (editRating === 0) return

    setIsSaving(true)
    try {
      const response = await fetch(`${API_URL}/api/books/${bookId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          rating: editRating,
          content: editContent.trim() || undefined,
        }),
      })

      if (response.ok) {
        setIsEditing(false)
        fetchReview()
      }
    } catch (err) {
      console.error('Failed to save review:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      await fetch(`${API_URL}/api/books/${bookId}/review`, {
        method: 'DELETE',
        credentials: 'include',
      })
      setReview(null)
      setIsEditing(false)
    } catch (err) {
      console.error('Failed to delete review:', err)
    }
  }

  const StarRating = ({
    rating,
    interactive,
  }: {
    rating: number
    interactive: boolean
  }) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          className={`transition-colors ${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}
          onClick={() => interactive && setEditRating(star)}
          onMouseEnter={() => interactive && setHoverRating(star)}
          onMouseLeave={() => interactive && setHoverRating(0)}
        >
          <Star
            className={`h-5 w-5 ${
              star <= (interactive ? hoverRating || editRating : rating)
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-muted-foreground/30'
            }`}
          />
        </button>
      ))}
    </div>
  )

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (isEditing) {
    return (
      <Card>
        <CardContent className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Star className="h-4 w-4" />
            {t('title')}
          </h3>
          <StarRating rating={0} interactive />
          {editRating === 0 && <p className="text-xs text-muted-foreground">{t('selectRating')}</p>}
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            placeholder={t('writeReview')}
            rows={3}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={isSaving || editRating === 0}
            >
              {isSaving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
              {t('save')}
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
              {t('cancel')}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!review) {
    return (
      <Card>
        <CardContent className="space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Star className="h-4 w-4" />
            {t('title')}
          </h3>
          <p className="text-xs text-muted-foreground">{t('noReview')}</p>
          <Button type="button" variant="outline" size="sm" onClick={handleStartEdit}>
            {t('addReview')}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Star className="h-4 w-4" />
            {t('title')}
          </h3>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={handleStartEdit}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label={t('editReview')}
            >
              <Star className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              aria-label={t('deleteReview')}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <StarRating rating={review.rating} interactive={false} />
        {review.content && <p className="text-sm text-muted-foreground">{review.content}</p>}
      </CardContent>
    </Card>
  )
}
