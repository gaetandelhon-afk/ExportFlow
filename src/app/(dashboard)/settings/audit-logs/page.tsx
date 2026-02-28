'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  ChevronLeft, Shield, Search, Download, ChevronLeft as PrevIcon,
  ChevronRight as NextIcon, RefreshCw, Eye, X, Filter
} from 'lucide-react'

interface AuditLog {
  id: string
  companyId: string
  userId: string | null
  userEmail: string | null
  userRole: string | null
  ipAddress: string | null
  userAgent: string | null
  action: string
  entityType: string
  entityId: string | null
  changes: Record<string, { old: unknown; new: unknown }> | null
  metadata: Record<string, unknown> | null
  timestamp: string
}

interface LogsResponse {
  logs: AuditLog[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  users: { userId: string; userEmail: string | null }[]
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'bg-[#34c759]/10 text-[#34c759]',
  UPDATE: 'bg-[#0071e3]/10 text-[#0071e3]',
  DELETE: 'bg-[#ff3b30]/10 text-[#ff3b30]',
  LOGIN: 'bg-[#5856d6]/10 text-[#5856d6]',
  LOGOUT: 'bg-[#86868b]/10 text-[#86868b]',
  EXPORT: 'bg-[#ff9500]/10 text-[#ff9500]',
  IMPORT: 'bg-[#ff9500]/10 text-[#ff9500]',
  APPROVE: 'bg-[#34c759]/10 text-[#34c759]',
  REJECT: 'bg-[#ff3b30]/10 text-[#ff3b30]',
}

const ENTITY_TYPES = [
  'Order', 'OrderLine', 'Product', 'Customer', 'Invoice',
  'Payment', 'PaymentRecord', 'User', 'Substitution',
  'Settings', 'Branding', 'PackingList', 'Shipment', 'Quote',
]

const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'IMPORT', 'APPROVE', 'REJECT']

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

