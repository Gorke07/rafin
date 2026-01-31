'use client'

import { PageHeader } from '@/components/dashboard/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Globe,
  Loader2,
  Lock,
  Monitor,
  Moon,
  Palette,
  Sun,
  Upload,
  User,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

function SettingsCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardContent>
        <div className="mb-1 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
        {description && <p className="mb-4 ml-12 text-sm text-muted-foreground">{description}</p>}
        <div className="mt-4">{children}</div>
      </CardContent>
    </Card>
  )
}

function ProfileSection() {
  const t = useTranslations('settings')
  const { addToast } = useToast()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`${API_URL}/api/user/profile`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        setName(data.name || '')
        setEmail(data.email || '')
      })
      .catch(() => addToast(t('profileError'), 'error'))
      .finally(() => setLoading(false))
  }, [addToast, t])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`${API_URL}/api/user/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error()
      addToast(t('profileUpdated'), 'success')
    } catch {
      addToast(t('profileError'), 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">{t('name')}</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('name')}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">{t('email')}</Label>
        <Input id="email" value={email} disabled className="opacity-60" />
      </div>
      <Button onClick={handleSave} disabled={saving || name.length < 2}>
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('saving')}
          </>
        ) : (
          t('saveChanges')
        )}
      </Button>
    </div>
  )
}

function PasswordSection() {
  const t = useTranslations('settings')
  const { addToast } = useToast()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      addToast(t('passwordMismatch'), 'error')
      return
    }
    if (newPassword.length < 8) {
      addToast(t('passwordMinLength'), 'error')
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`${API_URL}/api/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'unknown')
      }

      addToast(t('passwordUpdated'), 'success')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      const isIncorrectPassword =
        err instanceof Error && err.message.toLowerCase().includes('invalid password')
      addToast(isIncorrectPassword ? t('currentPasswordIncorrect') : t('passwordError'), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="currentPassword">{t('currentPassword')}</Label>
        <Input
          id="currentPassword"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="newPassword">{t('newPassword')}</Label>
        <Input
          id="newPassword"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
        <Input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>
      <Button
        onClick={handleChangePassword}
        disabled={saving || !currentPassword || !newPassword || !confirmPassword}
      >
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('updatingPassword')}
          </>
        ) : (
          t('updatePassword')
        )}
      </Button>
    </div>
  )
}

function LanguageSection() {
  const [locale, setLocale] = useState('en')

  useEffect(() => {
    const cookie = document.cookie.split('; ').find((c) => c.startsWith('NEXT_LOCALE='))
    if (cookie) {
      setLocale(cookie.split('=')[1])
    }
  }, [])

  const handleChange = (newLocale: string) => {
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=${60 * 60 * 24 * 365}`
    setLocale(newLocale)
    window.location.reload()
  }

  return (
    <div className="space-y-2">
      <Select value={locale} onValueChange={handleChange}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="en">English</SelectItem>
          <SelectItem value="tr">Türkçe</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}

function ThemeSection() {
  const t = useTranslations('settings')
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-10 rounded-md border border-input animate-pulse bg-muted" />
        ))}
      </div>
    )
  }

  const themes = [
    { value: 'light', label: t('light'), icon: Sun },
    { value: 'dark', label: t('dark'), icon: Moon },
    { value: 'system', label: t('system'), icon: Monitor },
  ]

  return (
    <div className="grid grid-cols-3 gap-2">
      {themes.map(({ value, label, icon: Icon }) => (
        <Button
          key={value}
          variant={theme === value ? 'default' : 'outline'}
          className="flex items-center gap-2"
          onClick={() => setTheme(value)}
        >
          <Icon className="h-4 w-4" />
          {label}
        </Button>
      ))}
    </div>
  )
}

function ExportSection() {
  const t = useTranslations('settings')
  const { addToast } = useToast()
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await fetch(`${API_URL}/api/user/export`, {
        credentials: 'include',
      })
      if (!res.ok) throw new Error()

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `rafin-export-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      addToast(t('exportError'), 'error')
    } finally {
      setExporting(false)
    }
  }

  return (
    <Button variant="outline" onClick={handleExport} disabled={exporting}>
      {exporting ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('exporting')}
        </>
      ) : (
        <>
          <Download className="h-4 w-4" />
          {t('exportData')}
        </>
      )}
    </Button>
  )
}

