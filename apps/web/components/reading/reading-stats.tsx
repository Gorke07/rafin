'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { BookCheck, BookOpen, Clock, FileText } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface ReadingStatsProps {
  booksThisYear: number
  totalPagesRead: number
  currentlyReading: number
  avgDaysToFinish: number | null
  readingGoal: { targetBooks: number; completedBooks: number } | null
}

export function ReadingStats({
  booksThisYear,
  totalPagesRead,
  currentlyReading,
  avgDaysToFinish,
  readingGoal,
}: ReadingStatsProps) {
  const t = useTranslations('readingStats')

  const stats = [
    {
      label: t('booksThisYear'),
      value: readingGoal
        ? t('goalProgress', { read: booksThisYear, target: readingGoal.targetBooks })
        : String(booksThisYear),
      subtitle: t('booksCompleted'),
      icon: BookCheck,
      goal: readingGoal,
    },
    {
      label: t('pagesRead'),
      value: totalPagesRead.toLocaleString(),
      subtitle: t('totalPages'),
      icon: FileText,
      goal: null,
    },
    {
      label: t('currentlyReading'),
      value: String(currentlyReading),
      subtitle: t('nowReading'),
      icon: BookOpen,
      goal: null,
    },
    {
      label: t('avgCompletion'),
      value: avgDaysToFinish !== null ? `${avgDaysToFinish} ${t('days')}` : '—',
      subtitle: t('avgDays'),
      icon: Clock,
      goal: null,
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardContent className="flex items-start gap-3 pt-1">
            <div className="rounded-lg bg-primary/10 p-2">
              <stat.icon className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-xl font-semibold tracking-tight">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
              {stat.goal && (
                <Progress
                  value={Math.min((stat.goal.completedBooks / stat.goal.targetBooks) * 100, 100)}
                  className="mt-2 h-1.5"
                />
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