function DiffViewer({ changes }: { changes: Record<string, { old: unknown; new: unknown }> }) {
  return (
    <div className="space-y-2">
      {Object.entries(changes).map(([field, { old: oldVal, new: newVal }]) => (
        <div key={field} className="text-[13px]">
          <span className="font-medium text-[#1d1d1f]">{field}</span>
          <div className="mt-1 space-y-1">
            {oldVal !== undefined && oldVal !== null && (
              <div className="flex items-start gap-2 px-3 py-1.5 bg-[#ff3b30]/5 rounded-lg border border-[#ff3b30]/20">
                <span className="text-[#ff3b30] font-mono text-[11px] mt-0.5 flex-shrink-0">−</span>
                <span className="text-[#ff3b30] font-mono text-[11px] break-all">
                  {JSON.stringify(oldVal)}
                </span>
              </div>
            )}
            {newVal !== undefined && newVal !== null && (
              <div className="flex items-start gap-2 px-3 py-1.5 bg-[#34c759]/5 rounded-lg border border-[#34c759]/20">
                <span className="text-[#34c759] font-mono text-[11px] mt-0.5 flex-shrink-0">+</span>
                <span className="text-[#34c759] font-mono text-[11px] break-all">
                  {JSON.stringify(newVal)}
                </span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

function LogDetailModal({ log, onClose }: { log: AuditLog; onClose: () => void }) {
  return (
    <>
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm"
        style={{ zIndex: 100000 }}
        onClick={onClose}
      />
      <div
        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden"
        style={{ zIndex: 100001, maxHeight: '85vh' }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#d2d2d7]/30">
          <div className="flex items-center gap-3">
            <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide ${ACTION_COLORS[log.action] || 'bg-[#86868b]/10 text-[#86868b]'}`}>
              {log.action}
            </span>
            <span className="text-[15px] font-semibold text-[#1d1d1f]">
              {log.entityType} {log.entityId ? `· ${log.entityId.slice(-8)}` : ''}
            </span>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f5f5f7]">
            <X className="w-4 h-4 text-[#86868b]" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-5" style={{ maxHeight: 'calc(85vh - 72px)' }}>
          {/* Identity */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#f5f5f7] rounded-xl p-4">
              <p className="text-[11px] font-medium text-[#86868b] uppercase tracking-wide mb-1">User</p>
              <p className="text-[14px] font-medium text-[#1d1d1f]">{log.userEmail || log.userId || '—'}</p>
              {log.userRole && <p className="text-[12px] text-[#86868b] mt-0.5">{log.userRole}</p>}
            </div>
            <div className="bg-[#f5f5f7] rounded-xl p-4">
              <p className="text-[11px] font-medium text-[#86868b] uppercase tracking-wide mb-1">Timestamp</p>
              <p className="text-[14px] font-medium text-[#1d1d1f]">{formatDate(log.timestamp)}</p>
            </div>
            {log.ipAddress && (
              <div className="bg-[#f5f5f7] rounded-xl p-4">
                <p className="text-[11px] font-medium text-[#86868b] uppercase tracking-wide mb-1">IP Address</p>
                <p className="text-[14px] font-mono text-[#1d1d1f]">{log.ipAddress}</p>
              </div>
            )}
            <div className="bg-[#f5f5f7] rounded-xl p-4">
              <p className="text-[11px] font-medium text-[#86868b] uppercase tracking-wide mb-1">Entity ID</p>
              <p className="text-[13px] font-mono text-[#1d1d1f] break-all">{log.entityId || '—'}</p>
            </div>
          </div>

          {/* Changes (diff) */}
          {log.changes && Object.keys(log.changes).length > 0 && (
            <div>
              <p className="text-[13px] font-semibold text-[#1d1d1f] mb-3">Changes</p>
              <DiffViewer changes={log.changes} />
            </div>
          )}

          {/* Metadata */}
          {log.metadata && Object.keys(log.metadata).length > 0 && (
            <div>
              <p className="text-[13px] font-semibold text-[#1d1d1f] mb-3">Metadata</p>
              <div className="bg-[#f5f5f7] rounded-xl p-4">
                <pre className="text-[12px] font-mono text-[#1d1d1f] whitespace-pre-wrap break-all">
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* User agent */}
          {log.userAgent && (
            <div>
              <p className="text-[13px] font-semibold text-[#1d1d1f] mb-2">User Agent</p>
              <p className="text-[12px] text-[#86868b] font-mono break-all">{log.userAgent}</p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default function AuditLogsPage() {
  const [data, setData] = useState<LogsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)

  // Filters
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filterAction, setFilterAction] = useState('')
  const [filterEntityType, setFilterEntityType] = useState('')
  const [filterUserId, setFilterUserId] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [exporting, setExporting] = useState(false)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '50' })
      if (search) params.set('search', search)
      if (filterAction) params.set('action', filterAction)
      if (filterEntityType) params.set('entityType', filterEntityType)
      if (filterUserId) params.set('userId', filterUserId)
      if (filterDateFrom) params.set('dateFrom', filterDateFrom)
      if (filterDateTo) params.set('dateTo', filterDateTo)

      const res = await fetch(`/api/audit-logs?${params}`)
      if (res.ok) {
        setData(await res.json())
      }
    } catch {
      console.error('Failed to fetch audit logs')
    } finally {
      setLoading(false)
    }
  }, [page, search, filterAction, filterEntityType, filterUserId, filterDateFrom, filterDateTo])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  const handleExportCsv = async () => {
    setExporting(true)
    try {
      const params = new URLSearchParams({ export: 'csv' })
      if (filterAction) params.set('action', filterAction)
      if (filterEntityType) params.set('entityType', filterEntityType)
      if (filterUserId) params.set('userId', filterUserId)
      if (filterDateFrom) params.set('dateFrom', filterDateFrom)
      if (filterDateTo) params.set('dateTo', filterDateTo)

      const res = await fetch(`/api/audit-logs?${params}`)
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(url)
      }
    } finally {
      setExporting(false)
    }
  }

  const activeFiltersCount = [filterAction, filterEntityType, filterUserId, filterDateFrom, filterDateTo].filter(Boolean).length

  const clearFilters = () => {
    setFilterAction('')
    setFilterEntityType('')
    setFilterUserId('')
    setFilterDateFrom('')
    setFilterDateTo('')
    setSearch('')
    setPage(1)
  }

  return (
    <div className="max-w-7xl mx-auto pb-24">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <Link href="/settings" className="text-[#0071e3] hover:text-[#0077ed] flex items-center gap-1 text-[13px] mb-2">
            <ChevronLeft className="w-4 h-4" />
            Settings
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#ff9500]/10 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-[#ff9500]" />
            </div>
            <div>
              <h1 className="text-[28px] font-semibold text-[#1d1d1f]">Audit Logs</h1>
              <p className="text-[15px] text-[#86868b]">
                Complete history of all actions — read-only
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchLogs}
            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[#f5f5f7] transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 text-[#86868b] ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleExportCsv}
            disabled={exporting}
            className="inline-flex items-center gap-2 bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#1d1d1f] text-[13px] font-medium px-4 h-10 rounded-xl transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Exporting…' : 'Export CSV'}
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 text-[13px] font-medium px-4 h-10 rounded-xl transition-colors ${
              activeFiltersCount > 0
                ? 'bg-[#0071e3] text-white'
                : 'bg-[#f5f5f7] text-[#1d1d1f] hover:bg-[#e8e8ed]'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
        <input
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search by email or entity ID…"
          className="w-full h-11 pl-10 pr-4 bg-white border border-[#d2d2d7]/40 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
        />
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white border border-[#d2d2d7]/40 rounded-2xl p-5 mb-5 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-[#86868b] mb-1.5">Action</label>
              <select
                value={filterAction}
                onChange={e => { setFilterAction(e.target.value); setPage(1) }}
                className="w-full h-10 px-3 bg-[#f5f5f7] rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              >
                <option value="">All actions</option>
                {ACTIONS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#86868b] mb-1.5">Entity type</label>
              <select
                value={filterEntityType}
                onChange={e => { setFilterEntityType(e.target.value); setPage(1) }}
                className="w-full h-10 px-3 bg-[#f5f5f7] rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              >
                <option value="">All entities</option>
                {ENTITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#86868b] mb-1.5">User</label>
              <select
                value={filterUserId}
                onChange={e => { setFilterUserId(e.target.value); setPage(1) }}
                className="w-full h-10 px-3 bg-[#f5f5f7] rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              >
                <option value="">All users</option>
                {data?.users.map(u => (
                  <option key={u.userId} value={u.userId}>{u.userEmail || u.userId}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#86868b] mb-1.5">From</label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={e => { setFilterDateFrom(e.target.value); setPage(1) }}
                className="w-full h-10 px-3 bg-[#f5f5f7] rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-[#86868b] mb-1.5">To</label>
              <input
                type="date"
                value={filterDateTo}
                onChange={e => { setFilterDateTo(e.target.value); setPage(1) }}
                className="w-full h-10 px-3 bg-[#f5f5f7] rounded-xl text-[13px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              />
            </div>
          </div>
          {activeFiltersCount > 0 && (
            <button
              onClick={clearFilters}
              className="text-[13px] text-[#ff3b30] hover:underline"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Stats bar */}
      {data && (
        <div className="flex items-center justify-between mb-4">
          <p className="text-[13px] text-[#86868b]">
            <span className="font-semibold text-[#1d1d1f]">{data.total.toLocaleString()}</span> log entries
            {activeFiltersCount > 0 && ' (filtered)'}
          </p>
          {data.totalPages > 1 && (
            <p className="text-[13px] text-[#86868b]">
              Page {data.page} of {data.totalPages}
            </p>
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="w-6 h-6 text-[#0071e3] animate-spin" />
          </div>
        ) : !data || data.logs.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-[#f5f5f7] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-[#86868b]" />
            </div>
            <p className="text-[17px] font-semibold text-[#1d1d1f]">No logs found</p>
            <p className="text-[14px] text-[#86868b] mt-1">
              {activeFiltersCount > 0 ? 'Try adjusting your filters.' : 'Audit logs will appear here as actions are performed.'}
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="hidden md:grid grid-cols-[140px_90px_120px_1fr_140px_44px] gap-3 px-4 py-3 bg-[#f5f5f7]/80 border-b border-[#d2d2d7]/30">
              <p className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wide">Date</p>
              <p className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wide">Action</p>
              <p className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wide">Entity</p>
              <p className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wide">Details</p>
              <p className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wide">User</p>
              <div />
            </div>

            <div className="divide-y divide-[#d2d2d7]/20">
              {data.logs.map(log => (
                <div
                  key={log.id}
                  className="grid grid-cols-1 md:grid-cols-[140px_90px_120px_1fr_140px_44px] gap-2 md:gap-3 px-4 py-3 hover:bg-[#f5f5f7]/50 transition-colors items-center"
                >
                  {/* Date */}
                  <p className="text-[12px] text-[#86868b] font-mono">
                    {formatDate(log.timestamp)}
                  </p>

                  {/* Action badge */}
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wide w-fit ${ACTION_COLORS[log.action] || 'bg-[#86868b]/10 text-[#86868b]'}`}>
                    {log.action}
                  </span>

                  {/* Entity type */}
                  <p className="text-[13px] font-medium text-[#1d1d1f]">{log.entityType}</p>

                  {/* Details / summary */}
                  <div className="min-w-0">
                    {log.metadata && (
                      <p className="text-[12px] text-[#86868b] truncate">
                        {Object.entries(log.metadata)
                          .filter(([, v]) => v !== null && v !== undefined)
                          .slice(0, 3)
                          .map(([k, v]) => `${k}: ${String(v)}`)
                          .join(' · ')}
                      </p>
                    )}
                    {log.changes && (
                      <p className="text-[12px] text-[#86868b] mt-0.5">
                        {Object.keys(log.changes).length} field{Object.keys(log.changes).length !== 1 ? 's' : ''} changed:&nbsp;
                        {Object.keys(log.changes).join(', ')}
                      </p>
                    )}
                    {log.entityId && (
                      <p className="text-[11px] text-[#aeaeb2] font-mono mt-0.5">{log.entityId.slice(-12)}</p>
                    )}
                  </div>

                  {/* User */}
                  <p className="text-[12px] text-[#86868b] truncate">
                    {log.userEmail || log.userId?.slice(-8) || '—'}
                  </p>

                  {/* View button */}
                  <button
                    onClick={() => setSelectedLog(log)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#f5f5f7] transition-colors"
                    title="View details"
                  >
                    <Eye className="w-4 h-4 text-[#86868b]" />
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-[#d2d2d7]/40 hover:bg-[#f5f5f7] disabled:opacity-40 transition-colors"
          >
            <PrevIcon className="w-4 h-4 text-[#1d1d1f]" />
          </button>
          <span className="text-[14px] text-[#1d1d1f] font-medium">
            {page} / {data.totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
            disabled={page === data.totalPages}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-[#d2d2d7]/40 hover:bg-[#f5f5f7] disabled:opacity-40 transition-colors"
          >
            <NextIcon className="w-4 h-4 text-[#1d1d1f]" />
          </button>
        </div>
      )}

      {/* Retention notice */}
      <div className="mt-6 bg-[#f5f5f7] rounded-2xl p-4 flex items-start gap-3">
        <Shield className="w-4 h-4 text-[#86868b] flex-shrink-0 mt-0.5" />
        <p className="text-[13px] text-[#86868b]">
          Audit logs are <strong className="text-[#1d1d1f]">read-only</strong> and retained for a minimum of 2 years.
          They cannot be modified or deleted. Only ADMIN users can access this page.
        </p>
      </div>

      {/* Detail modal */}
      {selectedLog && (
        <LogDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </div>
  )
}
