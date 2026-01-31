'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { formatDate } from '@/lib/utils'
import { Loader2, Plus, Quote, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface QuoteItem {
  id: number
  content: string
  pageNumber: number | null
  createdAt: string
}

interface BookQuotesProps {
  bookId: number
}

export function BookQuotes({ bookId }: BookQuotesProps) {
  const t = useTranslations('quotes')
  const [quotes, setQuotes] = useState<QuoteItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [newQuote, setNewQuote] = useState('')
  const [newPageNumber, setNewPageNumber] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const fetchQuotes = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/books/${bookId}/quotes`, {
        credentials: 'include',
      })
      const data = await response.json()
      setQuotes(data.quotes || [])
    } catch (err) {
      console.error('Failed to fetch quotes:', err)
    } finally {
      setIsLoading(false)
    }
  }, [bookId])

  useEffect(() => {
    fetchQuotes()
  }, [fetchQuotes])

  const handleAddQuote = async () => {
    if (!newQuote.trim()) return

    setIsSaving(true)
    try {
      const response = await fetch(`${API_URL}/api/books/${bookId}/quotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          content: newQuote,
          pageNumber: newPageNumber ? Number(newPageNumber) : undefined,
        }),
      })

      if (response.ok) {
        setNewQuote('')
        setNewPageNumber('')
        setShowForm(false)
        fetchQuotes()
      }
    } catch (err) {
      console.error('Failed to add quote:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteQuote = async (quoteId: number) => {
    try {
      await fetch(`${API_URL}/api/books/${bookId}/quotes/${quoteId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      setQuotes((prev) => prev.filter((q) => q.id !== quoteId))
    } catch (err) {
      console.error('Failed to delete quote:', err)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 font-semibold">
          <Quote className="h-5 w-5" />
          {t('quotesCount', { count: quotes.length })}
        </h3>
        <Button type="button" variant="outline" size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-1 h-4 w-4" />
          {t('addQuote')}
        </Button>
      </div>

      {showForm && (
        <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
          <Textarea
            value={newQuote}
            onChange={(e) => setNewQuote(e.target.value)}
            placeholder={t('writeQuote')}
            rows={3}
          />
          <div className="flex items-end gap-3">
            <div className="w-32">
              <Label htmlFor="quotePageNumber">{t('pageNumber')}</Label>
              <Input
                id="quotePageNumber"
                type="number"
                min="1"
                value={newPageNumber}
                onChange={(e) => setNewPageNumber(e.target.value)}
                placeholder={t('optional')}
              />
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={handleAddQuote}
                disabled={isSaving || !newQuote.trim()}
              >
                {isSaving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null}
                {t('save')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowForm(false)
                  setNewQuote('')
                  setNewPageNumber('')
                }}
              >
                {t('cancel')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {quotes.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">{t('noQuotes')}</p>
      ) : (
        <div className="space-y-3">
          {quotes.map((quote) => (
            <div key={quote.id} className="group rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <blockquote className="border-l-4 border-primary/30 pl-4 text-sm italic text-muted-foreground">
                  {quote.content}
                </blockquote>
                <button
                  type="button"
                  onClick={() => handleDeleteQuote(quote.id)}
                  className="shrink-0 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                  aria-label={t('deleteQuote')}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2 flex items-center gap-3 pl-4 text-xs text-muted-foreground">
                <span>{formatDate(quote.createdAt)}</span>
                {quote.pageNumber && <span>{t('pageLabel', { page: quote.pageNumber })}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
