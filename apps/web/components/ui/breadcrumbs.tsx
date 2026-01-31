import { ChevronRight, Home } from 'lucide-react'
import Link from 'next/link'
import { Fragment } from 'react'

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[]
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground">
      <Link
        href="/dashboard"
        className="flex items-center gap-1 transition-colors hover:text-foreground"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <Fragment key={item.label}>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
            {isLast || !item.href ? (
              <span className="truncate font-medium text-foreground">{item.label}</span>
            ) : (
              <Link href={item.href} className="truncate transition-colors hover:text-foreground">
                {item.label}
              </Link>
            )}
          </Fragment>
        )
      })}
    </nav>
  )
}
