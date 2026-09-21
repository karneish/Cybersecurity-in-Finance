import { useState, useEffect } from 'react'
import { investmentApi } from '@/api/investmentApi'
import InvestmentROSIChart from '@/components/charts/InvestmentROSIChart'
import InvestmentCurveChart from '@/components/charts/InvestmentCurveChart'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import type { OptimizeResult, ROSIResult, SecurityControl } from '@/types/investment'
import { Wallet, TrendingDown, Percent, Clock, Save } from 'lucide-react'

function formatINR(value: number): string {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`
  return `₹${value.toLocaleString('en-IN')}`
}

export default function InvestmentOptimizer() {
  const [budget, setBudget] = useState(10000000)
  const [optimizing, setOptimizing] = useState(false)
  const [result, setResult] = useState<OptimizeResult | null>(null)
  const [controls, setControls] = useState<SecurityControl[]>([])
  const [rosiData, setRosiData] = useState<ROSIResult[]>([])
  const [controlsLoading, setControlsLoading] = useState(true)

  useEffect(() => {
    Promise.all([investmentApi.listControls()])
      .then(([ctrlRes]) => {
        setControls(ctrlRes.data)
      })
      .catch(() => {})
      .finally(() => setControlsLoading(false))
  }, [])

  const runOptimize = async () => {
    setOptimizing(true)
    try {
      const res = await investmentApi.optimize({ budget_inr: budget })
      setResult(res.data)

      const rosiRes = await investmentApi.getROSSummary()
      setRosiData(rosiRes.data)
    } catch {}
    setOptimizing(false)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Investment Optimizer</h1>

      <InvestmentCurveChart onBudgetSelect={(b) => setBudget(b)} />

      <div className="cyber-card p-6" data-tour="budget-config">
        <h2 className="mb-4 text-sm font-semibold text-text-primary">Budget Configuration</h2>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-text-tertiary">Security Budget (₹)</label>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              step={100000}
              className="cyber-input w-full"
            />
            <input
              type="range"
              min={1000000}
              max={50000000}
              step={500000}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="mt-2 w-full accent-accent-primary"
            />
            <div className="flex justify-between text-xs text-text-tertiary">
              <span>₹10 L</span>
              <span>₹5 Cr</span>
            </div>
          </div>
          <button
            onClick={runOptimize}
            disabled={optimizing}
            className="cyber-btn-primary"
          >
            {optimizing ? (
              <LoadingSpinner size="sm" className="border-white border-t-transparent" />
            ) : null}
            Optimize
          </button>
        </div>
      </div>

      {result && (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            <div className="cyber-card p-4">
              <div className="flex items-center gap-2 text-text-tertiary">
                <Wallet className="h-4 w-4" />
                <span className="text-xs">Total Budget</span>
              </div>
              <p className="mt-1 text-lg font-bold text-text-primary">
                {formatINR(result.total_budget)}
              </p>
            </div>
            <div className="cyber-card p-4">
              <div className="flex items-center gap-2 text-text-tertiary">
                <Wallet className="h-4 w-4 text-status-low" />
                <span className="text-xs">Allocated</span>
              </div>
              <p className="mt-1 text-lg font-bold text-status-low">
                {formatINR(result.total_allocated)}
              </p>
            </div>
            <div className="cyber-card p-4">
              <div className="flex items-center gap-2 text-text-tertiary">
                <Wallet className="h-4 w-4 text-text-tertiary" />
                <span className="text-xs">Remaining</span>
              </div>
              <p className="mt-1 text-lg font-bold text-text-secondary">
                {formatINR(result.remaining_budget)}
              </p>
            </div>
            <div className="cyber-card p-4">
              <div className="flex items-center gap-2 text-text-tertiary">
                <TrendingDown className="h-4 w-4 text-status-high" />
                <span className="text-xs">Risk Reduction</span>
              </div>
              <p className="mt-1 text-lg font-bold text-status-high">
                {formatINR(result.expected_risk_reduction)}
              </p>
            </div>
            <div className="cyber-card p-4">
              <div className="flex items-center gap-2 text-text-tertiary">
                <Percent className="h-4 w-4 text-accent-primary" />
                <span className="text-xs">ROSI</span>
              </div>
              <p className="mt-1 text-lg font-bold text-accent-primary">
                {result.portfolio_rosi.toFixed(1)}%
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <InvestmentROSIChart data={rosiData} />
            <div className="cyber-card p-6">
              <h3 className="mb-2 text-sm font-semibold text-text-primary">Optimization Summary</h3>
              <p className="text-sm text-text-secondary">{result.summary}</p>
            </div>
          </div>

          <div className="cyber-card">
            <div className="border-b border-border-subtle px-6 py-4">
              <h3 className="text-sm font-semibold text-text-primary">Allocation by Control</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border-subtle">
                <thead className="bg-bg-surface">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-tertiary">
                      Priority
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-tertiary">
                      Control
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-tertiary">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-tertiary">
                      Allocation
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-tertiary">
                      Risk Reduction
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-tertiary">
                      ROSI %
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle bg-bg-surface">
                  {(result.items ?? []).map((item) => (
                    <tr key={item.control_id} className="transition-colors hover:bg-bg-hover">
                      <td className="px-4 py-3 text-sm font-bold text-text-primary">#{item.priority}</td>
                      <td className="px-4 py-3 text-sm font-medium text-text-primary">
                        {item.control_name}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">{item.control_type}</td>
                      <td className="px-4 py-3 text-sm font-medium text-text-primary">
                        {formatINR(item.allocation_inr)}
                      </td>
                      <td className="px-4 py-3 text-sm text-status-high">
                        {formatINR(item.risk_reduction)}
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-accent-primary">
                        {item.expected_rosi.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <button className="rounded-lg border border-status-low/30 bg-status-low/10 px-4 py-2 text-sm font-semibold text-status-low hover:bg-status-low/15">
            <Save className="h-4 w-4" />
            Save as Plan
          </button>
        </>
      )}

      <div className="cyber-card" data-tour="available-controls">
        <div className="border-b border-border-subtle px-6 py-4">
          <h3 className="text-sm font-semibold text-text-primary">Available Security Controls</h3>
        </div>
        <div className="overflow-x-auto">
          {controlsLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <table className="min-w-full divide-y divide-border-subtle">
              <thead className="bg-bg-surface">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-tertiary">
                    Control
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-tertiary">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-tertiary">
                    Implementation Cost
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-tertiary">
                    Annual Maintenance
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-tertiary">
                    Max Risk Reduction
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-tertiary">
                    <Clock className="inline h-3 w-3" /> Time
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle bg-bg-surface">
                {controls.map((c) => (
                  <tr key={c.id} className="transition-colors hover:bg-bg-hover">
                    <td className="px-4 py-3 text-sm font-medium text-text-primary">{c.name}</td>
                    <td className="px-4 py-3 text-sm text-text-secondary">{c.control_type}</td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {formatINR(c.implementation_cost)}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {formatINR(c.annual_maintenance)}/yr
                    </td>
                    <td className="px-4 py-3 text-sm text-status-low">
                      {c.max_risk_reduction}%
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {c.implementation_time_days} days
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
