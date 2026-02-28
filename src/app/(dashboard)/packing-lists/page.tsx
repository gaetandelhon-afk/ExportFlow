'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Package, Ship, Factory, ArrowRight, Loader2,
  FileText, Mail, Globe, ChevronRight
} from 'lucide-react'

interface Stats {
  exportTotal: number
  exportDraft: number
  exportSent: number
  factoryTotal: number
  factoryDraft: number
  factorySent: number
}

export default function PackingListsPage() {
  const [stats, setStats] = useState<Stats>({
    exportTotal: 0,
    exportDraft: 0,
    exportSent: 0,
    factoryTotal: 0,
    factoryDraft: 0,
    factorySent: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const res = await fetch('/api/packing-lists')
      if (res.ok) {
        const data = await res.json()
        const lists = data.packingLists || []
        
        setStats({
          exportTotal: lists.filter((p: { type: string }) => p.type === 'EXPORT').length,
          exportDraft: lists.filter((p: { type: string; status: string }) => p.type === 'EXPORT' && p.status === 'DRAFT').length,
          exportSent: lists.filter((p: { type: string; status: string }) => p.type === 'EXPORT' && p.status === 'SENT').length,
          factoryTotal: lists.filter((p: { type: string }) => p.type === 'FACTORY').length,
          factoryDraft: lists.filter((p: { type: string; status: string }) => p.type === 'FACTORY' && p.status === 'DRAFT').length,
          factorySent: lists.filter((p: { type: string; status: string }) => p.type === 'FACTORY' && p.status === 'SENT').length,
        })
      }
    } catch (error) {
      console.error('Failed to load stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#0071e3]" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-[34px] font-semibold text-[#1d1d1f] tracking-tight">Packing Lists</h1>
        <p className="text-[17px] text-[#86868b] mt-2">
          Choose the type of packing list you need
        </p>
      </div>

      {/* Two Types Cards */}
      <div className="grid grid-cols-2 gap-6">
        {/* Export Packing Lists */}
        <Link
          href="/packing-lists/export"
          className="group bg-white rounded-3xl border border-[#d2d2d7]/30 p-8 hover:border-[#34c759]/50 hover:shadow-lg transition-all"
        >
          <div className="flex items-start justify-between mb-6">
            <div className="w-16 h-16 bg-[#34c759]/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Ship className="w-8 h-8 text-[#34c759]" />
            </div>
            <ChevronRight className="w-6 h-6 text-[#d2d2d7] group-hover:text-[#34c759] group-hover:translate-x-1 transition-all" />
          </div>
          
          <h2 className="text-[22px] font-semibold text-[#1d1d1f] mb-2">Export Packing Lists</h2>
          <p className="text-[15px] text-[#86868b] mb-6">
            Official shipping documents for your customers and customs. Includes carton details, weights, and dimensions.
          </p>
          
          <div className="flex items-center gap-4 pt-4 border-t border-[#d2d2d7]/30">
            <div>
              <p className="text-[28px] font-semibold text-[#34c759]">{stats.exportTotal}</p>
              <p className="text-[12px] text-[#86868b]">Total</p>
            </div>
            <div className="w-px h-10 bg-[#d2d2d7]/30" />
            <div>
              <p className="text-[20px] font-medium text-[#1d1d1f]">{stats.exportDraft}</p>
              <p className="text-[12px] text-[#86868b]">Draft</p>
            </div>
            <div className="w-px h-10 bg-[#d2d2d7]/30" />
            <div>
              <p className="text-[20px] font-medium text-[#1d1d1f]">{stats.exportSent}</p>
              <p className="text-[12px] text-[#86868b]">Sent</p>
            </div>
          </div>
          
          <div className="mt-6 flex items-center gap-2 text-[#34c759] font-medium text-[14px]">
            View Export Packing Lists
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>

        {/* Factory Packing Lists */}
        <Link
          href="/packing-lists/factory"
          className="group bg-white rounded-3xl border border-[#d2d2d7]/30 p-8 hover:border-[#ff9500]/50 hover:shadow-lg transition-all"
        >
          <div className="flex items-start justify-between mb-6">
            <div className="w-16 h-16 bg-[#ff9500]/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Factory className="w-8 h-8 text-[#ff9500]" />
            </div>
            <ChevronRight className="w-6 h-6 text-[#d2d2d7] group-hover:text-[#ff9500] group-hover:translate-x-1 transition-all" />
          </div>
          
          <h2 className="text-[22px] font-semibold text-[#1d1d1f] mb-2">Factory Packing Lists</h2>
          <p className="text-[15px] text-[#86868b] mb-6">
            Preparation documents for your factory/warehouse. With product images, Chinese names, and direct email sending.
          </p>
          
          <div className="flex items-center gap-4 pt-4 border-t border-[#d2d2d7]/30">
            <div>
              <p className="text-[28px] font-semibold text-[#ff9500]">{stats.factoryTotal}</p>
              <p className="text-[12px] text-[#86868b]">Total</p>
            </div>
            <div className="w-px h-10 bg-[#d2d2d7]/30" />
            <div>
              <p className="text-[20px] font-medium text-[#1d1d1f]">{stats.factoryDraft}</p>
              <p className="text-[12px] text-[#86868b]">Draft</p>
            </div>
            <div className="w-px h-10 bg-[#d2d2d7]/30" />
            <div>
              <p className="text-[20px] font-medium text-[#1d1d1f]">{stats.factorySent}</p>
              <p className="text-[12px] text-[#86868b]">Sent</p>
            </div>
          </div>
          
          <div className="mt-6 flex items-center gap-2 text-[#ff9500] font-medium text-[14px]">
            View Factory Packing Lists
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>

      {/* Feature Comparison */}
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-hidden">
        <div className="p-6 border-b border-[#d2d2d7]/30">
          <h3 className="text-[17px] font-semibold text-[#1d1d1f]">Feature Comparison</h3>
        </div>
        <div className="divide-y divide-[#d2d2d7]/30">
          {[
            { feature: 'Purpose', export: 'Customer & Customs', factory: 'Factory Preparation' },
            { feature: 'Language', export: 'Customer language', factory: 'Chinese / Bilingual' },
            { feature: 'Product Images', export: 'Optional', factory: 'Yes (large)' },
            { feature: 'Chinese Names', export: 'No', factory: 'Yes (中文名称)' },
            { feature: 'Carton Details', export: 'Yes (numbers, CBM)', factory: 'Basic' },
            { feature: 'Weights', export: 'Detailed (gross/net)', factory: 'Yes' },
            { feature: 'Email Sending', export: 'To customer', factory: 'To factory' },
            { feature: 'Branding', export: 'Company logo & style', factory: 'Minimal' },
          ].map((row, idx) => (
            <div key={idx} className="grid grid-cols-3 px-6 py-3">
              <p className="text-[14px] font-medium text-[#1d1d1f]">{row.feature}</p>
              <p className="text-[14px] text-[#86868b]">{row.export}</p>
              <p className="text-[14px] text-[#86868b]">{row.factory}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center justify-center gap-4">
        <Link
          href="/shipments"
          className="inline-flex items-center gap-2 px-5 h-11 bg-[#0071e3] text-white rounded-xl text-[14px] font-medium hover:bg-[#0077ed] transition-colors"
        >
          <Package className="w-4 h-4" />
          Go to Shipments
        </Link>
        <Link
          href="/settings/documents"
          className="inline-flex items-center gap-2 px-5 h-11 bg-[#f5f5f7] text-[#1d1d1f] rounded-xl text-[14px] font-medium hover:bg-[#e8e8ed] transition-colors"
        >
          <FileText className="w-4 h-4" />
          Configure Templates
        </Link>
      </div>
    </div>
  )
}
