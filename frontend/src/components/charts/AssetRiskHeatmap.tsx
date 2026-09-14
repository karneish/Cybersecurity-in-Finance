import { useState } from 'react'
import { scoreHex } from '@/theme/severity'

interface AssetRiskHeatmapProps {
  assets: { name: string; risk_score: number }[]
}

export default function AssetRiskHeatmap({ assets }: AssetRiskHeatmapProps) {
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <div className="cyber-card p-6">
      <h3 className="text-sm font-medium text-text-tertiary">Asset Risk Heatmap</h3>
      <div className="mt-4 grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
        {assets.map((asset) => (
          <div
            key={asset.name}
            className="relative flex h-12 cursor-default items-center justify-center rounded-md text-xs font-medium text-white transition-transform hover:scale-110"
            style={{ backgroundColor: scoreHex(asset.risk_score) }}
            onMouseEnter={() => setHovered(asset.name)}
            onMouseLeave={() => setHovered(null)}
          >
            <span className="truncate px-1">{asset.risk_score}</span>
            {hovered === asset.name && (
              <div className="absolute -top-10 z-10 whitespace-nowrap rounded-md bg-bg-elevated border border-border-default px-2 py-1 text-xs text-text-primary shadow-card">
                {asset.name} ({asset.risk_score})
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}