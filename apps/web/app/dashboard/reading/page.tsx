'use client'

import { useTranslations } from 'next-intl'
import { BookMarked, BookOpen, CheckCircle, XCircle } from 'lucide-react'

type ReadingStatus = 'tbr' | 'reading' | 'completed' | 'dnf'

export default function ReadingPage() {
  const t = useTranslations('reading')
  const tc = useTranslations('common')

  const statusTabs: { key: ReadingStatus; label: string; icon: React.ElementType }[] = [
    { key: 'reading', label: t('reading'), icon: BookOpen },
    { key: 'tbr', label: t('tbr'), icon: BookMarked },
    { key: 'completed', label: t('completed'), icon: CheckCircle },
    { key: 'dnf', label: t('dnf'), icon: XCircle },
  ]

  // TODO: Fetch from API
  const books: { status: ReadingStatus; title: string; author: string; progress?: number }[] = []

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">{t('title')}</h1>

      <div className="flex gap-2 border-b">
        {statusTabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            className="flex items-center gap-2 border-b-2 border-transparent px-4 py-2 text-muted-foreground hover:text-foreground data-[active=true]:border-primary data-[active=true]:text-foreground"
            data-active={key === 'reading'}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {books.length === 0 ? (
        <div className="rounded-lg border bg-card p-12 text-center">
          <BookMarked className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">{t('noBooks')}</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('noBooksHint')}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {books.map((book, idx) => (
            <div key={idx} className="rounded-lg border bg-card p-4">
              <h3 className="font-medium">{book.title}</h3>
              <p className="text-sm text-muted-foreground">{book.author}</p>
              {book.progress !== undefined && (
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>{t('progress')}</span>
                    <span>{book.progress}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${book.progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
