'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { StepWelcome } from './StepWelcome'
import { StepAccount } from './StepAccount'
import { StepSummary } from './StepSummary'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export interface SetupData {
  name: string
  email: string
  password: string
}

export function SetupWizard() {
  const router = useRouter()
  const ts = useTranslations('setup')
  const tc = useTranslations('common')
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [data, setData] = useState<SetupData>({
    name: '',
    email: '',
    password: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleNext = () => {
    if (step < 3) {
      setStep((s) => (s + 1) as 1 | 2 | 3)
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep((s) => (s - 1) as 1 | 2 | 3)
    }
  }

  const handleDataChange = (newData: Partial<SetupData>) => {
    setData((prev) => ({ ...prev, ...newData }))
  }

  const handleComplete = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      // Complete setup
      const setupResponse = await fetch(`${API_URL}/api/setup/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
        }),
      })

      if (!setupResponse.ok) {
        const errorData = await setupResponse.json()
        setError(errorData.error || ts('setupFailed'))
        return
      }

      // Login after setup
      const loginResponse = await fetch(`${API_URL}/api/auth/sign-in/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
      })

      if (!loginResponse.ok) {
        setError(ts('loginAfterSetupFailed'))
        router.push('/login')
        return
      }

      router.push('/dashboard')
    } catch {
      setError(tc('networkError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-8 p-8">
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`h-2 w-12 rounded-full transition-colors ${
              s <= step ? 'bg-primary' : 'bg-muted'
            }`}
          />
        ))}
      </div>

      {/* Step content */}
      {step === 1 && <StepWelcome onNext={handleNext} />}
      {step === 2 && (
        <StepAccount
          data={data}
          onChange={handleDataChange}
          onNext={handleNext}
          onBack={handleBack}
        />
      )}
      {step === 3 && (
        <StepSummary
          data={data}
          onBack={handleBack}
          onComplete={handleComplete}
          isSubmitting={isSubmitting}
          error={error}
        />
      )}
    </div>
  )
}
