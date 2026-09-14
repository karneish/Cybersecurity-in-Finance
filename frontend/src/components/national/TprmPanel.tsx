import { useEffect, useState } from 'react'
import { riskApi } from '@/api/riskApi'
import { Boxes, ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'
import type { VendorCascade, VendorRisk } from '@/types/national'
import { formatINR, formatPct } from './format'

function riskBandStyles(band: string): string {
  switch (band) {
    case 'CRITICAL':
      return 'bg-status-critical/15 text-status-critical'
    case 'HIGH':
      return 'bg-status-medium/15 text-status-medium'
    case 'MEDIUM':
      return 'bg-status-medium/10 text-status-medium'
    default:
      return 'bg-status-low/15 text-status-low'
  }
}

export default function TprmPanel() {
  const [vendors, setVendors] = useState<VendorRisk[]>([])
  const [summary, setSummary] = useState<{ vendor_count: number; total_attributable_eal_inr: number; exposed_asset_count: number } | null>(null)
  const [cascade, setCascade] = useState<VendorCascade | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [cascading, setCascading] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([riskApi.getTPRMVendors(), riskApi.getTPRMSummary()])
      .then(([venRes, sumRes]) => {
        setVendors(venRes.data)
        setSummary(sumRes.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const viewCascade = async (vendorId: string) => {
    setCascading(vendorId)
    try {
      const res = await riskApi.getTPRMCascade(vendorId)
      setCascade(res.data)
      setExpanded({})
    } catch {
      setCascade(null)
    } finally {
      setCascading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-text-tertiary">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading vendor exposure…
      </div>
    )
  }

  const toggle = (assetId: string) => setExpanded((prev) => ({ ...prev, [assetId]: !prev[assetId] }))

  return (
    <div className="cyber-card p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          <Boxes className="h-4 w-4 text-text-secondary" />
          Third-Party / Vendor Risk
        </h3>
        {summary && (
          <p className="text-xs text-text-tertiary">
            {summary.vendor_count} vendors · {summary.exposed_asset_count} exposed assets · attributable EAL{' '}
            <b className="text-status-high">{formatINR(summary.total_attributable_eal_inr)}</b>
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <div className="space-y-1.5">
            {vendors.map((v) => (
              <button
                key={v.vendor_id}
                onClick={() => viewCascade(v.vendor_id)}
                className={clsx(
                  'w-full rounded-lg border px-3 py-2.5 text-left transition-colors',
                  cascade?.vendor_id === v.vendor_id
                    ? 'border-accent-primary/40 bg-accent-primary/10'
                    : 'border-border-subtle hover:bg-bg-hover',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-text-primary">{v.name}</span>
                  <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${riskBandStyles(v.risk_band)}`}>
                    {v.risk_band}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-text-tertiary">
                  <span>{v.vendor_type} · {v.sector ?? '—'}</span>
                  <span>
                    {cascading === v.vendor_id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>P(compromise) {formatPct(v.compromise_probability * 100, 0)}</>
                    )}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-3">
          {!cascade ? (
            <div className="flex h-full min-h-[180px] items-center justify-center rounded-lg border border-dashed border-border-default text-sm text-text-tertiary">
              Select a vendor to view its cascade exposure
            </div>
          ) : (
            <div>
              <div className="mb-3 rounded-lg border border-border-subtle bg-bg-elevated p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-text-primary">{cascade.name}</span>
                  <span className="text-xs text-text-tertiary">
                    Direct exposure <b className="text-status-high">{formatINR(cascade.cascaded_eal_exposure_inr)}</b> ·{' '}
                    P(compromise) {formatPct(cascade.compromise_probability * 100, 0)} · {cascade.direct_asset_count} assets
                  </span>
                </div>
              </div>

              <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
                {cascade.assets.map((a) => {
                  const open = expanded[a.asset_id]
                  return (
                    <div key={a.asset_id} className="rounded-lg border border-border-subtle">
                      <button
                        onClick={() => toggle(a.asset_id)}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-bg-hover"
                      >
                        {open ? (
                          <ChevronDown className="h-4 w-4 flex-shrink-0 text-text-tertiary" />
                        ) : (
                          <ChevronRight className="h-4 w-4 flex-shrink-0 text-text-tertiary" />
                        )}
                        <span className="flex-1 truncate text-sm font-medium text-text-primary">{a.asset_name}</span>
                        <span className="text-xs text-text-tertiary">share {formatPct(a.risk_share * 100, 0)}</span>
                        <span className="text-sm font-medium text-status-high">{formatINR(a.attributable_eal_inr)}</span>
                      </button>
                      {open && (
                        <div className="border-t border-border-subtle bg-bg-surface px-7 py-2">
                          {a.dependents.length === 0 ? (
                            <p className="text-xs text-text-tertiary">No downstream dependents.</p>
                          ) : (
                            a.dependents.map((d) => (
                              <div key={d.asset_id} className="flex items-center justify-between py-1 text-xs">
                                <span className="text-text-primary">
                                  {'→'.repeat(Math.min(d.depth, 4))} {d.asset_name}
                                </span>
                                <span className="text-text-tertiary">
                                  {d.hop_path?.join(' → ')} · EAL {formatINR(d.expected_annual_loss)}
                                </span>
                              </div>
                            ))
                          )}
                          {a.dependents_exposed_eal_inr > 0 && (
                            <p className="mt-1 border-t border-border-subtle pt-1 text-[11px] text-text-tertiary">
                              Downstream EAL at risk: {formatINR(a.dependents_exposed_eal_inr)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}