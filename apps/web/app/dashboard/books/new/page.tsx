'use client'

import { useTranslations } from 'next-intl'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { BookForm } from '@/components/books/BookForm'

export default function NewBookPage() {
  const t = useTranslations('books')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/books" className="rounded-md p-2 hover:bg-accent">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-3xl font-bold">{t('addBook')}</h1>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <BookForm mode="create" />
      </div>
    </div>
  )
}
