import { useTranslations } from 'next-intl'
import Link from 'next/link'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const t = useTranslations('nav')

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r bg-card p-4">
        <h1 className="mb-8 text-2xl font-bold">Rafin</h1>
        <nav className="space-y-2">
          <Link
            href="/"
            className="block rounded-md px-3 py-2 hover:bg-accent"
          >
            {t('home')}
          </Link>
          <Link
            href="/books"
            className="block rounded-md px-3 py-2 hover:bg-accent"
          >
            {t('books')}
          </Link>
          <Link
            href="/locations"
            className="block rounded-md px-3 py-2 hover:bg-accent"
          >
            {t('locations')}
          </Link>
          <Link
            href="/reading"
            className="block rounded-md px-3 py-2 hover:bg-accent"
          >
            {t('reading')}
          </Link>
          <Link
            href="/settings"
            className="block rounded-md px-3 py-2 hover:bg-accent"
          >
            {t('settings')}
          </Link>
        </nav>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  )
}
