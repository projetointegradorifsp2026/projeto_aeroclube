import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { CheckCircle2, AlertCircle, X } from 'lucide-react'

import { Alert, AlertTitle } from '@/components/ui/alert'
import { parseDRFError } from '@/lib/feedback'
import { cn } from '@/lib/utils'

type AlertVariant = 'success' | 'destructive'

interface AlertState {
  id: number
  variant: AlertVariant
  message: string
}

interface AlertApi {
  /** Mostra um alerta verde de sucesso. */
  success: (message: string) => void
  /** Mostra um alerta vermelho de erro (aceita Error/JSON do backend ou string). */
  error: (err: unknown, fallback?: string) => void
  /** Forma genérica. */
  show: (variant: AlertVariant, message: string) => void
}

const AlertContext = createContext<AlertApi | null>(null)

const AUTO_DISMISS_MS = 5000

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alert, setAlert] = useState<AlertState | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const dismiss = useCallback(() => {
    clearTimer()
    setAlert(null)
  }, [clearTimer])

  const show = useCallback(
    (variant: AlertVariant, message: string) => {
      clearTimer()
      setAlert({ id: Date.now(), variant, message })
      timerRef.current = setTimeout(() => setAlert(null), AUTO_DISMISS_MS)
    },
    [clearTimer],
  )

  const api = useMemo<AlertApi>(
    () => ({
      show,
      success: (message: string) => show('success', message),
      error: (err: unknown, fallback?: string) => show('destructive', parseDRFError(err, fallback)),
    }),
    [show],
  )

  useEffect(() => clearTimer, [clearTimer])

  return (
    <AlertContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed right-6 top-20 z-[100] w-full max-w-sm px-4 sm:px-0">
        {alert && (
          <Alert
            key={alert.id}
            variant={alert.variant}
            className="pointer-events-auto animate-in fade-in slide-in-from-top-2 pr-9 shadow-lg duration-200"
          >
            {alert.variant === 'success' ? <CheckCircle2 /> : <AlertCircle />}
            <AlertTitle className="line-clamp-none">{alert.message}</AlertTitle>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Fechar"
              className={cn(
                'absolute right-2 top-2 rounded-md p-1 opacity-70 transition-opacity hover:opacity-100',
              )}
            >
              <X className="size-4" />
            </button>
          </Alert>
        )}
      </div>
    </AlertContext.Provider>
  )
}

export function useAlert(): AlertApi {
  const ctx = useContext(AlertContext)
  if (!ctx) {
    throw new Error('useAlert deve ser usado dentro de <AlertProvider>')
  }
  return ctx
}
