import { Card, CardContent } from '@/components/ui/card'

interface EmptyStateProps {
  icon: React.ElementType
  title: string
  description?: string
  action?: React.ReactNode
  compact?: boolean
}

export function EmptyState({ icon: Icon, title, description, action, compact }: EmptyStateProps) {
  if (compact) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Icon className="h-6 w-6 text-muted-foreground/50" />
        </div>
        <h3 className="mt-3 text-sm font-medium text-muted-foreground">{title}</h3>
        {description && (
          <p className="mt-1 max-w-xs text-xs text-muted-foreground/70">{description}</p>
        )}
        {action && <div className="mt-3">{action}</div>}
      </div>
    )
  }

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/5">
          <Icon className="h-8 w-8 text-primary/40" />
        </div>
        <h3 className="mt-5 text-lg font-semibold">{title}</h3>
        {description && (
          <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
        {action && <div className="mt-6">{action}</div>}
      </CardContent>
    </Card>
  )
}
