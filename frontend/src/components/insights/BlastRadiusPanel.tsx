import { useEffect, useState } from 'react'
import { riskApi } from '@/api/riskApi'
import { assetApi } from '@/api/assetApi'
import { useNotificationStore } from '@/store/notificationStore'
import { Activity, Loader2 } from 'lucide-react'
import type { Asset } from '@/types/asset'
import type { BlastRadiusResult } from '@/types/riskInsights'

function formatINR(value: number): string {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`
  return `₹${value.toLocaleString('en-IN')}`
}

export default function BlastRadiusPanel() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [assetId, setAssetId] = useState('')
  const [radius, setRadius] = useState<BlastRadiusResult | null>(null)
  const [loading, setLoading] = useState(false)
  const notify = useNotificationStore()

  useEffect(() => {
    assetApi.list({ size: 100 }).then((res) => setAssets(res.data.data)).catch(() => {})
  }, [])

  const load = async (id: string) => {
    if (!id) return
    setAssetId(id)
    setLoading(true)
    try {
      const res = await riskApi.getBlastRadius(id)
      setRadius(res.data)
    } catch {
      notify.addNotification('error', 'Blast radius failed — run dependencies seed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="cyber-card p-6">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-text-primary">
        <Activity className="h-4 w-4 text-status-high" />
        Dependency Blast Radius
      </h3>

      <select
        value={assetId}
        onChange={(e) => load(e.target.value)}
        className="mb-4 w-full cyber-input"
      >
        <option value="">Select an asset to trace... (max depth 4)</option>
        {assets.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name} ({a.asset_type})
          </option>
        ))}
      </select>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-text-tertiary">
          <Loader2 className="h-4 w-4 animate-spin" /> Tracing dependency graph...
        </div>
      )}

      {!loading && radius && (
        <div>
          <div className="mb-3 rounded-lg bg-accent-primary/10 p-3 text-xs text-accent-primary">
            {radius.impacted_asset_count} dependent assets ·{' '}
            {formatINR(radius.exposed_eal_inr)} EAL exposed ·{' '}
            {formatINR(radius.exposed_asset_value_inr)} asset value in blast radius
          </div>
          <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
            {(radius.impacted_nodes ?? []).map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-lg border border-border-subtle px-3 py-1.5"
              >
                <div>
                  <p className="text-xs font-medium text-text-primary">{a.name}</p>
                  <p className="text-[11px] text-text-tertiary">
                    {a.asset_type} · hop {a.depth} · {a.criticality}
                  </p>
                </div>
              </div>
            ))}
            {(radius.impacted_nodes ?? []).length === 0 && (
              <p className="py-4 text-center text-xs text-text-tertiary">No dependent assets found.</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
