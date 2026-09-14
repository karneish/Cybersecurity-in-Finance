interface RiskBreakdownTreeProps {
  factors: { label: string; value: number; color: string }[]
}

export default function RiskBreakdownTree({ factors }: RiskBreakdownTreeProps) {
  const total = factors.reduce((sum, f) => sum + f.value, 0)

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="text-sm font-medium text-gray-500">Risk Breakdown</h3>

      <div className="mt-4 h-8 w-full flex overflow-hidden rounded-full">
        {factors.map((factor, i) => {
          const pct = total > 0 ? (factor.value / total) * 100 : 0
          return (
            <div
              key={i}
              style={{ width: `${pct}%`, backgroundColor: factor.color }}
              className="h-full transition-all first:rounded-l-full last:rounded-r-full"
            />
          )
        })}
      </div>

      <div className="mt-4 space-y-2">
        {factors.map((factor, i) => {
          const pct = total > 0 ? ((factor.value / total) * 100).toFixed(1) : '0'
          return (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-3 w-3 rounded-sm"
                  style={{ backgroundColor: factor.color }}
                />
                <span className="text-sm text-gray-700">{factor.label}</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{pct}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
