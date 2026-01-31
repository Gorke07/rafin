const STORAGE_KEY = 'recently-viewed-books'
const MAX_ITEMS = 10

export interface RecentlyViewedBook {
  id: number
  title: string
  coverPath?: string | null
  coverUrl?: string | null
}

export function getRecentlyViewed(): RecentlyViewedBook[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export function addRecentlyViewed(book: RecentlyViewedBook): void {
  if (typeof window === 'undefined') return
  try {
    const current = getRecentlyViewed()
    const filtered = current.filter((b) => b.id !== book.id)
    const updated = [book, ...filtered].slice(0, MAX_ITEMS)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch {}
}
