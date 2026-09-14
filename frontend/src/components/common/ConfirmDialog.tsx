import { useEffect, useRef } from 'react'
import { AlertTriangle } from 'lucide-react'
import { clsx } from 'clsx'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  onConfirm: () => void
  onCancel: () => void
  confirmLabel?: string
  destructive?: boolean
}

export default function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirm',
  destructive = false,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    if (open) document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/60" onClick={onCancel} />
      <div
        ref={dialogRef}
        className="relative mx-4 w-full max-w-md rounded-modal border border-border-default bg-bg-surface p-6 text-text-primary shadow-modal"
      >
        <div className="flex items-start gap-4">
          <div
            className={clsx(
              'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full',
              destructive ? 'bg-status-critical/15' : 'bg-accent-primary/15'
            )}
          >
            <AlertTriangle
              className={clsx('h-5 w-5', destructive ? 'text-status-critical' : 'text-accent-primary')}
            />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
            <p className="mt-2 text-sm text-text-secondary">{message}</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="h-9 rounded-button border border-border-default bg-bg-elevated px-4 text-[13px] font-medium text-text-primary hover:bg-bg-hover"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={clsx(
              'h-9 rounded-button px-4 text-[13px] font-medium text-white',
              destructive
                ? 'bg-status-critical hover:bg-status-critical/90'
                : 'bg-brand-600 hover:bg-brand-500'
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}