import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface TablePaginationProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

export function TablePagination({ page, totalPages, onPageChange, className }: TablePaginationProps) {
  if (totalPages <= 1) return null

  return (
    <div className={cn('flex items-center justify-center gap-1 px-4 py-3 border-t border-border', className)}>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      {getPageNumbers(page, totalPages).map((p, i) =>
        p === null ? (
          <span key={`e${i}`} className="px-1 text-muted-foreground text-sm select-none">…</span>
        ) : (
          <Button
            key={p}
            variant={p === page ? 'default' : 'ghost'}
            size="icon-sm"
            onClick={() => onPageChange(p)}
          >
            {p}
          </Button>
        ),
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}

function getPageNumbers(current: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, null, total]
  if (current >= total - 3) return [1, null, total - 4, total - 3, total - 2, total - 1, total]
  return [1, null, current - 1, current, current + 1, null, total]
}
