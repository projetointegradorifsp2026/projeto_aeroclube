import { useState, useRef, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SearchSelectOption {
  value: string
  label: string
}

interface SearchSelectProps {
  options: SearchSelectOption[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  hasError?: boolean
  emptyMessage?: string
}

export function SearchSelect({
  options,
  value,
  onChange,
  placeholder = 'Selecione...',
  disabled = false,
  hasError = false,
  emptyMessage = 'Nenhum item encontrado',
}: SearchSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [dropdownStyle, setDropdownStyle] = useState<{ top: number; left: number; width: number } | null>(null)

  const selected = options.find(o => o.value === value)

  const filtered = useMemo(() => {
    if (!query) return options
    const q = query.toLowerCase()
    return options.filter(o => o.label.toLowerCase().includes(q))
  }, [options, query])

  useEffect(() => {
    if (open && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect()
      setDropdownStyle({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      })
    }
  }, [open])

  function handleFocus() {
    setQuery('')
  }

  function handleBlur() {
    setTimeout(() => {
      setOpen(false)
      setQuery('')
    }, 150)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setQuery(val)
    setOpen(val.length > 0)
  }

  function handleSelect(val: string) {
    onChange(val)
    setOpen(false)
    setQuery('')
  }

  function handleClear(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    onChange('')
    setQuery('')
    inputRef.current?.focus()
  }

  const displayValue = open ? query : (selected?.label ?? '')

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          autoComplete="off"
          spellCheck={false}
          placeholder={open ? 'Digite para buscar...' : placeholder}
          value={displayValue}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onChange={handleInputChange}
          className={cn(
            'h-10 w-full rounded-lg border border-input bg-background px-2.5 pr-8 text-sm',
            'outline-none transition-shadow',
            'focus:ring-2 focus:ring-ring/50',
            hasError && 'border-destructive ring-2 ring-destructive/20',
            disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
            !selected && !open && 'text-muted-foreground',
          )}
        />
        <div className="absolute right-0 top-0 h-10 flex items-center pr-2.5 gap-0.5 pointer-events-none">
          {selected && !open && (
            <button
              type="button"
              tabIndex={-1}
              onMouseDown={handleClear}
              className="pointer-events-auto text-muted-foreground hover:text-foreground p-0.5 rounded"
            >
              <X className="h-3 w-3" />
            </button>
          )}
          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform duration-150',
              open && 'rotate-180',
            )}
          />
        </div>
      </div>

      {open && dropdownStyle && createPortal(
        <div
          style={{
            position: 'fixed',
            top: dropdownStyle.top,
            left: dropdownStyle.left,
            width: dropdownStyle.width,
            zIndex: 9999,
          }}
          className="rounded-lg border border-border bg-popover shadow-md overflow-hidden"
        >
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-5 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </div>
            ) : (
              filtered.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onMouseDown={e => {
                    e.preventDefault()
                    handleSelect(opt.value)
                  }}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-sm text-left',
                    'hover:bg-muted/50 active:bg-muted transition-colors',
                    opt.value === value && 'bg-primary/5 text-primary font-medium',
                  )}
                >
                  <Check
                    className={cn(
                      'h-3.5 w-3.5 shrink-0',
                      opt.value === value ? 'opacity-100' : 'opacity-0',
                    )}
                  />
                  {opt.label}
                </button>
              ))
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  )
}
