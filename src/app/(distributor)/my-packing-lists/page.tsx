'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useDistributor } from '@/contexts/DistributorContext'
import { usePreview } from '@/contexts/PreviewContext'
import { 
  Ship, Download, Search, Clock, CheckCircle, Package, X, Loader2,
  FileText, Calendar
} from 'lucide-react'
import { formatNumber } from '@/lib/utils'

interface PackingList {
  id: string
  number: string
  orderId: string
  orderNumber: string
  type: 'export' | 'factory'
  createdAt: string
  status: 'draft' | 'finalized'
  totalItems: number
  totalPackages: number
  grossWeight: number
  netWeight: number
  volume: number
  currency: string
  totalValue: number
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: typeof Clock }> = {
  draft: { label: 'Draft', color: 'var(--color-text-secondary)', bgColor: 'rgba(142, 142, 147, 0.1)', icon: FileText },
  finalized: { label: 'Finalized', color: 'var(--color-success)', bgColor: 'rgba(52, 199, 89, 0.1)', icon: CheckCircle },
}

export default function MyPackingListsPage() {
  const { user, invoiceCurrencySymbol } = useDistributor()
  const { isPreviewMode, previewCustomer } = usePreview()
  
  const [packingLists, setPackingLists] = useState<PackingList[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'export' | 'factory'>('all')
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const loadPackingLists = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (isPreviewMode && previewCustomer?.id) {
        params.set('customerId', previewCustomer.id)
      }
      
      const res = await fetch(`/api/distributor/packing-lists?${params.toString()}`)
      if (res.ok) {
        const data = await res.json()
        setPackingLists(data.packingLists || [])
      }
    } catch (error) {
      console.error('Failed to load packing lists:', error)
    } finally {
      setLoading(false)
    }
  }, [isPreviewMode, previewCustomer])

  useEffect(() => {
    loadPackingLists()
  }, [loadPackingLists])

  const filteredLists = packingLists.filter(pl => {
    const matchesSearch = 
      pl.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pl.orderNumber.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = typeFilter === 'all' || pl.type === typeFilter
    return matchesSearch && matchesType
  })

  const handleDownload = async (plId: string) => {
    setDownloadingId(plId)
    try {
      const res = await fetch(`/api/packing-lists/${plId}/pdf`)
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `packing-list-${plId}.pdf`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Download failed:', error)
    } finally {
      setDownloadingId(null)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center">
        <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin" style={{ color: 'var(--color-brand-primary)' }} />
        <p style={{ color: 'var(--color-text-secondary)' }}>Loading packing lists...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 
          className="text-[28px] font-semibold tracking-tight"
          style={{ color: 'var(--color-text-primary)' }}
        >
          Packing Lists
        </h1>
        <p 
          className="text-[15px] mt-1"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {filteredLists.length} packing list{filteredLists.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search 
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
            style={{ color: 'var(--color-text-secondary)' }}
          />
          <input
            type="text"
            placeholder="Search by PL number or order..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-10 w-full"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4" style={{ color: 'var(--color-text-secondary)' }} />
            </button>
          )}
        </div>

        <div className="flex gap-2">
          {(['all', 'export', 'factory'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className="px-3 py-2 rounded-lg text-[13px] font-medium transition-colors"
              style={{
                backgroundColor: typeFilter === type 
                  ? 'var(--color-brand-primary)' 
                  : 'var(--color-bg-secondary)',
                color: typeFilter === type ? 'white' : 'var(--color-text-primary)',
                border: typeFilter === type 
                  ? 'none' 
                  : '1px solid rgba(210, 210, 215, 0.3)'
              }}
            >
              {type === 'all' ? 'All' : type === 'export' ? 'Export' : 'Factory'}
            </button>
          ))}
        </div>
      </div>

      {/* Packing Lists */}
      {filteredLists.length === 0 ? (
        <div className="card p-12 text-center">
          <Ship className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-text-tertiary)' }} />
          <p 
            className="text-[15px] mb-2"
            style={{ color: 'var(--color-text-primary)' }}
          >
            No packing lists found
          </p>
          <p 
            className="text-[13px]"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {searchQuery || typeFilter !== 'all'
              ? 'Try adjusting your filters'
              : 'Packing lists will appear here once orders are shipped'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLists.map((pl) => {
            const status = statusConfig[pl.status] || statusConfig.draft
            const StatusIcon = status.icon

            return (
              <div key={pl.id} className="card p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <p 
                        className="text-[15px] font-semibold"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {pl.number}
                      </p>
                      <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
                        style={{ backgroundColor: status.bgColor, color: status.color }}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-full text-[11px] font-medium"
                        style={{ 
                          backgroundColor: pl.type === 'export' 
                            ? 'rgba(0, 113, 227, 0.1)' 
                            : 'rgba(255, 149, 0, 0.1)',
                          color: pl.type === 'export' 
                            ? 'var(--color-brand-primary)' 
                            : 'var(--color-warning)'
                        }}
                      >
                        {pl.type === 'export' ? 'Export PL' : 'Factory PL'}
                      </span>
                    </div>
                    <Link
                      href={`/my-orders/${pl.orderId}`}
                      className="text-[13px] hover:underline"
                      style={{ color: 'var(--color-brand-primary)' }}
                    >
                      Order {pl.orderNumber}
                    </Link>
                  </div>

                  <button
                    onClick={() => handleDownload(pl.id)}
                    disabled={downloadingId === pl.id}
                    className="p-2 rounded-lg hover:bg-[#f5f5f7] transition-colors"
                    style={{ color: 'var(--color-brand-primary)' }}
                  >
                    {downloadingId === pl.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Download className="w-5 h-5" />
                    )}
                  </button>
                </div>

                <div className="flex flex-wrap gap-4 text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    {formatDate(pl.createdAt)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Package className="w-4 h-4" />
                    {pl.totalItems} items · {pl.totalPackages} packages
                  </div>
                  <div>
                    {pl.grossWeight.toFixed(2)} kg gross · {pl.volume.toFixed(2)} m³
                  </div>
                  <div className="ml-auto font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {invoiceCurrencySymbol}{formatNumber(pl.totalValue)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
