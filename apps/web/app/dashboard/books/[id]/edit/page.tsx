'use client'

import { BookForm } from '@/components/books/BookForm'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { use, useEffect, useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export default function EditBookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const t = useTranslations('books')
  const [book, setBook] = useState<Record<string, unknown> | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchBook = async () => {
      try {
        const response = await fetch(`${API_URL}/api/books/${id}`, {
          credentials: 'include',
        })
        const data = await response.json()
        if (data.book) {
          setBook({
            ...data.book,
            categoryIds: data.book.categories?.map((c: { id: number }) => c.id) || [],
            collectionIds: data.book.collections?.map((c: { id: number }) => c.id) || [],
          })
        }
      } catch (err) {
        console.error('Failed to fetch book:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchBook()
  }, [id])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!book) {
    return (
      <div className="space-y-4">
        <Link
          href="/dashboard/books"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-5 w-5" />
          {t('backToBooks')}
        </Link>
        <p className="text-center text-muted-foreground py-8">{t('bookNotFound')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/books/${id}`} className="rounded-md p-2 hover:bg-accent">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-3xl font-bold">{t('editBook')}</h1>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <BookForm initialData={book as Record<string, unknown> & { id: number }} mode="edit" />
      </div>
    </div>
  )
}
