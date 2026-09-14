import { useEffect, useState } from 'react'
import { vulnerabilityApi } from '@/api/vulnerabilityApi'
import { AlertCircle } from 'lucide-react'
import { SEVERITY_HEX } from '@/theme/severity'

interface EventItem {
  id: string
  event_type: string
  source: string
  asset_name?: string
  created_at: string
  details: Record<string, unknown>
}

export default function RecentEventsFeed() {
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    vulnerabilityApi
      .list({ page: 1, size: 5 })
      .then((res) => {
        const mapped: EventItem[] = res.data.data.map((v) => ({
          id: v.id,
          event_type: v.severity,
          source: v.source ?? 'unknown',
          asset_name: v.affected_asset ?? undefined,
          created_at: v.created_at,
          details: {},
        }))
        setEvents(mapped)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="cyber-card p-6">
      <div className="mb-4 flex items-center gap-2">
        <AlertCircle className="h-5 w-5 text-accent-primary" strokeWidth={1.75} />
        <h3 className="text-sm font-semibold text-text-primary">Recent Events</h3>
      </div>
      {loading ? (
        <div className="py-8 text-center text-sm text-text-tertiary">Loading...</div>
      ) : events.length === 0 ? (
        <div className="py-8 text-center text-sm text-text-tertiary">No recent events</div>
      ) : (
        <div className="space-y-2">
          {events.map((e) => (
            <div
              key={e.id}
              className="flex items-start gap-3 rounded-lg border border-transparent px-2 py-2 transition-colors hover:bg-bg-hover hover:border-border-default"
            >
              <div
                className="mt-1 h-2 w-2 flex-shrink-0 rounded-full"
                style={{ backgroundColor: SEVERITY_HEX[e.event_type] ?? '#475569' }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] text-text-primary">
                  <span className="font-medium">{e.event_type}</span>
                  {e.asset_name && (
                    <span className="text-text-tertiary"> on {e.asset_name}</span>
                  )}
                </p>
                <p className="text-xs text-text-tertiary">
                  {e.source} · {new Date(e.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}