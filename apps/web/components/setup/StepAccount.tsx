'use client'

import { ArrowLeft } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import type { SetupData } from './SetupWizard'

interface StepAccountProps {
  data: SetupData
  onChange: (data: Partial<SetupData>) => void
  onNext: () => void
  onBack: () => void
}

export function StepAccount({ data, onChange, onNext, onBack }: StepAccountProps) {
  const t = useTranslations('setup')
  const tAuth = useTranslations('auth')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!data.name || data.name.length < 2) {
      newErrors.name = t('nameMinLength')
    }

    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      newErrors.email = t('invalidEmail')
    }

    if (!data.password || data.password.length < 8) {
      newErrors.password = t('passwordMinLength')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) {
      onNext()
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold">{t('accountTitle')}</h2>
        <p className="text-muted-foreground">{t('accountDescription')}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium">
            {tAuth('name')}
          </label>
          <input
            id="name"
            type="text"
            value={data.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2"
            required
          />
          {errors.name && <p className="mt-1 text-sm text-destructive">{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            {tAuth('email')}
          </label>
          <input
            id="email"
            type="email"
            value={data.email}
            onChange={(e) => onChange({ email: e.target.value })}
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2"
            required
          />
          {errors.email && <p className="mt-1 text-sm text-destructive">{errors.email}</p>}
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium">
            {tAuth('password')}
          </label>
          <input
            id="password"
            type="password"
            value={data.password}
            onChange={(e) => onChange({ password: e.target.value })}
            className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2"
            required
          />
          {errors.password && <p className="mt-1 text-sm text-destructive">{errors.password}</p>}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('back')}
          </button>
          <button
            type="submit"
            className="flex-1 rounded-md bg-primary py-2 text-primary-foreground hover:bg-primary/90"
          >
            {t('next')}
          </button>
        </div>
      </form>
    </div>
  )
}
