import { redirect } from 'next/navigation'

export default function Home() {
  // Root page redirects to dashboard home
  // Auth check is handled by SetupGuard
  redirect('/dashboard')
}
