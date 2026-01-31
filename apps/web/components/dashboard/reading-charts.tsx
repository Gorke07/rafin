'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Star } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

const STATUS_COLORS: Record<string, string> = {
  tbr: 'hsl(45, 93%, 47%)',
  reading: 'hsl(217, 91%, 60%)',
  completed: 'hsl(142, 71%, 45%)',
  dnf: 'hsl(0, 84%, 60%)',
}

interface ChartData {
  monthlyReading: Array<{ month: string; completed: number }>
  readingStatus: Record<string, number>
  monthlyBooksAdded: Array<{ month: string; count: number }>
  averageRating: number | null
}

function formatMonth(month: string): string {
  const [year, m] = month.split('-')
  const date = new Date(Number(year), Number(m) - 1)
  return date.toLocaleDateString(undefined, { month: 'short' })
}

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[200px] w-full rounded" />
      </CardContent>
    </Card>
  )
}

export function ReadingCharts() {
  const t = useTranslations('charts')
  const tr = useTranslations('readingProgress')
  const [data, setData] = useState<ChartData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchCharts = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/stats/charts`, {
        credentials: 'include',
      })
      if (response.ok) {
        const result = await response.json()
        setData(result)
      }
    } catch (err) {
      console.error('Failed to fetch chart data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCharts()
  }, [fetchCharts])

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <ChartSkeleton />
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    )
  }

  if (!data) return null

  const hasReadingData = data.monthlyReading.some((d) => d.completed > 0)
  const hasAddedData = data.monthlyBooksAdded.some((d) => d.count > 0)
  const totalStatusBooks = Object.values(data.readingStatus).reduce((a, b) => a + b, 0)

  const statusData = Object.entries(data.readingStatus)
    .filter(([, value]) => value > 0)
    .map(([key, value]) => ({
      name: tr(key as 'tbr' | 'reading' | 'completed' | 'dnf'),
      value,
      color: STATUS_COLORS[key],
    }))

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('monthlyReading')}</CardTitle>
        </CardHeader>
        <CardContent>
          {hasReadingData ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.monthlyReading}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="month"
                  tickFormatter={formatMonth}
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  allowDecimals={false}
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip
                  labelFormatter={(label) => {
                    const str = String(label)
                    const [year, m] = str.split('-')
                    const date = new Date(Number(year), Number(m) - 1)
                    return date.toLocaleDateString(undefined, {
                      month: 'long',
                      year: 'numeric',
                    })
                  }}
                  formatter={(value) => [String(value), t('booksCompleted')]}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="completed" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[200px] items-center justify-center">
              <p className="text-sm text-muted-foreground">{t('noReadingData')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('readingStatus')}</CardTitle>
        </CardHeader>
        <CardContent>
          {totalStatusBooks > 0 ? (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [String(value), String(name)]}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
                {statusData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-muted-foreground">
                      {entry.name} ({entry.value})
                    </span>
                  </div>
                ))}
              </div>
              {data.averageRating !== null && (
                <div className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span>
                    {t('avgRating')}: {data.averageRating.toFixed(1)}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-[200px] items-center justify-center">
              <p className="text-sm text-muted-foreground">{t('noStatusData')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('booksAdded')}</CardTitle>
        </CardHeader>
        <CardContent>
          {hasAddedData ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data.monthlyBooksAdded}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="month"
                  tickFormatter={formatMonth}
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                  allowDecimals={false}
                  className="text-xs"
                  tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip
                  labelFormatter={(label) => {
                    const str = String(label)
                    const [year, m] = str.split('-')
                    const date = new Date(Number(year), Number(m) - 1)
                    return date.toLocaleDateString(undefined, {
                      month: 'long',
                      year: 'numeric',
                    })
                  }}
                  formatter={(value) => [String(value), t('booksAddedLabel')]}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(217, 91%, 60%)"
                  fill="hsl(217, 91%, 60%)"
                  fillOpacity={0.15}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[200px] items-center justify-center">
              <p className="text-sm text-muted-foreground">{t('noAddedData')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
