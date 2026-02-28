'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  ChevronLeft, Trash2, RotateCcw, AlertTriangle,
  Loader2, Package, Users, FolderTree, FileText,
  Ship, ClipboardList, Layout, Search, Trash,
  Settings, CheckCircle, ShoppingCart,
} from 'lucide-react'

interface TrashItem {
  id: string
  type: string
  name: string
  description?: string
  deletedAt: string
  deletedBy?: { name: string; email: string }
  deleteReason?: string
  daysRemaining: number
  expiresAt: string
}

interface TrashStats {
  total: number
  products: number
  customers: number
  invoices: number
  orders: number
  categories: number
  shipments: number
  packingLists: number
  documentTemplates: number
  customerCategories: number
  expiringIn7Days: number
}

const TYPE_CONFIG: Record<string, { label: string; icon: typeof Package; color: string }> = {
  product:          { label: 'Product',           icon: Package,       color: 'bg-blue-100 text-blue-600' },
  customer:         { label: 'Customer',          icon: Users,         color: 'bg-green-100 text-green-600' },
  category:         { label: 'Category',          icon: FolderTree,    color: 'bg-purple-100 text-purple-600' },
  customerCategory: { label: 'Customer Category', icon: FolderTree,    color: 'bg-indigo-100 text-indigo-600' },
  invoice:          { label: 'Invoice',           icon: FileText,      color: 'bg-amber-100 text-amber-600' },
  order:            { label: 'Order',             icon: ShoppingCart,  color: 'bg-orange-100 text-orange-600' },
  shipment:         { label: 'Shipment',          icon: Ship,          color: 'bg-cyan-100 text-cyan-600' },
  packingList:      { label: 'Packing List',      icon: ClipboardList, color: 'bg-teal-100 text-teal-600' },
  documentTemplate: { label: 'Template',          icon: Layout,        color: 'bg-rose-100 text-rose-600' },
}

const STATS_KEYS: { key: keyof TrashStats; label: string; icon: string }[] = [
  { key: 'products',    label: 'Products',   icon: '📦' },
  { key: 'customers',   label: 'Customers',  icon: '👤' },
  { key: 'orders',      label: 'Orders',     icon: '🛒' },
  { key: 'invoices',    label: 'Invoices',   icon: '📄' },
  { key: 'shipments',   label: 'Shipments',  icon: '🚢' },
  { key: 'packingLists', label: 'Packing Lists', icon: '📋' },
]

