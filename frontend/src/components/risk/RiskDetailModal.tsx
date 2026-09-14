import { useEffect, useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import { riskApi } from '@/api/riskApi'
import { clsx } from 'clsx'
import type { RiskCalculation } from '@/types/risk'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { scoreTextColor, scoreRingColor } from '@/theme/severity'

interface RiskDetailModalProps {
  open: boolean
  assetId: string | null
  onClose: () => void
}

function formatINR(value: number): string {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`
  return `₹${value.toLocaleString('en-IN')}`
}

export default function RiskDetailModal({ open, assetId, onClose }: RiskDetailModalProps) {
  const [data, setData] = useState<RiskCalculation | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !assetId) return
    setLoading(true)
    setError(null)
    riskApi
      .getAssetRisk(assetId)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.detail || 'Failed to load risk data'))
      .finally(() => setLoading(false))
  }, [open, assetId])

  if (!open) return null

  const circumference = 2 * Math.PI * 54
  const dashOffset = data ? circumference - (data.risk_score / 100) * circumference : circumference

  const riskFactors = data?.risk_factors
    ? Object.entries(data.risk_factors as Record<string, unknown>)
    : []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/60" onClick={onClose} />
      <div className="relative mx-4 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-modal border border-border-default bg-bg-surface shadow-modal">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border-subtle bg-bg-surface px-6 py-4">
          <h2 className="text-lg font-bold text-text-primary">Risk Assessment</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-button text-text-tertiary hover:bg-bg-hover hover:text-text-primary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {loading && (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-status-critical/40 bg-status-critical/10 p-4 text-sm text-status-critical">
              {error}
            </div>
          )}

          {data && !loading && (
            <div className="space-y-6">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-text-tertiary">Asset</p>
                <p className="mt-1 text-xl font-bold text-text-primary">
                  {data.asset_name ?? data.asset_id}
                </p>
              </div>

              <div className="flex items-center gap-8">
                <div className="relative flex-shrink-0">
                  <svg className="h-32 w-32 -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="54"
                      fill="none"
                      stroke="var(--border-subtle)"
                      strokeWidth="8"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="54"
                      fill="none"
                      strokeWidth="8"
                      strokeLinecap="round"
                      className={clsx('transition-all duration-700', scoreRingColor(data.risk_score))}
                      strokeDasharray={circumference}
                      strokeDashoffset={dashOffset}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={clsx('text-2xl font-bold', scoreTextColor(data.risk_score))}>
                      {data.risk_score.toFixed(1)}
                    </span>
                    <span className="text-xs text-text-tertiary">Risk Score</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-text-tertiary">Probability</p>
                    <p className="text-lg font-bold text-text-primary">
                      {(data.probability * 100).toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-tertiary">Financial Impact</p>
                    <p className="text-lg font-bold text-text-primary">
                      {formatINR(data.financial_impact_inr)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-tertiary">Expected Annual Loss</p>
                    <p className="text-lg font-bold text-status-high">
                      {formatINR(data.expected_annual_loss)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-tertiary">Risk Category</p>
                    <p className="text-lg font-bold text-text-primary">{data.risk_category}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-bg-elevated p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">Control Reduction</span>
                  <span className="text-sm font-bold text-status-low">
                    {(data.control_reduction * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="mt-2 h-3 w-full rounded-full bg-bg-hover">
                  <div
                    className="h-3 rounded-full bg-status-low transition-all"
                    style={{ width: `${data.control_reduction * 100}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-text-tertiary">Residual Risk</span>
                  <span className="text-sm font-bold text-text-primary">
                    {formatINR(data.residual_risk)}
                  </span>
                </div>
              </div>

              {riskFactors.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-semibold text-text-primary">Risk Factors</p>
                  <div className="space-y-2">
                    {riskFactors.map(([key, value]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between rounded-lg border border-border-subtle px-3 py-2"
                      >
                        <span className="text-sm text-text-secondary">{key}</span>
                        <span className="text-sm font-medium text-text-primary">
                          {typeof value === 'number' ? value.toFixed(2) : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-lg border border-status-medium/30 bg-status-medium/10 p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-status-medium" />
                  <div>
                    <p className="text-sm font-semibold text-status-medium">Recommendations</p>
                    <ul className="mt-2 space-y-1 text-sm text-status-medium/90">
                      {data.control_reduction < 0.5 && (
                        <li>• Implement additional security controls to reduce risk</li>
                      )}
                      {data.probability > 0.5 && (
                        <li>• Priority: Address high-probability threats immediately</li>
                      )}
                      {data.financial_impact_inr > 5000000 && (
                        <li>• Consider cyber insurance for high-value assets</li>
                      )}
                      <li>• Regular review of risk posture recommended</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}