interface ImportResult {
  total: number
  imported: number
  skipped: number
  errors: string[]
}

function ImportSection() {
  const t = useTranslations('settings')
  const { addToast } = useToast()
  const [importing, setImporting] = useState(false)
  const [enrichISBN, setEnrichISBN] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setSelectedFile(file)
    setResult(null)
  }

  const handleImport = async () => {
    if (!selectedFile) return

    setImporting(true)
    setResult(null)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('enrichWithISBN', String(enrichISBN))

      const res = await fetch(`${API_URL}/api/import/goodreads`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Import failed')
      }

      const data = await res.json()
      setResult(data.result)
      addToast(t('importSuccess', { count: data.result.imported }), 'success')
      setSelectedFile(null)
      const input = document.getElementById('csv-file') as HTMLInputElement
      if (input) input.value = ''
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Import failed'
      addToast(message, 'error')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t('importDescription')}</p>

      <div className="space-y-3">
        <div>
          <Label htmlFor="csv-file">{t('importSelectFile')}</Label>
          <Input
            id="csv-file"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            disabled={importing}
            className="mt-1"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="enrich-isbn"
            checked={enrichISBN}
            onChange={(e) => setEnrichISBN(e.target.checked)}
            disabled={importing}
            className="h-4 w-4 rounded border-input"
          />
          <Label htmlFor="enrich-isbn" className="text-sm font-normal">
            {t('importEnrichISBN')}
          </Label>
        </div>

        {enrichISBN && <p className="text-xs text-muted-foreground">{t('importEnrichWarning')}</p>}

        <Button onClick={handleImport} disabled={importing || !selectedFile}>
          {importing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('importImporting')}
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              {t('importStart')}
            </>
          )}
        </Button>
      </div>

      {result && (
        <Card>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="font-semibold">{t('importComplete')}</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">{t('importTotal')}</p>
                <p className="text-lg font-semibold">{result.total}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('importImported')}</p>
                <p className="text-lg font-semibold text-green-600">{result.imported}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('importSkipped')}</p>
                <p className="text-lg font-semibold text-amber-600">{result.skipped}</p>
              </div>
            </div>
            {result.errors.length > 0 && (
              <div className="mt-2 max-h-32 overflow-y-auto rounded-md bg-muted p-3">
                {result.errors.slice(0, 20).map((err, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <AlertCircle className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                    <span>{err}</span>
                  </div>
                ))}
                {result.errors.length > 20 && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    +{result.errors.length - 20} more...
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function SettingsPage() {
  const t = useTranslations('settings')

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title={t('title')} />

      <SettingsCard icon={User} title={t('profile')}>
        <ProfileSection />
      </SettingsCard>

      <SettingsCard icon={Lock} title={t('changePassword')}>
        <PasswordSection />
      </SettingsCard>

      <div className="grid gap-6 sm:grid-cols-2">
        <SettingsCard icon={Globe} title={t('language')} description={t('languageDescription')}>
          <LanguageSection />
        </SettingsCard>

        <SettingsCard icon={Palette} title={t('theme')} description={t('themeDescription')}>
          <ThemeSection />
        </SettingsCard>
      </div>

      <SettingsCard
        icon={Download}
        title={t('dataExport')}
        description={t('dataExportDescription')}
      >
        <ExportSection />
      </SettingsCard>

      <SettingsCard icon={Upload} title={t('dataImport')} description={t('dataImportDescription')}>
        <ImportSection />
      </SettingsCard>
    </div>
  )
}
