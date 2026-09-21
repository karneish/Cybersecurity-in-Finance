import { useEffect, useState } from 'react'
import { riskApi } from '@/api/riskApi'
import { Target, Play, Loader2, History, RefreshCw } from 'lucide-react'
import { clsx } from 'clsx'
import type { ExerciseHistory, ExerciseRun, VendorRisk } from '@/types/national'
import { formatINR, formatPct } from './format'

const SCENARIOS = ['WORM', 'RANSOMWARE', 'SUPPLY_CHAIN', 'DDOS']
const SCOPES = ['NATIONAL', 'SECTOR', 'REGION', 'AGENCY', 'VENDOR']

export default function DrillPanel() {
  const [scenarioKey, setScenarioKey] = useState('RANSOMWARE')
  const [impactScope, setImpactScope] = useState('SECTOR')
  const [sector, setSector] = useState('BANKING')
  const [region, setRegion] = useState('WEST')
  const [vendorId, setVendorId] = useState('')
  const [sectors, setSectors] = useState<string[]>([])
  const [regions, setRegions] = useState<string[]>([])
  const [vendors, setVendors] = useState<VendorRisk[]>([])
  const [running, setRunning] = useState(false)
  const [rerunningId, setRerunningId] = useState<string | null>(null)
  const [result, setResult] = useState<ExerciseRun | null>(null)
  const [history, setHistory] = useState<ExerciseHistory[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)

  const loadLookups = async () => {
    try {
      const [secRes, regRes, venRes] = await Promise.all([
        riskApi.getNationalSectors(),
        riskApi.getNationalRegions(),
        riskApi.getTPRMVendors(),
      ])
      setSectors(secRes.data.map((s) => s.sector))
      setRegions(regRes.data.regions)
      setVendors(venRes.data)
      if (venRes.data.length > 0) setVendorId(venRes.data[0].vendor_id)
    } catch {
      setSectors(['BANKING', 'TELECOM', 'HEALTH'])
      setRegions(['NORTH', 'SOUTH', 'EAST', 'WEST', 'CENTRAL'])
    }
  }

  const loadHistory = async () => {
    try {
      const res = await riskApi.getExercises()
      setHistory(res.data)
    } catch {
      setHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    loadLookups()
    loadHistory()
  }, [])

  const runDrill = async () => {
    setRunning(true)
    setResult(null)
    try {
      const resp = await riskApi.runExercise({
        name: `National Drill - ${scenarioKey} (${impactScope === 'SECTOR' ? sector : impactScope})`,
        scenario_key: scenarioKey,
        impact_scope: impactScope,
        sector: impactScope === 'SECTOR' ? sector : undefined,
        region: impactScope === 'REGION' ? region : undefined,
        vendor_id: impactScope === 'VENDOR' ? vendorId : undefined,
      })
      setResult(resp.data)
      loadHistory()
    } catch {
      setResult(null)
    } finally {
      setRunning(false)
    }
  }

  const rerunDrill = async (id: string) => {
    setRerunningId(id)
    try {
      const resp = await riskApi.rerunExercise(id)
      setResult(resp.data)
      loadHistory()
    } catch {
      setResult(null)
    } finally {
      setRerunningId(null)
    }
  }

  const selectCls =
    'cyber-input w-full appearance-none bg-bg-elevated text-text-primary'

  return (
    <div className="cyber-card p-6" data-tour="cyber-drill">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-text-primary">
        <Target className="h-4 w-4 text-accent-primary" />
        National Cyber Exercise
      </h3>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs text-text-tertiary">Scenario</label>
          <select
            value={scenarioKey}
            onChange={(e) => setScenarioKey(e.target.value)}
            className={selectCls}
          >
            {SCENARIOS.map((s) => (
              <option key={s} value={s}>
                {s.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-text-tertiary">Scope</label>
          <select
            value={impactScope}
            onChange={(e) => setImpactScope(e.target.value)}
            className={selectCls}
          >
            {SCOPES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        {impactScope === 'SECTOR' && (
          <div>
            <label className="mb-1 block text-xs text-text-tertiary">Sector</label>
            <select value={sector} onChange={(e) => setSector(e.target.value)} className={selectCls}>
              {sectors.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        )}
        {impactScope === 'REGION' && (
          <div>
            <label className="mb-1 block text-xs text-text-tertiary">Region</label>
            <select value={region} onChange={(e) => setRegion(e.target.value)} className={selectCls}>
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        )}
        {impactScope === 'VENDOR' && (
          <div>
            <label className="mb-1 block text-xs text-text-tertiary">Vendor</label>
            <select value={vendorId} onChange={(e) => setVendorId(e.target.value)} className={selectCls}>
              {vendors.map((v) => (
                <option key={v.vendor_id} value={v.vendor_id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <button
        onClick={runDrill}
        disabled={running}
        className="cyber-btn-primary mt-4"
      >
        {running ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Play className="h-4 w-4" />
        )}
        {running ? 'Simulating…' : 'Run Drill'}
      </button>

      {result && (
        <div className="mt-4 rounded-lg border border-accent-primary/30 bg-accent-primary/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-primary">{result.name}</p>
              <p className="text-xs text-text-tertiary">
                {result.scenario_key} · {result.impact_scope} · {result.assets_in_scope} assets in scope ·{' '}
                {result.status}
              </p>
            </div>
            <div className="flex gap-6 text-sm">
              <span className="text-text-tertiary">
                Baseline <b className="block text-text-primary">{formatINR(result.baseline_eal)}</b>
              </span>
              <span className="text-text-tertiary">
                Simulated <b className="block text-status-critical">{formatINR(result.simulated_eal)}</b>
              </span>
              <span className="text-text-tertiary">
                Surge{' '}
                <b className={clsx('block', result.projected_surge > 0 ? 'text-status-critical' : 'text-status-low')}>
                  {formatINR(result.projected_surge)} ({formatPct(result.projected_surge_percent, 0)})
                </b>
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="mt-5">
        <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
          <History className="h-3.5 w-3.5" /> Drill History
        </h4>
        {historyLoading ? (
          <div className="flex items-center justify-center py-6 text-sm text-text-tertiary">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
            {history.length === 0 && (
              <p className="py-3 text-center text-xs text-text-tertiary">No drills executed yet.</p>
            )}
            {history.map((h) => (
              <div
                key={h.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border-subtle px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-text-primary">{h.name}</p>
                  <p className="text-[10px] text-text-tertiary">
                    {h.executed_at ? new Date(h.executed_at).toLocaleString() : '—'}
                  </p>
                </div>
                <span className="flex items-center gap-3 text-xs text-text-secondary">
                  <span>{h.scenario_key}</span>
                  <span>
                    {formatINR(h.baseline_eal)} →{' '}
                    <b className={h.eal_reduction > 0 ? 'text-status-critical' : 'text-status-low'}>
                      {formatINR(h.simulated_eal)}
                    </b>
                  </span>
                  <span
                    className={clsx(
                      'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                      h.eal_reduction > 0
                        ? 'bg-status-critical/10 text-status-critical'
                        : 'bg-status-low/10 text-status-low',
                    )}
                  >
                    {formatPct(h.eal_reduction_percent, 0)}
                  </span>
                  <button
                    onClick={() => rerunDrill(h.id)}
                    disabled={rerunningId === h.id}
                    title="Rerun this drill as regulator"
                    className="flex items-center gap-1 rounded-md border border-border-subtle px-2 py-1 text-[10px] font-medium text-text-secondary transition hover:border-accent-primary/40 hover:text-accent-primary disabled:opacity-50"
                  >
                    {rerunningId === h.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3" />
                    )}
                    Rerun
                  </button>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}