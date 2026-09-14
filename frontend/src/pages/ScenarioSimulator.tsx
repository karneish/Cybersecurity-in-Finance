import { useState, useEffect } from 'react'
import { riskApi } from '@/api/riskApi'
import { vulnerabilityApi } from '@/api/vulnerabilityApi'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { Play, Plus, X, Zap, ArrowRight, CheckCircle2 } from 'lucide-react'
import type { ScenarioResult, ScenarioAssetChange } from '@/types/risk'
import type { Vulnerability } from '@/types/vulnerability'

const CONTROL_TYPES = [
  { value: 'MFA', label: 'Multi-Factor Authentication' },
  { value: 'EDR', label: 'Endpoint Detection & Response' },
  { value: 'PATCH', label: 'Patch Management' },
  { value: 'FW', label: 'Firewall Rules' },
  { value: 'WAF', label: 'Web Application Firewall' },
  { value: 'DLP', label: 'Data Loss Prevention' },
  { value: 'SIEM', label: 'SIEM Monitoring' },
  { value: 'BACKUP', label: 'Backup & Recovery' },
]

interface AppliedChange {
  id: string
  type: 'control' | 'remediation'
  label: string
  detail: string
  effectiveness?: number
  vulnId?: string
}

function formatINR(value: number): string {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`
  return `₹${value.toLocaleString('en-IN')}`
}

export default function ScenarioSimulator() {
  const [currentEal, setCurrentEal] = useState(0)
  const [currentScore, setCurrentScore] = useState(0)
  const [topRisks, setTopRisks] = useState<{ name: string; score: number; eal: number }[]>([])
  const [openVulns, setOpenVulns] = useState<Vulnerability[]>([])
  const [changes, setChanges] = useState<AppliedChange[]>([])
  const [selectedControl, setSelectedControl] = useState('')
  const [effectiveness, setEffectiveness] = useState(50)
  const [selectedVuln, setSelectedVuln] = useState('')
  const [simulating, setSimulating] = useState(false)
  const [result, setResult] = useState<ScenarioResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([riskApi.getEAL(), riskApi.getScore(), vulnerabilityApi.list({ status: 'OPEN', size: 50 })])
      .then(([ealRes, scoreRes, vulnRes]) => {
        setCurrentEal(ealRes.data.total_eal)
        setCurrentScore(scoreRes.data.enterprise_risk_score)
        setTopRisks(
          (scoreRes.data.top_risk_drivers ?? []).slice(0, 5).map((d) => ({
            name: d.asset_name,
            score: d.risk_score,
            eal: d.expected_annual_loss,
          }))
        )
        setOpenVulns(vulnRes.data.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const addControl = () => {
    if (!selectedControl) return
    const ctrl = CONTROL_TYPES.find((c) => c.value === selectedControl)
    if (!ctrl) return
    setChanges((prev) => [
      ...prev,
      {
        id: `ctrl-${Date.now()}`,
        type: 'control',
        label: ctrl.label,
        detail: `Effectiveness: ${effectiveness}%`,
        effectiveness,
      },
    ])
    setSelectedControl('')
  }

  const addRemediation = () => {
    if (!selectedVuln) return
    const vuln = openVulns.find((v) => v.id === selectedVuln)
    if (!vuln) return
    setChanges((prev) => [
      ...prev,
      {
        id: `vuln-${Date.now()}`,
        type: 'remediation',
        label: `Remediate ${vuln.cve_id ?? vuln.title}`,
        detail: `CVSS: ${vuln.cvss_score}`,
        vulnId: vuln.id,
      },
    ])
    setSelectedVuln('')
  }

  const removeChange = (id: string) => {
    setChanges((prev) => prev.filter((c) => c.id !== id))
  }

  const runSimulation = async () => {
    setSimulating(true)
    try {
      const apiChanges = changes.map((c) => {
        if (c.type === 'control') {
          return { type: 'add_control', control_type: c.label, effectiveness: c.effectiveness }
        }
        return { type: 'remediate_vuln', vuln_id: c.vulnId }
      })
      const res = await riskApi.simulateScenario(apiChanges)
      setResult(res.data)
    } catch {}
    setSimulating(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Scenario Simulator</h1>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="cyber-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-text-primary">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-status-info/15 text-xs font-bold text-status-info">
              1
            </div>
            Current State
          </h2>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-text-tertiary">Enterprise Risk Score</p>
              <p className="text-3xl font-bold text-text-primary">{currentScore.toFixed(1)}</p>
            </div>
            <div>
              <p className="text-xs text-text-tertiary">Expected Annual Loss</p>
              <p className="text-2xl font-bold text-status-high">{formatINR(currentEal)}</p>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium text-text-secondary">Top Risks</p>
              <div className="space-y-2">
                {topRisks.map((r) => (
                  <div key={r.name} className="flex items-center justify-between rounded-lg bg-bg-elevated p-2">
                    <span className="text-xs text-text-secondary">{r.name}</span>
                    <span className="text-xs font-bold text-text-primary">{r.score.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="cyber-card p-6">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-text-primary">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent-primary/15 text-xs font-bold text-accent-primary">
                2
              </div>
              Build Changes
            </h2>

            <div className="space-y-3">
              <div className="rounded-lg border border-border-subtle p-3">
                <p className="mb-2 text-xs font-medium text-text-secondary">Add Security Control</p>
                <div className="flex gap-2">
                  <select
                    value={selectedControl}
                    onChange={(e) => setSelectedControl(e.target.value)}
                    className="flex-1 rounded-lg border border-border-default bg-bg-input px-2 py-1.5 text-sm text-text-primary"
                  >
                    <option value="">Select control...</option>
                    {CONTROL_TYPES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedControl && (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-text-tertiary">
                      <span>Effectiveness</span>
                      <span>{effectiveness}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="95"
                      value={effectiveness}
                      onChange={(e) => setEffectiveness(Number(e.target.value))}
                      className="mt-1 w-full accent-accent-primary"
                    />
                  </div>
                )}
                <button
                  onClick={addControl}
                  disabled={!selectedControl}
                  className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg bg-accent-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-primary/90 disabled:opacity-50"
                >
                  <Plus className="h-3 w-3" />
                  Add Control
                </button>
              </div>

              <div className="rounded-lg border border-border-subtle p-3">
                <p className="mb-2 text-xs font-medium text-text-secondary">Remediate Vulnerability</p>
                <div className="flex gap-2">
                  <select
                    value={selectedVuln}
                    onChange={(e) => setSelectedVuln(e.target.value)}
                    className="flex-1 rounded-lg border border-border-default bg-bg-input px-2 py-1.5 text-sm text-text-primary"
                  >
                    <option value="">Select vulnerability...</option>
                    {openVulns.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.cve_id ?? v.title} (CVSS {v.cvss_score})
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={addRemediation}
                  disabled={!selectedVuln}
                  className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg bg-status-high px-3 py-1.5 text-xs font-medium text-white hover:bg-status-high/90 disabled:opacity-50"
                >
                  <Plus className="h-3 w-3" />
                  Add Remediation
                </button>
              </div>
            </div>

            {changes.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium text-text-secondary">Applied Changes ({changes.length})</p>
                <div className="space-y-1">
                  {changes.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between rounded-lg bg-accent-primary/10 px-3 py-2"
                    >
                      <div>
                        <p className="text-xs font-medium text-text-primary">{c.label}</p>
                        <p className="text-xs text-text-tertiary">{c.detail}</p>
                      </div>
                      <button
                        onClick={() => removeChange(c.id)}
                        className="rounded p-0.5 text-text-tertiary hover:text-status-critical"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={runSimulation}
              disabled={changes.length === 0 || simulating}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-status-low px-4 py-2.5 text-sm font-semibold text-white hover:bg-status-low/90 disabled:opacity-50"
            >
              {simulating ? (
                <LoadingSpinner size="sm" className="border-white border-t-transparent" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Run Simulation
            </button>
          </div>
        </div>

        <div className="cyber-card p-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-text-primary">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-status-low/15 text-xs font-bold text-status-low">
              3
            </div>
            Simulated State
          </h2>

          {result ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-status-low/10 p-4">
                <div className="flex items-center gap-2 text-status-low">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="text-sm font-semibold">Simulation Complete</span>
                </div>
                <p className="mt-2 text-xs text-status-low/80">{result.summary}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-text-tertiary">New Risk Score</p>
                  <p className="text-2xl font-bold text-text-primary">
                    {result.simulated_risk_score.toFixed(1)}
                  </p>
                  <p className="text-xs text-status-low">
                    {result.risk_score_change.toFixed(1)} change
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-tertiary">New EAL</p>
                  <p className="text-2xl font-bold text-status-high">
                    {formatINR(result.simulated_eal)}
                  </p>
                  <p className="text-xs text-status-low">
                    {result.eal_reduction_percent.toFixed(1)}% reduction
                  </p>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium text-text-secondary">Per-Asset Changes</p>
                <div className="max-h-60 space-y-2 overflow-y-auto">
                  {(result.asset_changes ?? []).map((c: ScenarioAssetChange) => (
                    <div
                      key={c.asset_id}
                      className="rounded-lg border border-border-subtle p-2"
                    >
                      <p className="text-xs font-medium text-text-primary">{c.asset_name}</p>
                      <p className="text-xs text-text-tertiary">
                        Score: {c.original_risk_score.toFixed(1)} → {c.simulated_risk_score.toFixed(1)} ·
                        EAL: {formatINR(c.original_eal)} → {formatINR(c.simulated_eal)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <button className="rounded-lg border border-accent-primary/30 bg-accent-primary/10 px-4 py-2 text-sm font-semibold text-accent-primary hover:bg-accent-primary/15">
                <Zap className="h-4 w-4" />
                Apply to Plan
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ArrowRight className="mb-3 h-8 w-8 text-text-tertiary" />
              <p className="text-sm text-text-tertiary">
                Add changes and run simulation to see results
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
