'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Filter, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface Category {
  id: number
  name: string
}

export interface BookFilterValues {
  language: string
  bindingType: string
  categoryId: string
  status: string
  yearFrom: string
  yearTo: string
}

const EMPTY_FILTERS: BookFilterValues = {
  language: '',
  bindingType: '',
  categoryId: '',
  status: '',
  yearFrom: '',
  yearTo: '',
}

interface BookFiltersProps {
  filters: BookFilterValues
  onChange: (filters: BookFilterValues) => void
  languages: string[]
}

export function BookFilters({ filters, onChange, languages }: BookFiltersProps) {
  const t = useTranslations('filters')
  const tb = useTranslations('books')
  const tr = useTranslations('readingProgress')
  const [categories, setCategories] = useState<Category[]>([])
  const [isOpen, setIsOpen] = useState(false)

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/categories`, { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        setCategories(data.categories || [])
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err)
    }
  }, [])

  useEffect(() => {
    if (isOpen && categories.length === 0) {
      fetchCategories()
    }
  }, [isOpen, categories.length, fetchCategories])

  const activeCount = Object.values(filters).filter((v) => v !== '').length

  const updateFilter = (key: keyof BookFilterValues, value: string) => {
    onChange({ ...filters, [key]: value })
  }

  const clearAll = () => {
    onChange({ ...EMPTY_FILTERS })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant={isOpen ? 'default' : 'outline'}
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
        >
          <Filter className="mr-1 h-4 w-4" />
          {t('filters')}
          {activeCount > 0 && (
            <Badge variant="secondary" className="ml-1.5 h-5 min-w-5 px-1.5">
              {activeCount}
            </Badge>
          )}
        </Button>
        {activeCount > 0 && (
          <Button type="button" variant="ghost" size="sm" onClick={clearAll}>
            <X className="mr-1 h-3.5 w-3.5" />
            {t('clearAll')}
          </Button>
        )}
      </div>

      {isOpen && (
        <div className="flex flex-wrap gap-3 rounded-lg border bg-muted/30 p-4">
          <div className="w-40">
            <Select
              value={filters.language || undefined}
              onValueChange={(v) => updateFilter('language', v === 'all' ? '' : v)}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder={t('language')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all')}</SelectItem>
                {languages.map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    {lang}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-40">
            <Select
              value={filters.bindingType || undefined}
              onValueChange={(v) => updateFilter('bindingType', v === 'all' ? '' : v)}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder={t('bindingType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all')}</SelectItem>
                <SelectItem value="paperback">{tb('paperback')}</SelectItem>
                <SelectItem value="hardcover">{tb('hardcover')}</SelectItem>
                <SelectItem value="ebook">{tb('ebook')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {categories.length > 0 && (
            <div className="w-44">
              <Select
                value={filters.categoryId || undefined}
                onValueChange={(v) => updateFilter('categoryId', v === 'all' ? '' : v)}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder={t('category')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('all')}</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="w-40">
            <Select
              value={filters.status || undefined}
              onValueChange={(v) => updateFilter('status', v === 'all' ? '' : v)}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder={t('readingStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all')}</SelectItem>
                <SelectItem value="tbr">{tr('tbr')}</SelectItem>
                <SelectItem value="reading">{tr('reading')}</SelectItem>
                <SelectItem value="completed">{tr('completed')}</SelectItem>
                <SelectItem value="dnf">{tr('dnf')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1.5">
            <Input
              type="number"
              placeholder={t('yearFrom')}
              value={filters.yearFrom}
              onChange={(e) => updateFilter('yearFrom', e.target.value)}
              className="h-9 w-24 text-xs"
              min="1800"
              max="2099"
            />
            <span className="text-xs text-muted-foreground">–</span>
            <Input
              type="number"
              placeholder={t('yearTo')}
              value={filters.yearTo}
              onChange={(e) => updateFilter('yearTo', e.target.value)}
              className="h-9 w-24 text-xs"
              min="1800"
              max="2099"
            />
          </div>
        </div>
      )}
    </div>
  )
}

export { EMPTY_FILTERS }
