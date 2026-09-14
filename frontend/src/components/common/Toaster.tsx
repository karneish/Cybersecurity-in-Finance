import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react'
import { clsx } from 'clsx'
import { useToastStore, type ToastType } from '@/store/toastStore'

const TOAST_DURATION_MS = 4500
const MAX_VISIBLE = 5

const TYPE_STYLES: Record<ToastType, { icon: ReactNode; accent: string }> = {
  success: {
    icon: <CheckCircle2 className="h-5 w-5" />,
    accent: 'text-status-low',
  },
  info: {
    icon: <Info className="h-5 w-5" />,
    accent: 'text-status-info',
  },
  warning: {
    icon: <AlertTriangle className="h-5 w-5" />,
    accent: 'text-status-medium',
  },
  error: {
    icon: <XCircle className="h-5 w-5" />,
    accent: 'text-status-critical',
  },
}

export default function Toaster() {
  const toasts = useToastStore((s) => s.toasts)
  const dismissToast = useToastStore((s) => s.dismissToast)

  useEffect(() => {
    if (toasts.length === 0) return
    const timers = toasts.map((t) =>
      window.setTimeout(() => dismissToast(t.id), TOAST_DURATION_MS)
    )
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [toasts, dismissToast])

  if (toasts.length === 0) return null

  const visible = toasts.slice(-MAX_VISIBLE)

  return (
    <div
      className="pointer-events-none fixed right-4 top-4 z-[80] flex w-[min(92vw,22rem)] flex-col gap-2"
      aria-live="polite"
    >
      {visible.map((t) => {
        const { icon, accent } = TYPE_STYLES[t.type]
        return (
          <div
            key={t.id}
            role="status"
            className={clsx(
              'pointer-events-auto flex items-start gap-3 rounded-card border border-border-default bg-bg-surface p-3 shadow-card',
              'toast-enter'
            )}
          >
            <span className={clsx('mt-0.5 shrink-0', accent)}>{icon}</span>
            <p className="flex-1 text-sm leading-snug text-text-primary">
              {t.message}
            </p>
            <button
              onClick={() => dismissToast(t.id)}
              aria-label="Dismiss notification"
              className="shrink-0 text-text-tertiary transition-colors hover:text-text-primary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}