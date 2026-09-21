import { useEffect, useState } from 'react'
import { riskApi } from '@/api/riskApi'
import EChart, { type EChartsCoreOption } from '@/components/charts/EChart'
import { Loader2, ShieldCheck } from 'lucide-react'
import type { DataQualityResult } from '@/types/riskInsights'

export default function DataQualityCard() {
  const [quality, setQuality] = useState<DataQualityResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    riskApi
      .getDataQuality()
      .then((res) => setQuality(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-text-tertiary">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading data quality...
      </div>
    )
  }

  if (!quality) return null

  const label = quality.confidence_percent >= 70 ? 'High' : quality.confidence_percent >= 50 ? 'Medium' : 'Low'
  const lowestAsset = (quality.asset_breakdown ?? []).slice().sort(
    (a, b) => (a.confidence_percent ?? 0) - (b.confidence_percent ?? 0)
  )[0]
  const recs = lowestAsset?.recommendations ?? []

  const option: EChartsCoreOption = {
    series: [
      {
        type: 'gauge',
        startAngle: 210,
        endAngle: -30,
        min: 0,
        max: 100,
        progress: { show: true, width: 14, itemStyle: { color: quality.confidence_percent >= 70 ? '#2F7D52' : quality.confidence_percent >= 50 ? '#A67D1E' : '#B8393F' } },
        axisLine: { lineStyle: { width: 14, color: [[1, '#1B222D']] } },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        pointer: { show: false },
        anchor: { show: false },
        detail: {
          valueAnimation: true,
          offsetCenter: [0, '-5%'],
          formatter: '{value}',
          fontSize: 28,
          fontWeight: 'bold',
          color: '#F1F5F9',
        },
        title: { offsetCenter: [0, '38%'], fontSize: 12, color: '#94A3B8' },
        data: [{ value: quality.confidence_percent, name: label }],
      },
    ],
  }

  return (
    <div className="cyber-card p-6">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-text-primary">
        <ShieldCheck className="h-4 w-4 text-accent-primary" />
        Data Confidence (FAIR Inputs)
      </h3>
      <EChart option={option} height={170} />
      <div className="mt-1 text-center text-[11px] text-text-tertiary">
        {quality.total_assets} assets · {quality.gap_count} data gaps
      </div>
      <div className="mt-2 space-y-1">
        {recs.slice(0, 3).map((r, i) => (
          <p key={i} className="text-[11px] text-text-tertiary">
            • {r}
          </p>
        ))}
        {recs.length === 0 && (
          <p className="text-[11px] text-text-tertiary">Data quality is strong — maintain scan cadence.</p>
        )}
      </div>
    </div>
  )
}
