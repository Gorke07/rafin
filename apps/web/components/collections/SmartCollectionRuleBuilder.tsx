'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

interface SmartRule {
  id: string
  field: string
  operator: string
  value: string
}

export interface SmartFilters {
  logic: 'and' | 'or'
  rules: SmartRule[]
}

interface Category {
  id: number
  name: string
}

const RULE_FIELDS = [
  'status',
  'language',
  'bindingType',
  'categoryId',
  'publishedYear',
  'pageCount',
  'rating',
  'hasReview',
] as const

type RuleField = (typeof RULE_FIELDS)[number]

const OPERATORS_BY_FIELD: Record<RuleField, string[]> = {
  status: ['equals'],
  language: ['equals'],
  bindingType: ['equals'],
  categoryId: ['equals'],
  publishedYear: ['equals', 'greaterThan', 'lessThan'],
  pageCount: ['greaterThan', 'lessThan'],
  rating: ['equals', 'greaterThan', 'lessThan'],
  hasReview: ['equals'],
}

function generateId() {
  return Math.random().toString(36).slice(2, 9)
}

function createEmptyRule(): SmartRule {
  return { id: generateId(), field: 'status', operator: 'equals', value: '' }
}

interface SmartCollectionRuleBuilderProps {
  value: SmartFilters
  onChange: (filters: SmartFilters) => void
  previewCount?: number | null
  isLoadingPreview?: boolean
}

export function SmartCollectionRuleBuilder({
  value,
  onChange,
  previewCount,
  isLoadingPreview,
}: SmartCollectionRuleBuilderProps) {
  const t = useTranslations('collections')
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    fetch(`${API_URL}/api/categories`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => setCategories(data.categories || []))
      .catch(() => {})
  }, [])

  const addRule = useCallback(() => {
    onChange({
      ...value,
      rules: [...value.rules, createEmptyRule()],
    })
  }, [value, onChange])

  const removeRule = useCallback(
    (id: string) => {
      onChange({
        ...value,
        rules: value.rules.filter((r) => r.id !== id),
      })
    },
    [value, onChange],
  )

  const updateRule = useCallback(
    (id: string, updates: Partial<SmartRule>) => {
      onChange({
        ...value,
        rules: value.rules.map((r) => (r.id === id ? { ...r, ...updates } : r)),
      })
    },
    [value, onChange],
  )

  const toggleLogic = useCallback(() => {
    onChange({
      ...value,
      logic: value.logic === 'and' ? 'or' : 'and',
    })
  }, [value, onChange])

  const renderValueInput = (rule: SmartRule) => {
    const field = rule.field as RuleField

    switch (field) {
      case 'status':
        return (
          <Select value={rule.value} onValueChange={(v) => updateRule(rule.id, { value: v })}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={t('smartRules.selectValue')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tbr">{t('smartRules.statusTbr')}</SelectItem>
              <SelectItem value="reading">{t('smartRules.statusReading')}</SelectItem>
              <SelectItem value="completed">{t('smartRules.statusCompleted')}</SelectItem>
              <SelectItem value="dnf">{t('smartRules.statusDnf')}</SelectItem>
            </SelectContent>
          </Select>
        )

      case 'language':
        return (
          <Input
            value={rule.value}
            onChange={(e) => updateRule(rule.id, { value: e.target.value })}
            placeholder={t('smartRules.languagePlaceholder')}
            className="w-[160px]"
          />
        )

      case 'bindingType':
        return (
          <Select value={rule.value} onValueChange={(v) => updateRule(rule.id, { value: v })}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={t('smartRules.selectValue')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="paperback">{t('smartRules.paperback')}</SelectItem>
              <SelectItem value="hardcover">{t('smartRules.hardcover')}</SelectItem>
              <SelectItem value="ebook">{t('smartRules.ebook')}</SelectItem>
            </SelectContent>
          </Select>
        )

      case 'categoryId':
        return (
          <Select value={rule.value} onValueChange={(v) => updateRule(rule.id, { value: v })}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={t('smartRules.selectCategory')} />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={String(cat.id)}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'hasReview':
        return (
          <Select value={rule.value} onValueChange={(v) => updateRule(rule.id, { value: v })}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder={t('smartRules.selectValue')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">{t('smartRules.yes')}</SelectItem>
              <SelectItem value="false">{t('smartRules.no')}</SelectItem>
            </SelectContent>
          </Select>
        )

      case 'publishedYear':
      case 'pageCount':
      case 'rating':
        return (
          <Input
            type="number"
            value={rule.value}
            onChange={(e) => updateRule(rule.id, { value: e.target.value })}
            placeholder={field === 'rating' ? '1-5' : field === 'publishedYear' ? '2020' : '300'}
            className="w-[120px]"
          />
        )

      default:
        return null
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{t('smartRules.title')}</h3>
          <div className="flex items-center gap-2">
            {previewCount !== null && previewCount !== undefined && (
              <Badge variant="secondary">
                {isLoadingPreview ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  t('smartRules.matchingBooks', { count: previewCount })
                )}
              </Badge>
            )}
          </div>
        </div>

        {value.rules.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t('smartRules.matchLogic')}</span>
            <Button type="button" variant="outline" size="sm" onClick={toggleLogic}>
              {value.logic === 'and' ? t('smartRules.allRules') : t('smartRules.anyRule')}
            </Button>
          </div>
        )}

        <div className="space-y-3">
          {value.rules.map((rule, index) => (
            <div key={rule.id} className="flex flex-wrap items-center gap-2">
              {index > 0 && (
                <Badge variant="outline" className="shrink-0">
                  {value.logic === 'and' ? t('smartRules.and') : t('smartRules.or')}
                </Badge>
              )}

              <Select
                value={rule.field}
                onValueChange={(v) =>
                  updateRule(rule.id, {
                    field: v,
                    operator: OPERATORS_BY_FIELD[v as RuleField]?.[0] || 'equals',
                    value: '',
                  })
                }
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RULE_FIELDS.map((f) => (
                    <SelectItem key={f} value={f}>
                      {t(`smartRules.field_${f}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {OPERATORS_BY_FIELD[rule.field as RuleField]?.length > 1 && (
                <Select
                  value={rule.operator}
                  onValueChange={(v) => updateRule(rule.id, { operator: v })}
                >
                  <SelectTrigger className="w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPERATORS_BY_FIELD[rule.field as RuleField].map((op) => (
                      <SelectItem key={op} value={op}>
                        {t(`smartRules.op_${op}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {renderValueInput(rule)}

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-destructive"
                onClick={() => removeRule(rule.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <Button type="button" variant="outline" size="sm" onClick={addRule}>
          <Plus className="mr-1 h-4 w-4" />
          {t('smartRules.addRule')}
        </Button>
      </CardContent>
    </Card>
  )
}

export const EMPTY_SMART_FILTERS: SmartFilters = {
  logic: 'and',
  rules: [createEmptyRule()],
}
