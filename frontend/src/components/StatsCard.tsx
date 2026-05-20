import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  iconBgClass?: string
  iconColorClass?: string
  trend?: { value: number; label: string }
  className?: string
}

export function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconBgClass = 'bg-primary/10',
  iconColorClass = 'text-primary',
  trend,
  className,
}: StatsCardProps) {
  return (
    <Card className={cn(className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className={cn('rounded-lg p-2.5 shrink-0', iconBgClass)}>
            <Icon className={cn('h-5 w-5', iconColorClass)} />
          </div>
        </div>
        {trend && (
          <p className={cn('mt-3 text-xs', trend.value >= 0 ? 'text-emerald-600' : 'text-rose-500')}>
            {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%{' '}
            <span className="text-muted-foreground">{trend.label}</span>
          </p>
        )}
      </CardContent>
    </Card>
  )
}
