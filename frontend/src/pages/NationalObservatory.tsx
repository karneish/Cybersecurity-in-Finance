import { useState } from 'react'
import { clsx } from 'clsx'
import { Landmark, Scale } from 'lucide-react'
import NationalSummaryHeader from '@/components/national/NationalSummaryHeader'
import SectorRiskChart from '@/components/national/SectorRiskChart'
import RegionHeatmap from '@/components/national/RegionHeatmap'
import DrillPanel from '@/components/national/DrillPanel'
import NationalBudgetAllocator from '@/components/national/NationalBudgetAllocator'
import AgencyBreakdown from '@/components/national/AgencyBreakdown'
import ComplianceSectorPanel from '@/components/national/ComplianceSectorPanel'
import TprmPanel from '@/components/national/TprmPanel'
import RegulatorReportView from '@/components/national/RegulatorReportView'

type Tab = 'oversight' | 'regulatory'

const TABS: { key: Tab; label: string; icon: typeof Landmark; blurb: string }[] = [
  {
    key: 'oversight',
    label: 'Oversight',
    icon: Landmark,
    blurb: 'Ministry / CERT-In — national posture, sectors, regions, drills, budget',
  },
  {
    key: 'regulatory',
    label: 'Regulatory',
    icon: Scale,
    blurb: 'RBI-style — agency gaps, compliance, vendor cascade, report & evidence',
  },
]

export default function NationalObservatory() {
  const [tab, setTab] = useState<Tab>('oversight')

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-text-primary">National Observatory</h1>
      </div>

      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={clsx(
              'flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
              tab === t.key
                ? 'border-accent-primary/40 bg-accent-primary/10 text-accent-primary'
                : 'border-border-default text-text-secondary hover:bg-bg-hover hover:text-text-primary',
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      <p className="text-sm text-text-tertiary">
        {TABS.find((t) => t.key === tab)?.blurb}
      </p>

      {tab === 'oversight' ? (
        <div className="space-y-6">
          <NationalSummaryHeader />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <SectorRiskChart />
            <RegionHeatmap />
          </div>
          <DrillPanel />
          <NationalBudgetAllocator />
        </div>
      ) : (
        <div className="space-y-6">
          <NationalSummaryHeader />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <AgencyBreakdown />
            <ComplianceSectorPanel />
          </div>
          <TprmPanel />
          <RegulatorReportView />
        </div>
      )}
    </div>
  )
}