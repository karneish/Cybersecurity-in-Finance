import { useState, useRef, useEffect } from 'react'
import { Bell, AlertTriangle, Info, ShieldAlert } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useNotificationStore } from '@/store/notificationStore'
import { clsx } from 'clsx'

const typeIcons: Record<string, typeof Bell> = {
  ALERT: AlertTriangle,
  WARNING: ShieldAlert,
  INFO: Info,
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { notifications, unreadCount, markAllRead, clearAll } = useNotificationStore()

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const recent = notifications.slice(0, 10)

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((p) => !p)}
        className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-lg border border-gray-200 bg-white shadow-lg z-50">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-brand-600 hover:text-brand-700">
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button onClick={clearAll} className="text-xs text-gray-500 hover:text-gray-700">
                  Clear All
                </button>
              )}
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {recent.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-gray-500">No notifications</p>
            ) : (
              recent.map((n) => {
                const Icon = typeIcons[n.type] ?? Bell
                return (
                  <div
                    key={n.id}
                    className={clsx(
                      'flex gap-3 border-b px-4 py-3 last:border-b-0',
                      !n.read && 'bg-brand-50'
                    )}
                  >
                    <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-600" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 truncate">{n.message}</p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {formatDistanceToNow(new Date(n.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                    {!n.read && (
                      <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-brand-600" />
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
