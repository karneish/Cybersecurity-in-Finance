import { useState, useEffect, useCallback } from 'react'
import { assetApi } from '@/api/assetApi'
import DataTable from '@/components/common/DataTable'
import { clsx } from 'clsx'
import { Search, Plus, Eye, Edit, Server, Database, Globe, Monitor, Cloud, Laptop } from 'lucide-react'
import type { Asset } from '@/types/asset'

const typeIcons: Record<string, React.ReactNode> = {
  SERVER: <Server className="h-3.5 w-3.5" />,
  DATABASE: <Database className="h-3.5 w-3.5" />,
  APPLICATION: <Globe className="h-3.5 w-3.5" />,
  NETWORK: <Monitor className="h-3.5 w-3.5" />,
  CLOUD: <Cloud className="h-3.5 w-3.5" />,
  ENDPOINT: <Laptop className="h-3.5 w-3.5" />,
}

const typeColors: Record<string, string> = {
  SERVER: 'bg-status-info/15 text-status-info',
  DATABASE: 'bg-accent-secondary/15 text-accent-secondary',
  APPLICATION: 'bg-status-low/15 text-status-low',
  NETWORK: 'bg-status-high/15 text-status-high',
  CLOUD: 'bg-status-live/15 text-status-live',
  ENDPOINT: 'bg-bg-hover text-text-secondary',
}

function formatINR(value: number): string {
  return '\u20B9' + value.toLocaleString('en-IN')
}

function getCriticalityColor(score: number): string {
  if (score >= 80) return 'bg-status-critical'
  if (score >= 60) return 'bg-status-high'
  if (score >= 40) return 'bg-status-medium'
  return 'bg-status-low'
}

export default function AssetManagement() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [page, setPage] = useState(1)

  const fetchAssets = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { page, size: 20 }
      if (typeFilter) params.asset_type = typeFilter
      const res = await assetApi.list(params as any)
      setAssets(res.data.data)
      setTotal(res.data.total)
    } catch {}
    setLoading(false)
  }, [page, typeFilter])

  useEffect(() => {
    fetchAssets()
  }, [fetchAssets])

  const filtered = search
    ? assets.filter(
        (a) =>
          a.name.toLowerCase().includes(search.toLowerCase()) ||
          a.department.toLowerCase().includes(search.toLowerCase())
      )
    : assets

  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: (v: unknown, row: Record<string, unknown>) => (
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${typeColors[row.asset_type as string] ?? 'bg-bg-hover text-text-secondary'}`}>
            {typeIcons[row.asset_type as string]}
            {row.asset_type as string}
          </span>
          <span className="font-medium text-text-primary">{v as string}</span>
        </div>
      ),
    },
    { key: 'department', label: 'Department' },
    {
      key: 'criticality_score',
      label: 'Criticality',
      render: (v: unknown) => {
        const score = v as number
        return (
          <div className="flex items-center gap-2">
            <div className="h-2 w-20 rounded-full bg-bg-hover">
              <div
                className={`h-2 rounded-full ${getCriticalityColor(score)}`}
                style={{ width: `${score}%` }}
              />
            </div>
            <span className="text-xs text-text-secondary">{score}</span>
          </div>
        )
      },
    },
    {
      key: 'business_value_inr',
      label: 'Business Value',
      render: (v: unknown) => (
        <span className="font-medium">{formatINR(v as number)}</span>
      ),
    },
    {
      key: 'internet_exposed',
      label: 'Internet Exposed',
      className: 'text-center',
      render: (v: unknown) => (
        <span
          className={clsx(
            'mx-auto block h-3 w-3 rounded-full',
            v ? 'bg-status-critical' : 'bg-status-low'
          )}
        />
      ),
    },
    {
      key: 'id',
      label: 'Actions',
      className: 'text-center',
      render: (_v: unknown) => (
        <div className="flex items-center justify-center gap-1">
          <button className="rounded p-1 text-text-tertiary hover:bg-bg-hover hover:text-accent-primary">
            <Eye className="h-4 w-4" />
          </button>
          <button className="rounded p-1 text-text-tertiary hover:bg-bg-hover hover:text-accent-primary">
            <Edit className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" data-tour="asset-header">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Asset Management</h1>
          <p className="text-sm text-text-tertiary">{total} assets total</p>
        </div>
        <button className="cyber-btn-primary">
          <Plus className="h-4 w-4" />
          Add Asset
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center" data-tour="asset-filters">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search assets..."
            className="w-full rounded-lg border border-border-default bg-bg-input py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value)
            setPage(1)
          }}
          className="rounded-lg border border-border-default bg-bg-input px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
        >
          <option value="">All Types</option>
          <option value="SERVER">Server</option>
          <option value="DATABASE">Database</option>
          <option value="APPLICATION">Application</option>
          <option value="NETWORK">Network</option>
          <option value="CLOUD">Cloud</option>
          <option value="ENDPOINT">Endpoint</option>
        </select>
      </div>

      <div className="cyber-card" data-tour="asset-table">
        <DataTable
          columns={columns}
          data={filtered as unknown as Record<string, unknown>[]}
          loading={loading}
          emptyMessage="No assets found"
        />
      </div>
    </div>
  )
}
