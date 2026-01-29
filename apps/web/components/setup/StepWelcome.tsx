'use client'

import { useTranslations } from 'next-intl'
import { BookOpen } from 'lucide-react'

interface StepWelcomeProps {
  onNext: () => void
}

export function StepWelcome({ onNext }: StepWelcomeProps) {
  const t = useTranslations('setup')

  return (
    <div className="space-y-6 text-center">
      <div className="flex justify-center">
        <div className="rounded-full bg-primary/10 p-4">
          <BookOpen className="h-12 w-12 text-primary" />
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Rafin</h1>
        <p className="text-lg text-muted-foreground">{t('welcome')}</p>
      </div>

      <p className="text-muted-foreground">{t('welcomeDescription')}</p>

      <button
        onClick={onNext}
        className="w-full rounded-md bg-primary py-3 text-primary-foreground hover:bg-primary/90"
      >
        {t('start')}
      </button>
    </div>
  )
}
