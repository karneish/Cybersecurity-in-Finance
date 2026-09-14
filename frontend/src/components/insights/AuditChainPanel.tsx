import { useEffect, useState, useCallback } from 'react'
import { riskApi } from '@/api/riskApi'
import { useNotificationStore } from '@/store/notificationStore'
import { ShieldCheck, ShieldX, Link2, Loader2 } from 'lucide-react'
import type { AuditEntryItem, AuditVerifyResult } from '@/types/riskInsights'

function shortHash(hash: string): string {
  if (!hash) return '—'
  return `${hash.slice(0, 8)}…${hash.slice(-6)}`
}

export default function AuditChainPanel() {
  const [entries, setEntries] = useState<AuditEntryItem[]>([])
  const [verify, setVerify] = useState<AuditVerifyResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)
  const addNotification = useNotificationStore((s) => s.addNotification)

  const load = useCallback(async () => {
    try {
      const res = await riskApi.getAuditChain()
      setEntries(res.data)
    } catch {
      addNotification('error', 'Failed to load audit chain')
    } finally {
      setLoading(false)
    }
  }, [addNotification])

  useEffect(() => {
    load()
  }, [load])

  const verifyChain = async () => {
    setVerifying(true)
    try {
      const res = await riskApi.verifyAuditChain()
      setVerify(res.data)
    } catch {
      addNotification('error', 'Audit verification failed')
    } finally {
      setVerifying(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-text-tertiary">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading audit chain...
      </div>
    )
  }

  return (
    <div className="cyber-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          <Link2 className="h-4 w-4 text-text-secondary" />
          Tamper-Evident Audit Chain
        </h3>
        <button
          onClick={verifyChain}
          disabled={verifying || entries.length === 0}
          className="flex items-center gap-1 rounded-lg border border-accent-primary/30 bg-accent-primary/10 px-3 py-1.5 text-xs font-medium text-accent-primary hover:bg-accent-primary/15 disabled:opacity-50"
        >
          {verifying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
          Verify
        </button>
      </div>

      {verify && (
        <div
          className={`mb-3 flex items-center gap-2 rounded-lg p-3 text-xs font-medium ${
            verify.tampered ? 'bg-status-critical/10 text-status-critical' : 'bg-status-low/10 text-status-low'
          }`}
        >
          {verify.tampered ? <ShieldX className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
          {verify.tampered
            ? `CHAIN TAMPERED — ${verify.checked} entries checked`
            : `Chain intact — ${verify.checked} entries verified`}
        </div>
      )}

      <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
        {entries.length === 0 && (
          <p className="py-4 text-center text-xs text-text-tertiary">
            No audit entries yet. Trigger a risk event to begin the chain.
          </p>
        )}
        {entries.map((e) => (
          <div key={e.id} className="flex items-center justify-between rounded-lg border border-border-subtle px-3 py-1.5">
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-text-primary">
                #{e.chain_position} · {e.action}
              </p>
              <p className="truncate font-mono text-[10px] text-text-tertiary">
                prev {shortHash(e.prev_hash)} → {shortHash(e.data_hash)}
              </p>
            </div>
            <span className="ml-2 whitespace-nowrap text-[11px] text-text-tertiary">
              {new Date(e.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
