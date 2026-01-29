import { useTranslations } from 'next-intl'

export default function DashboardPage() {
  const t = useTranslations('nav')

  return (
    <div>
      <h1 className="text-3xl font-bold">{t('home')}</h1>
      <p className="mt-4 text-muted-foreground">
        Welcome to Rafin - Your home library tracker
      </p>
    </div>
  )
}
