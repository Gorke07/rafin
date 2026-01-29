import { useTranslations } from 'next-intl'
import Link from 'next/link'

export default function LoginPage() {
  const t = useTranslations('auth')

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold">Rafin</h1>
          <p className="mt-2 text-muted-foreground">{t('login')}</p>
        </div>
        <form className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              {t('email')}
            </label>
            <input
              id="email"
              type="email"
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              {t('password')}
            </label>
            <input
              id="password"
              type="password"
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-primary py-2 text-primary-foreground hover:bg-primary/90"
          >
            {t('login')}
          </button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          {t('noAccount')}{' '}
          <Link href="/register" className="text-primary hover:underline">
            {t('register')}
          </Link>
        </p>
      </div>
    </div>
  )
}
