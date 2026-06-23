import { Search, X, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FilterInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  size?: 'sm' | 'default'
}

export function FilterInput({
  value,
  onChange,
  placeholder = 'Buscar...',
  className,
  size = 'default',
}: FilterInputProps) {
  return (
    <div className={cn('relative w-full sm:w-64 sm:shrink-0', className)}>
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <input
        className={cn(
          'w-full rounded-lg border border-input bg-background pl-8 pr-8 text-sm outline-none focus:ring-2 focus:ring-ring/50 placeholder:text-muted-foreground transition-shadow',
          size === 'sm' ? 'h-8' : 'h-10',
        )}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
      {value && (
        <button
          type="button"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => onChange('')}
        >
          <X className={size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
        </button>
      )}
    </div>
  )
}

interface FilterSelectProps {
  value: string
  onChange: (value: string) => void
  defaultValue?: string
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'default'
}

export function FilterSelect({
  value,
  onChange,
  defaultValue = 'all',
  children,
  className,
  size = 'default',
}: FilterSelectProps) {
  return (
    <div className={cn('relative w-full sm:w-44 sm:shrink-0', className)}>
      <select
        className={cn(
          'w-full truncate rounded-lg border border-input bg-background pl-2.5 pr-7 text-sm outline-none focus:ring-2 focus:ring-ring/50 transition-shadow appearance-none',
          size === 'sm' ? 'h-8' : 'h-10',
        )}
        value={value}
        onChange={e => onChange(e.target.value)}
      >
        {children}
      </select>
      {value !== defaultValue ? (
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => onChange(defaultValue)}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : (
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
      )}
    </div>
  )
}