export default function TrashPage() {
  const [items, setItems] = useState<TrashItem[]>([])
  const [stats, setStats] = useState<TrashStats | null>(null)
  const [retentionDays, setRetentionDays] = useState(30)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [showSettings, setShowSettings] = useState(false)
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [settingsSaved, setSettingsSaved] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())

  const fetchTrash = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (filterType !== 'all') params.set('type', filterType)
      if (search) params.set('search', search)

      const res = await fetch(`/api/trash?${params}`)
      if (res.ok) {
        const data = await res.json()
        setItems(data.items || [])
        setStats(data.stats || null)
      }
    } catch (error) {
      console.error('Failed to fetch trash:', error)
    } finally {
      setLoading(false)
    }
  }, [filterType, search])

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/trash/settings')
      if (res.ok) {
        const data = await res.json()
        setRetentionDays(data.retentionDays || 30)
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    }
  }, [])

  useEffect(() => {
    fetchTrash()
    fetchSettings()
  }, [fetchTrash, fetchSettings])

  const handleRestore = async (item: TrashItem) => {
    setActionLoading(`restore-${item.id}`)
    try {
      const res = await fetch(`/api/trash/${item.type}/${item.id}`, { method: 'POST' })
      if (res.ok) {
        await fetchTrash()
        setSelectedItems(prev => { const next = new Set(prev); next.delete(`${item.type}:${item.id}`); return next })
      }
    } catch (error) {
      console.error('Failed to restore:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const handlePermanentDelete = async (item: TrashItem) => {
    if (!confirm(`Permanently delete "${item.name}"? This cannot be undone.`)) return
    setActionLoading(`delete-${item.id}`)
    try {
      const res = await fetch(`/api/trash/${item.type}/${item.id}`, { method: 'DELETE' })
      if (res.ok) {
        await fetchTrash()
        setSelectedItems(prev => { const next = new Set(prev); next.delete(`${item.type}:${item.id}`); return next })
      }
    } catch (error) {
      console.error('Failed to delete:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleRestoreAll = async () => {
    if (!confirm(`Restore all ${stats?.total || 0} items?`)) return
    setActionLoading('restoreAll')
    try {
      const body: Record<string, string> = {}
      if (filterType !== 'all') body.entityType = filterType
      const res = await fetch('/api/trash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        await fetchTrash()
        setSelectedItems(new Set())
      }
    } catch (error) {
      console.error('Failed to restore all:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleEmptyTrash = async () => {
    setActionLoading('empty')
    try {
      const params = filterType !== 'all' ? `?type=${filterType}` : ''
      const res = await fetch(`/api/trash${params}`, { method: 'DELETE' })
      if (res.ok) {
        await fetchTrash()
        setShowEmptyConfirm(false)
        setSelectedItems(new Set())
      }
    } catch (error) {
      console.error('Failed to empty trash:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleRestoreSelected = async () => {
    if (selectedItems.size === 0) return
    setActionLoading('restoreSelected')
    try {
      for (const key of selectedItems) {
        const [type, id] = key.split(':')
        await fetch(`/api/trash/${type}/${id}`, { method: 'POST' })
      }
      setSelectedItems(new Set())
      await fetchTrash()
    } catch (error) {
      console.error('Failed to restore selected:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedItems.size === 0) return
    if (!confirm(`Permanently delete ${selectedItems.size} items? This cannot be undone.`)) return
    setActionLoading('deleteSelected')
    try {
      for (const key of selectedItems) {
        const [type, id] = key.split(':')
        await fetch(`/api/trash/${type}/${id}`, { method: 'DELETE' })
      }
      setSelectedItems(new Set())
      await fetchTrash()
    } catch (error) {
      console.error('Failed to delete selected:', error)
    } finally {
      setActionLoading(null)
    }
  }

  const handleSaveRetention = async (days: number) => {
    setSavingSettings(true)
    try {
      const res = await fetch('/api/trash/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ retentionDays: days }),
      })
      if (res.ok) {
        setRetentionDays(days)
        setSettingsSaved(true)
        setTimeout(() => setSettingsSaved(false), 2000)
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setSavingSettings(false)
    }
  }

  const toggleSelect = (type: string, id: string) => {
    const key = `${type}:${id}`
    setSelectedItems(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(items.map(i => `${i.type}:${i.id}`)))
    }
  }

  const formatTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--color-brand-primary)' }} />
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/dashboard"
          className="p-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] transition-colors"
        >
          <ChevronLeft className="w-5 h-5" style={{ color: 'var(--color-text-secondary)' }} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Trash
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
            {stats?.total || 0} item{(stats?.total || 0) !== 1 ? 's' : ''} &middot; Auto-deleted after {retentionDays} days
          </p>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] transition-colors"
          title="Trash settings"
        >
          <Settings className="w-5 h-5" style={{ color: 'var(--color-text-secondary)' }} />
        </button>
        {stats && stats.total > 0 && (
          <>
            <button
              onClick={handleRestoreAll}
              disabled={actionLoading !== null}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors hover:bg-[var(--color-bg-tertiary)]"
              style={{ color: 'var(--color-brand-primary)', borderColor: 'var(--color-border)' }}
            >
              <RotateCcw className="w-4 h-4" />
              Restore All
            </button>
            <button
              onClick={() => setShowEmptyConfirm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors"
              style={{ backgroundColor: 'var(--color-error)' }}
            >
              <Trash className="w-4 h-4" />
              Empty Trash
            </button>
          </>
        )}
      </div>

      {/* Stats */}
      {stats && stats.total > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
          <div
            className="rounded-xl border p-4"
            style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
          >
            <div className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{stats.total}</div>
            <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Total</div>
          </div>
          {STATS_KEYS.map(({ key, label, icon }) => {
            const count = stats[key] as number
            if (count === 0) return null
            return (
              <div
                key={key}
                className="rounded-xl border p-4"
                style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
              >
                <div className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{count}</div>
                <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{icon} {label}</div>
              </div>
            )
          })}
          {stats.expiringIn7Days > 0 && (
            <div
              className="rounded-xl border p-4"
              style={{ backgroundColor: 'rgba(255, 149, 0, 0.05)', borderColor: 'var(--color-warning)' }}
            >
              <div className="text-2xl font-bold" style={{ color: 'var(--color-warning)' }}>{stats.expiringIn7Days}</div>
              <div className="text-xs" style={{ color: 'var(--color-warning)' }}>⚠️ Expiring soon</div>
            </div>
          )}
        </div>
      )}

      {/* Settings panel */}
      {showSettings && (
        <div
          className="mb-6 p-4 rounded-xl border"
          style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
        >
          <h3 className="text-sm font-medium mb-3" style={{ color: 'var(--color-text-primary)' }}>
            Retention Period
          </h3>
          <p className="text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>
            Items in the trash are automatically deleted after this period.
          </p>
          <div className="flex items-center gap-3">
            {[15, 30, 60].map(days => (
              <button
                key={days}
                onClick={() => handleSaveRetention(days)}
                disabled={savingSettings}
                className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
                style={{
                  backgroundColor: retentionDays === days ? 'var(--color-brand-primary)' : 'transparent',
                  color: retentionDays === days ? 'white' : 'var(--color-text-primary)',
                  borderColor: retentionDays === days ? 'var(--color-brand-primary)' : 'var(--color-border)',
                }}
              >
                {days} days
              </button>
            ))}
            {settingsSaved && (
              <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-success)' }}>
                <CheckCircle className="w-3.5 h-3.5" /> Saved
              </span>
            )}
          </div>
        </div>
      )}

      {/* Empty trash confirmation */}
      {showEmptyConfirm && (
        <div
          className="mb-6 p-4 rounded-xl border"
          style={{ backgroundColor: 'rgba(255, 59, 48, 0.05)', borderColor: 'var(--color-error)' }}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: 'var(--color-error)' }} />
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                Permanently delete all {stats?.total || 0} items?
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                This action cannot be undone. All data will be permanently lost.
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleEmptyTrash}
                  disabled={actionLoading === 'empty'}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-colors"
                  style={{ backgroundColor: 'var(--color-error)' }}
                >
                  {actionLoading === 'empty' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash className="w-3.5 h-3.5" />}
                  Delete All
                </button>
                <button
                  onClick={() => setShowEmptyConfirm(false)}
                  className="px-3 py-1.5 rounded-lg text-sm border transition-colors"
                  style={{ color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Bulk Actions */}
      {(stats?.total || 0) > 0 && (
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-tertiary)' }} />
            <input
              type="text"
              placeholder="Search trash..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm"
              style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)' }}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => { setFilterType('all'); setSelectedItems(new Set()) }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                backgroundColor: filterType === 'all' ? 'var(--color-brand-primary)' : 'var(--color-bg-tertiary)',
                color: filterType === 'all' ? 'white' : 'var(--color-text-secondary)',
              }}
            >
              All ({stats?.total || 0})
            </button>
            {Object.entries(TYPE_CONFIG).map(([type, config]) => {
              const statsKeyMap: Record<string, keyof TrashStats> = {
                product: 'products', customer: 'customers', order: 'orders',
                invoice: 'invoices', category: 'categories', shipment: 'shipments',
                packingList: 'packingLists', documentTemplate: 'documentTemplates',
                customerCategory: 'customerCategories',
              }
              const count = stats ? (stats[statsKeyMap[type]] as number) || 0 : 0
              if (count === 0) return null
              return (
                <button
                  key={type}
                  onClick={() => { setFilterType(type); setSelectedItems(new Set()) }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                  style={{
                    backgroundColor: filterType === type ? 'var(--color-brand-primary)' : 'var(--color-bg-tertiary)',
                    color: filterType === type ? 'white' : 'var(--color-text-secondary)',
                  }}
                >
                  {config.label} ({count})
                </button>
              )
            })}
          </div>

          {selectedItems.size > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {selectedItems.size} selected
              </span>
              <button
                onClick={handleRestoreSelected}
                disabled={actionLoading !== null}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:bg-[var(--color-bg-tertiary)]"
                style={{ color: 'var(--color-brand-primary)', borderColor: 'var(--color-border)' }}
              >
                {actionLoading === 'restoreSelected' ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                Restore
              </button>
              <button
                onClick={handleDeleteSelected}
                disabled={actionLoading !== null}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-red-50"
                style={{ color: 'var(--color-error)' }}
              >
                {actionLoading === 'deleteSelected' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                Delete
              </button>
            </div>
          )}
        </div>
      )}

      {/* Items list */}
      {items.length === 0 ? (
        <div
          className="text-center py-16 rounded-xl border"
          style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
        >
          <Trash2 className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--color-text-tertiary)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
            {(stats?.total || 0) === 0 ? 'Trash is empty' : 'No matching items'}
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {(stats?.total || 0) === 0 ? 'Deleted items will appear here for recovery' : 'Try a different search or filter'}
          </p>
        </div>
      ) : (
        <div
          className="rounded-xl border overflow-hidden divide-y"
          style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border)' }}
        >
          {/* Table header */}
          <div
            className="flex items-center gap-4 px-4 py-2.5 text-xs font-medium"
            style={{ backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-secondary)' }}
          >
            <input
              type="checkbox"
              checked={selectedItems.size === items.length && items.length > 0}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded"
            />
            <div className="w-8">Type</div>
            <div className="flex-1">Item</div>
            <div className="w-36">Deleted</div>
            <div className="w-28">Expires</div>
            <div className="w-32 text-right">Actions</div>
          </div>

          {items.map(item => {
            const config = TYPE_CONFIG[item.type] || { label: item.type, icon: Package, color: 'bg-gray-100 text-gray-600' }
            const Icon = config.icon
            const isExpiring = item.daysRemaining <= 7

            return (
              <div
                key={`${item.type}-${item.id}`}
                className="flex items-center gap-4 px-4 py-3 hover:bg-[var(--color-bg-tertiary)] transition-colors"
                style={isExpiring ? { backgroundColor: 'rgba(255, 149, 0, 0.03)' } : undefined}
              >
                <input
                  type="checkbox"
                  checked={selectedItems.has(`${item.type}:${item.id}`)}
                  onChange={() => toggleSelect(item.type, item.id)}
                  className="w-4 h-4 rounded"
                />
                <div className={`p-2 rounded-lg ${config.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                    {item.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                      {config.label}
                    </span>
                    {item.deleteReason && (
                      <>
                        <span className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>&middot;</span>
                        <span className="text-xs italic" style={{ color: 'var(--color-text-tertiary)' }}>
                          {item.deleteReason}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="w-36">
                  <div className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                    {formatTimeAgo(item.deletedAt)}
                  </div>
                  {item.deletedBy && (
                    <div className="text-xs truncate" style={{ color: 'var(--color-text-tertiary)' }}>
                      by {item.deletedBy.name || item.deletedBy.email}
                    </div>
                  )}
                </div>

                <div className="w-28">
                  <span
                    className="text-xs"
                    style={{ color: isExpiring ? 'var(--color-warning)' : 'var(--color-text-tertiary)' }}
                  >
                    {item.daysRemaining <= 0 ? '⚠️ Expired' :
                     item.daysRemaining === 1 ? '1 day left' :
                     `${item.daysRemaining} days left`}
                  </span>
                </div>

                <div className="w-32 flex items-center justify-end gap-1.5">
                  <button
                    onClick={() => handleRestore(item)}
                    disabled={actionLoading !== null}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:bg-[var(--color-bg-tertiary)]"
                    style={{ color: 'var(--color-brand-primary)', borderColor: 'var(--color-border)' }}
                  >
                    {actionLoading === `restore-${item.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                    Restore
                  </button>
                  <button
                    onClick={() => handlePermanentDelete(item)}
                    disabled={actionLoading !== null}
                    className="flex items-center gap-1.5 p-1.5 rounded-lg text-xs transition-colors hover:bg-red-50"
                    style={{ color: 'var(--color-error)' }}
                    title="Delete permanently"
                  >
                    {actionLoading === `delete-${item.id}` ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
