import EChart, { type EChartsCoreOption } from '@/components/charts/EChart'
import { useChartTokens } from '@/theme/chartTokens'
import type { RiskTrend } from '@/types/risk'

interface RiskTimelineProps {
  data: RiskTrend
}

export default function RiskTimeline({ data }: RiskTimelineProps) {
  const t = useChartTokens()
  const chartData = data.dates.map((date, i) => ({
    date,
    riskScore: data.risk_scores[i],
    eal: data.eal_values[i],
  }))

  const option: EChartsCoreOption = {
    color: [t.seriesPrimary, t.seriesSecondary],
    tooltip: { trigger: 'axis', backgroundColor: t.tooltipBg, borderColor: t.tooltipBorder, textStyle: { color: t.tooltipText } },
    legend: { data: ['Risk Score', 'EAL'], textStyle: { color: t.legend } },
    grid: { left: 40, right: 40, top: 40, bottom: 30 },
    xAxis: {
      type: 'category',
      data: chartData.map((d) => d.date),
      axisLabel: {
        fontSize: 11,
        color: t.axisLabel,
        formatter: (v: string) => {
          const d = new Date(v)
          return `${d.getMonth() + 1}/${d.getDate()}`
        },
      },
      axisLine: { lineStyle: { color: t.axisLine } },
    },
    yAxis: [
      { type: 'value', splitLine: { lineStyle: { color: t.splitLine } } },
      { type: 'value', splitLine: { show: false } },
    ],
    series: [
      {
        name: 'Risk Score',
        type: 'line',
        data: chartData.map((d) => d.riskScore),
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 2, color: t.seriesPrimary },
      },
      {
        name: 'EAL',
        type: 'line',
        yAxisIndex: 1,
        data: chartData.map((d) => d.eal),
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 2, color: t.seriesSecondary },
      },
    ],
  }

  return (
    <div className="cyber-card p-6" data-tour="risk-timeline">
      <h3 className="mb-4 text-sm font-semibold text-text-primary">Risk Score Timeline</h3>
      <EChart option={option} height={300} />
    </div>
  )
}