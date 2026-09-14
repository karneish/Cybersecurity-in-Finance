import * as echarts from 'echarts/core'
import { LineChart, BarChart, PieChart, TreemapChart, GaugeChart, HeatmapChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  DatasetComponent,
  DataZoomComponent,
  VisualMapComponent,
  MarkLineComponent,
  MarkPointComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import type { EChartsCoreOption } from 'echarts/core'
import { useEffect, useRef } from 'react'
import { useChartTokens, type ChartTokens } from '@/theme/chartTokens'

echarts.use([
  LineChart,
  BarChart,
  PieChart,
  TreemapChart,
  GaugeChart,
  HeatmapChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  DatasetComponent,
  DataZoomComponent,
  VisualMapComponent,
  MarkLineComponent,
  MarkPointComponent,
  CanvasRenderer,
])

export type { EChartsCoreOption }

interface EChartProps {
  option: EChartsCoreOption
  height?: number | string
  className?: string
  onEvents?: Record<string, (params: unknown) => void>
}

function baseForTheme(t: ChartTokens) {
  return {
    textStyle: { color: t.text, fontFamily: 'Inter, system-ui, sans-serif' },
    axisLine: { lineStyle: { color: t.axisLine } },
    splitLine: { lineStyle: { color: t.splitLine } },
    axisLabel: { color: t.axisLabel },
  }
}

type EChartsAxis = {
  axisLabel?: { color?: string }
  axisLine?: { lineStyle?: { color?: string } }
  splitLine?: { lineStyle?: { color?: string } }
  type?: string
  textStyle?: { color?: string }
}

function mergeBase(option: EChartsCoreOption, t: ChartTokens): EChartsCoreOption {
  const base = baseForTheme(t)
  const withText = {
    ...option,
    textStyle: { ...(option.textStyle as object | undefined), color: base.textStyle.color, fontFamily: base.textStyle.fontFamily },
  }
  ;['xAxis', 'yAxis'].forEach((key) => {
    const axes = (withText as Record<string, unknown>)[key]
    if (!axes) return
    const arr = (Array.isArray(axes) ? axes : [axes]) as EChartsAxis[]
    arr.forEach((axis) => {
      axis.textStyle = { color: base.textStyle.color }
      if (!axis.axisLabel?.color) {
        axis.axisLabel = { ...(axis.axisLabel ?? {}), color: base.axisLabel.color }
      }
      if (!axis.axisLine?.lineStyle?.color && axis.type === 'category') {
        axis.axisLine = { ...(axis.axisLine ?? {}), lineStyle: { ...(axis.axisLine?.lineStyle ?? {}), color: base.axisLine.lineStyle.color } }
      }
      if (!axis.splitLine?.lineStyle?.color) {
        axis.splitLine = { ...(axis.splitLine ?? {}), lineStyle: { ...(axis.splitLine?.lineStyle ?? {}), color: base.splitLine.lineStyle.color } }
      }
    })
    ;(withText as Record<string, unknown>)[key] = Array.isArray(axes) ? (arr as unknown[]) : arr[0]
  })
  return withText
}

export default function EChart({ option, height = 300, className, onEvents }: EChartProps) {
  const ref = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)
  const tokens = useChartTokens()

  useEffect(() => {
    if (!ref.current) return
    const chart = echarts.init(ref.current)
    chartRef.current = chart
    return () => {
      chart.dispose()
      chartRef.current = null
    }
  }, [])

  useEffect(() => {
    const chart = chartRef.current
    if (!chart || !onEvents) return
    Object.entries(onEvents).forEach(([event, handler]) => {
      chart.on(event, handler)
    })
    return () => {
      Object.entries(onEvents).forEach(([event, handler]) => {
        chart.off(event, handler)
      })
    }
  }, [onEvents])

  useEffect(() => {
    chartRef.current?.setOption(mergeBase(option, tokens), { notMerge: false })
  }, [option, tokens])

  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return
    const resize = () => chart.resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  return (
    <div
      ref={ref}
      className={className}
      style={{ width: '100%', height: typeof height === 'number' ? `${height}px` : height }}
    />
  )
}