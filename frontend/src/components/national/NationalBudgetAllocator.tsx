import { useState } from 'react'
import { investmentApi } from '@/api/investmentApi'
import { Wallet, TrendingDown, Percent, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'
import type { NationalOptimizeResult } from '@/types/national'
import { formatINR } from './format'

export default function NationalBudgetAllocator() {
  const [budget, setBudget] = useState(50000000)
  const [horizon, setHorizon] = useState(3)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<NationalOptimizeResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const run = async () => {
    setRunning(true)
    setError(null)
    try {
      const res = await investmentApi.nationalOptimize({ budget_inr: budget, time_horizon_years: horizon })
      setResult(res.data)
    } catch {
      setError('National optimization failed. Ensure the investment-optimizer is running.')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="cyber-card p-6">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-text-primary">
        <Wallet className="h-4 w-4 text-status-low" />
        National Budget Allocator
      </h3>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:items-end">
        <div>
          <label className="mb-1 block text-xs text-text-tertiary">National Budget (₹)</label>
          <input
            type="number"
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            step={1000000}
            className="cyber-input w-full"
          />
          <input
            type="range"
            min={1000000}
            max={500000000}
            step={5000000}
            value={budget}
            onChange={(e) => setBudget(Number(e.target.value))}
            className="mt-2 w-full accent-accent-primary"
          />
          <div className="flex justify-between text-xs text-text-tertiary">
            <span>₹10 L</span>
            <span>₹50 Cr</span>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-text-tertiary">Horizon (years)</label>
          <select
            value={horizon}
            onChange={(e) => setHorizon(Number(e.target.value))}
            className="cyber-input w-full appearance-none bg-bg-elevated text-text-primary"
          >
            {[1, 2, 3, 5].map((y) => (
              <option key={y} value={y}>
                {y} year{y > 1 ? 's' : ''}
              </option>
            ))}
          </select>
        </div>
        <button onClick={run} disabled={running} className="cyber-btn-primary">
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingDown className="h-4 w-4" />}
          {running ? 'Optimizing…' : 'Allocate Nationally'}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-status-critical">{error}</p>}

      {result && (
        <div className="mt-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-border-subtle p-3">
              <p className="text-xs text-text-tertiary">Allocated</p>
              <p className="mt-1 text-lg font-bold text-status-low">{formatINR(result.total_allocated)}</p>
            </div>
            <div className="rounded-lg border border-border-subtle p-3">
              <p className="text-xs text-text-tertiary">Remaining</p>
              <p className="mt-1 text-lg font-bold text-text-secondary">{formatINR(result.remaining_budget)}</p>
            </div>
            <div className="rounded-lg border border-border-subtle p-3">
              <p className="text-xs text-text-tertiary">Projected EAL Reduction</p>
              <p className="mt-1 text-lg font-bold text-status-high">{formatINR(result.expected_eal_reduction)}</p>
            </div>
            <div className="rounded-lg border border-border-subtle p-3">
              <p className="text-xs text-text-tertiary">National ROSI</p>
              <p className="mt-1 flex items-center gap-1 text-lg font-bold text-accent-primary">
                <Percent className="h-4 w-4" />
                {result.portfolio_rosi.toFixed(1)}%
              </p>
            </div>
          </div>

          <p className="mt-3 text-xs text-text-tertiary">
            Residual national EAL {formatINR(result.residual_eal)} ·{' '}
            {result.selected_control_count} controls across {result.sector_count} sectors
          </p>

          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full divide-y divide-border-subtle">
              <thead className="bg-bg-surface">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-tertiary">Sector</th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-tertiary">Baseline</th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-tertiary">Allocated</th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-tertiary">Reduction</th>
                  <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-text-tertiary">Residual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle bg-bg-surface">
                {result.sectors.map((s) => (
                  <tr key={s.sector} className="transition-colors hover:bg-bg-hover">
                    <td className="px-3 py-2 text-sm font-medium text-text-primary">{s.sector}</td>
                    <td className="px-3 py-2 text-sm text-text-secondary">{formatINR(s.baseline_eal)}</td>
                    <td className="px-3 py-2 text-sm font-medium text-status-low">{formatINR(s.allocated_inr)}</td>
                    <td className="px-3 py-2 text-sm text-status-high">{formatINR(s.projected_eal_reduction)}</td>
                    <td className={clsx('px-3 py-2 text-sm', s.residual_eal > 0 ? 'text-text-primary' : 'text-text-tertiary')}>
                      {formatINR(s.residual_eal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 rounded-lg bg-bg-elevated p-3">
            <p className="text-sm text-text-secondary">{result.summary}</p>
          </div>
        </div>
      )}
    </div>
  )
}