'use client'

import { useState } from 'react'
import { Download, FileSpreadsheet, FileJson, FileText, ArrowLeft, Loader2, CheckCircle } from 'lucide-react'
import { PeriodSelector } from '@/components/analytics/PeriodSelector'
import { TimePeriod, ExportType, ExportFormat } from '@/types/analytics'
import Link from 'next/link'

const EXPORT_TYPES: { id: ExportType; label: string; description: string }[] = [
  {
    id: 'orders',
    label: 'Orders',
    description: 'All orders with customer details'
  },
  {
    id: 'orderLines',
    label: 'Order Lines',
    description: 'Product-by-product detail of each order'
  },
  {
    id: 'customers',
    label: 'Customers',
    description: 'Complete customer list with metrics'
  },
  {
    id: 'products',
    label: 'Products',
    description: 'Full product catalog'
  },
  {
    id: 'payments',
    label: 'Payments',
    description: 'Payment history'
  },
  {
    id: 'invoices',
    label: 'Invoices',
    description: 'Invoice records'
  },
  {
    id: 'analytics',
    label: 'Analytics Summary',
    description: 'KPIs and top performers'
  }
]

const FORMATS: { id: ExportFormat; label: string; icon: typeof FileSpreadsheet }[] = [
  { id: 'xlsx', label: 'Excel (.xlsx)', icon: FileSpreadsheet },
  { id: 'csv', label: 'CSV', icon: FileText },
  { id: 'json', label: 'JSON', icon: FileJson }
]

export default function ExportsPage() {
  const [selectedType, setSelectedType] = useState<ExportType>('orders')
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('xlsx')
  const [period, setPeriod] = useState<TimePeriod>('last30days')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleExport() {
    setLoading(true)
    setSuccess(false)
    try {
      const res = await fetch('/api/exports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType,
          format: selectedFormat,
          filters: { period }
        })
      })

      if (!res.ok) throw new Error('Export failed')

      const blob = await res.blob()
      const contentDisposition = res.headers.get('Content-Disposition')
      const filename = contentDisposition
        ?.split('filename="')[1]?.replace('"', '')
        || `export.${selectedFormat}`

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (error) {
      console.error('Export error:', error)
      alert('Export failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link
          href="/reports"
          className="p-2 hover:bg-[#f5f5f7] rounded-xl transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-[#86868b]" />
        </Link>
        <div>
          <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">Export Data</h1>
          <p className="text-[15px] text-[#86868b] mt-1">
            Download your data in your preferred format
          </p>
        </div>
      </div>

      {/* Period Selection */}
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-6 mb-6">
        <label className="block text-[14px] font-semibold text-[#1d1d1f] mb-3">Time Period</label>
        <PeriodSelector value={period} onChange={setPeriod} />
        <p className="text-[12px] text-[#86868b] mt-2">
          Data will be filtered to the selected time period
        </p>
      </div>

      {/* Export Type Selection */}
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-6 mb-6">
        <label className="block text-[14px] font-semibold text-[#1d1d1f] mb-4">
          Data Type
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {EXPORT_TYPES.map(type => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
                selectedType === type.id
                  ? 'border-[#0071e3] bg-[#0071e3]/5'
                  : 'border-[#d2d2d7]/50 hover:border-[#d2d2d7]'
              }`}
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                selectedType === type.id 
                  ? 'border-[#0071e3] bg-[#0071e3]' 
                  : 'border-[#d2d2d7]'
              }`}>
                {selectedType === type.id && (
                  <div className="w-2 h-2 rounded-full bg-white" />
                )}
              </div>
              <div>
                <div className="text-[14px] font-medium text-[#1d1d1f]">{type.label}</div>
                <div className="text-[12px] text-[#86868b]">{type.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Format Selection */}
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-6 mb-6">
        <label className="block text-[14px] font-semibold text-[#1d1d1f] mb-4">Format</label>
        <div className="flex gap-3">
          {FORMATS.map(format => {
            const Icon = format.icon
            return (
              <button
                key={format.id}
                onClick={() => setSelectedFormat(format.id)}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl border transition-all ${
                  selectedFormat === format.id
                    ? 'border-[#0071e3] bg-[#0071e3]/5 text-[#0071e3]'
                    : 'border-[#d2d2d7]/50 hover:border-[#d2d2d7] text-[#1d1d1f]'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[14px] font-medium">{format.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Export Button */}
      <button
        onClick={handleExport}
        disabled={loading}
        className={`w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-[15px] font-semibold transition-all ${
          success
            ? 'bg-[#34c759] text-white'
            : 'bg-[#0071e3] hover:bg-[#0077ed] text-white'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Exporting...
          </>
        ) : success ? (
          <>
            <CheckCircle className="w-5 h-5" />
            Downloaded!
          </>
        ) : (
          <>
            <Download className="w-5 h-5" />
            Download Export
          </>
        )}
      </button>
    </div>
  )
}
