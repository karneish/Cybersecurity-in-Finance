import { useEffect, useState } from 'react'
import { riskApi } from '@/api/riskApi'
import EChart, { type EChartsCoreOption } from '@/components/charts/EChart'
import { Map } from 'lucide-react'
import { Loader2 } from 'lucide-react'
import { useChartTokens } from '@/theme/chartTokens'
import type { RegionPayload } from '@/types/national'
import { formatINR } from './format'

export default function RegionHeatmap() {
  const t = useChartTokens()
  const [regions, setRegions] = useState<RegionPayload | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    riskApi
      .getNationalRegions()
      .then((res) => setRegions(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-text-tertiary">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading regional exposure...
      </div>
    )
  }

  if (!regions || regions.matrix.length === 0) return null

  const option: EChartsCoreOption = {
    tooltip: {
      position: 'top',
      formatter: (params: unknown) => {
        const p = params as { value: number[]; name: string }
        const [sectorIdx, regionIdx, value] = p.value
        const sector = regions.sectors[sectorIdx] ?? sectorIdx
        const region = regions.regions[regionIdx] ?? regionIdx
        return `${region} · ${sector}<br/><b>${formatINR(value)}</b>`
      },
    },
    grid: { left: 60, right: 10, top: 10, bottom: 40, containLabel: false },
    xAxis: {
      type: 'category',
      data: regions.regions,
      splitArea: { show: true },
      axisLabel: { color: t.axisLabel },
    },
    yAxis: {
      type: 'category',
      data: regions.sectors,
      splitArea: { show: true },
      axisLabel: { color: t.axisLabel },
    },
    visualMap: {
      min: 0,
      max: Math.max(...regions.matrix.map((r) => r[2]), 1),
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      inRange: { color: ['#E4EAF2', '#9DB4CE', '#5B7DB1', '#33537F', '#132C50'] },
      textStyle: { color: t.axisLabel },
    },
    series: [
      {
        type: 'heatmap',
        data: regions.matrix,
        label: {
          show: true,
          color: '#FFFFFF',
          textShadowColor: 'rgba(18, 32, 54, 0.55)',
          textShadowBlur: 6,
          fontSize: 10,
          formatter: (p: { value: number[] }) => {
            const v: number = p.value[2]
            if (v >= 10000000) return `${(v / 10000000).toFixed(1)}Cr`
            if (v >= 100000) return `${(v / 100000).toFixed(0)}L`
            return String(Math.round(v / 1000))
          },
        },
        itemStyle: { borderColor: '#11161E', borderWidth: 2 },
        emphasis: { itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.5)' } },
      },
    ],
  }

  return (
    <div className="cyber-card p-6" data-tour="region-heatmap">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-text-primary">
        <Map className="h-4 w-4 text-text-secondary" />
        Regional Exposure Heatmap
      </h3>
      <p className="mb-3 text-xs text-text-tertiary">
        Expected annual loss (₹) by sector × region → national EAL {formatINR(regions.national_total_eal)}
      </p>

      {regions.matrix.length > 0 ? (
        <EChart option={option} height={280} />
      ) : (
        <div className="space-y-2">
          {regions.regions.map((r) => (
            <div key={r} className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">{r}</span>
              <span className="text-text-primary">{formatINR(regions.region_totals?.[r] ?? 0)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}