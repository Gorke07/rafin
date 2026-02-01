'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTranslations } from 'next-intl'
import {
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

const CATEGORY_COLORS = [
  'hsl(217, 91%, 60%)',
  'hsl(142, 71%, 45%)',
  'hsl(45, 93%, 47%)',
  'hsl(0, 84%, 60%)',
  'hsl(270, 70%, 60%)',
  'hsl(190, 80%, 45%)',
  'hsl(330, 70%, 55%)',
  'hsl(30, 90%, 55%)',
]

interface MonthlyPages {
  month: string
  pages: number
}

interface CategoryBreakdown {
  name: string
  count: number
}

interface ReadingPageChartsProps {
  monthlyPages: MonthlyPages[]
  categoryBreakdown: CategoryBreakdown[]
}

function formatMonth(month: string): string {
  const [year, m] = month.split('-')
  const date = new Date(Number(year), Number(m) - 1)
  return date.toLocaleDateString(undefined, { month: 'short' })
}

export function ReadingPageCharts({ monthlyPages, categoryBreakdown }: ReadingPageChartsProps) {
  const t = useTranslations('readingStats')

  const hasPageData = monthlyPages.some((d) => d.pages > 0)
  const hasCategoryData = categoryBreakdown.length > 0

  const categoryData = categoryBreakdown.map((item, i) => ({
    ...item,
    color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
  }))

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('monthlyPages')}</CardTitle>
        </CardHeader>
        <CardContent>
          {hasPageData ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={monthlyPages}>
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
                  formatter={(value) => [String(value), t('pages')]}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="pages" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[240px] items-center justify-center">
              <p className="text-sm text-muted-foreground">{t('noData')}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('categoryBreakdown')}</CardTitle>
        </CardHeader>
        <CardContent>
          {hasCategoryData ? (
            <div className="flex flex-col items-center">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="count"
                  >
                    {categoryData.map((entry) => (
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
                {categoryData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-muted-foreground">
                      {entry.name} ({entry.count})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex h-[240px] items-center justify-center">
              <p className="text-sm text-muted-foreground">{t('noData')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
