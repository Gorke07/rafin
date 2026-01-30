'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PageHeader } from '@/components/dashboard/page-header'
import { useToast } from '@/hooks/use-toast'
import { Download, Globe, Loader2, Lock, Monitor, Moon, Palette, Sun, User } from 'lucide-react'
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
    </div>
  )
}
