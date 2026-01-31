import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import Link from 'next/link'

interface StatCardProps {
  label: string
  value: number | string
  icon: React.ElementType
  href: string
  isLoading?: boolean
}

export function StatCard({ label, value, icon: Icon, href, isLoading }: StatCardProps) {
  return (
    <Link href={href}>
      <Card className="transition-colors hover:bg-accent/50">
        <CardContent className="flex items-center gap-4 py-0">
          <div className="rounded-lg bg-muted p-2.5">
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            {isLoading ? (
              <Skeleton className="mb-1 h-7 w-12" />
            ) : (
              <p className="text-2xl font-bold">{value}</p>
            )}
            <p className="truncate text-sm text-muted-foreground">{label}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-0">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div>
          <Skeleton className="mb-1 h-7 w-12" />
          <Skeleton className="h-4 w-20" />
        </div>
      </CardContent>
    </Card>
  )
}
