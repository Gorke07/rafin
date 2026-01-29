'use client'

import { useTranslations } from 'next-intl'
import { ArrowLeft, Check, Loader2 } from 'lucide-react'
import type { SetupData } from './SetupWizard'

interface StepSummaryProps {
  data: SetupData
  onBack: () => void
  onComplete: () => void
  isSubmitting: boolean
  error: string | null
}

export function StepSummary({ data, onBack, onComplete, isSubmitting, error }: StepSummaryProps) {
  const t = useTranslations('setup')
  const tAuth = useTranslations('auth')

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold">{t('summaryTitle')}</h2>
        <p className="text-muted-foreground">{t('summaryDescription')}</p>
      </div>

      <div className="space-y-4 rounded-lg border border-input bg-muted/50 p-4">
        <div className="flex justify-between">
          <span className="text-muted-foreground">{tAuth('name')}</span>
          <span className="font-medium">{data.name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{tAuth('email')}</span>
          <span className="font-medium">{data.email}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">{tAuth('password')}</span>
          <span className="font-medium">{'•'.repeat(data.password.length)}</span>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-center text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="flex items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 hover:bg-accent disabled:opacity-50"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('back')}
        </button>
        <button
          type="button"
          onClick={onComplete}
          disabled={isSubmitting}
          className="flex flex-1 items-center justify-center gap-2 rounded-md bg-primary py-2 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('creating')}
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              {t('complete')}
            </>
          )}
        </button>
      </div>
    </div>
  )
}
