'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Loader2, Target, Trophy } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface ReadingGoalData {
  goal: { id: number; targetBooks: number; year: number } | null
  progress: number
}

export function ReadingGoalWidget() {
  const t = useTranslations('settings')
  const [data, setData] = useState<ReadingGoalData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const year = new Date().getFullYear()
    fetch(`${API_URL}/api/reading-goals/${year}`, { credentials: 'include' })
      .then((res) => res.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {t('readingGoal')}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (!data?.goal) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {t('readingGoal')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('noGoalSet')}</p>
          <Button variant="outline" size="sm" className="mt-3" asChild>
            <a href="/dashboard/settings">{t('setReadingGoal')}</a>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const { targetBooks } = data.goal
  const { progress } = data
  const percentage = Math.min(Math.round((progress / targetBooks) * 100), 100)
  const isComplete = progress >= targetBooks

  const circumference = 2 * Math.PI * 45
  const strokeDashoffset = circumference - (percentage / 100) * circumference

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isComplete ? (
            <Trophy className="h-5 w-5 text-yellow-500" />
          ) : (
            <Target className="h-5 w-5" />
          )}
          {t('readingGoal')} {new Date().getFullYear()}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <div className="relative h-28 w-28 shrink-0">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-muted"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className={cn(
                  'transition-all duration-700',
                  isComplete ? 'text-yellow-500' : 'text-primary',
                )}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold">{percentage}%</span>
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium">
              {t('goalProgress', { read: progress, target: targetBooks })}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {targetBooks - progress > 0 ? `${targetBooks - progress} remaining` : 'Goal reached!'}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function ReadingGoalSettings() {
  const t = useTranslations('settings')
  const [target, setTarget] = useState('')
  const [currentGoal, setCurrentGoal] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const year = new Date().getFullYear()

  useEffect(() => {
    fetch(`${API_URL}/api/reading-goals/${year}`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.goal) {
          setTarget(String(data.goal.targetBooks))
          setCurrentGoal(data.goal.targetBooks)
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false))
  }, [year])

  const handleSave = async () => {
    const num = Number(target)
    if (!num || num < 1) return
    setSaving(true)
    try {
      const res = await fetch(`${API_URL}/api/reading-goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ year, targetBooks: num }),
      })
      if (res.ok) {
        setCurrentGoal(num)
      }
    } catch {}
    setSaving(false)
  }

  const handleRemove = async () => {
    setSaving(true)
    try {
      await fetch(`${API_URL}/api/reading-goals/${year}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      setCurrentGoal(null)
      setTarget('')
    } catch {}
    setSaving(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <div className="flex-1 space-y-1">
          <label htmlFor="target-books" className="text-sm font-medium">
            {t('targetBooks')} ({year})
          </label>
          <Input
            id="target-books"
            type="number"
            min="1"
            max="999"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="24"
          />
        </div>
        <Button onClick={handleSave} disabled={saving || !target || Number(target) < 1}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t('setGoal')}
        </Button>
      </div>
      {currentGoal && (
        <Button variant="ghost" size="sm" onClick={handleRemove} disabled={saving}>
          {t('removeGoal')}
        </Button>
      )}
    </div>
  )
}
