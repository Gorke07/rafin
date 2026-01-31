import { cn } from '@/lib/utils'
import { BookOpen } from 'lucide-react'

const GRADIENTS = [
  'from-rose-400/80 to-orange-300/80',
  'from-violet-400/80 to-purple-300/80',
  'from-blue-400/80 to-cyan-300/80',
  'from-emerald-400/80 to-teal-300/80',
  'from-amber-400/80 to-yellow-300/80',
  'from-pink-400/80 to-fuchsia-300/80',
  'from-indigo-400/80 to-blue-300/80',
  'from-teal-400/80 to-emerald-300/80',
  'from-orange-400/80 to-red-300/80',
  'from-cyan-400/80 to-sky-300/80',
]

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash |= 0
  }
  return Math.abs(hash)
}

interface BookCoverPlaceholderProps {
  title: string
  author?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function BookCoverPlaceholder({
  title,
  author,
  size = 'md',
  className,
}: BookCoverPlaceholderProps) {
  const gradientIndex = hashString(title) % GRADIENTS.length
  const gradient = GRADIENTS[gradientIndex]

  const sizeClasses = {
    sm: 'text-[9px] leading-tight',
    md: 'text-xs leading-tight',
    lg: 'text-sm leading-snug',
  }

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  }

  return (
    <div
      className={cn(
        'flex h-full w-full flex-col items-center justify-center bg-gradient-to-br p-2',
        gradient,
        className,
      )}
    >
      <BookOpen className={cn('mb-1 text-white/60', iconSizes[size])} />
      <p className={cn('line-clamp-3 text-center font-medium text-white/90', sizeClasses[size])}>
        {title}
      </p>
      {author && (
        <p
          className={cn(
            'mt-0.5 line-clamp-1 text-center text-white/60',
            size === 'sm' ? 'text-[7px]' : size === 'md' ? 'text-[10px]' : 'text-xs',
          )}
        >
          {author}
        </p>
      )}
    </div>
  )
}
