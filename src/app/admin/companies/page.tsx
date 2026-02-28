'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Search, Building2, ExternalLink, UserCheck, Loader2,
  Users, Package, ShoppingCart, ChevronLeft, ChevronRight
} from 'lucide-react'

interface CompanyRow {
  id: string
  name: string
  slug: string
  subscriptionStatus: string
  isActive: boolean
  trialDaysRemaining: number | null
  createdAt: string
  _count: {
    users: number
    orders: number
    products: number
    customers: number
  }
}

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  trialing: { label: 'Trial', color: 'text-[#0071e3]', bg: 'bg-[#0071e3]/10' },
  active: { label: 'Active', color: 'text-[#34c759]', bg: 'bg-[#34c759]/10' },
  canceled: { label: 'Canceled', color: 'text-[#ff9500]', bg: 'bg-[#ff9500]/10' },
  expired: { label: 'Expired', color: 'text-[#ff3b30]', bg: 'bg-[#ff3b30]/10' },
  past_due: { label: 'Past Due', color: 'text-[#ff3b30]', bg: 'bg-[#ff3b30]/10' },
}

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<CompanyRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [impersonating, setImpersonating] = useState<string | null>(null)

  const loadCompanies = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page) })
      if (search) params.set('search', search)

      const res = await fetch(`/api/admin/companies?${params}`)
      const data = await res.json()
      setCompanies(data.companies || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 1)
    } catch {
      console.error('Failed to load companies')
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => { loadCompanies() }, [loadCompanies])

  useEffect(() => {
    const timer = setTimeout(() => setPage(1), 300)
    return () => clearTimeout(timer)
  }, [search])

  const handleImpersonate = async (companyId: string) => {
    setImpersonating(companyId)
    try {
      const res = await fetch('/api/admin/impersonate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId }),
      })
      const data = await res.json()
      if (data.success && data.redirectUrl) {
        window.location.href = data.redirectUrl
      }
    } catch {
      console.error('Failed to impersonate')
    } finally {
      setImpersonating(null)
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-[#5856d6]/10 rounded-xl flex items-center justify-center">
          <Building2 className="w-6 h-6 text-[#5856d6]" />
        </div>
        <div>
          <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">All Companies</h1>
          <p className="text-[15px] text-[#86868b]">
            {total} companies registered on ExportFlow
          </p>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#86868b]" />
        <input
          type="text"
          placeholder="Search by name or slug..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full h-10 pl-10 pr-4 bg-white border border-[#d2d2d7]/50 rounded-xl text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#0071e3]" />
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#f5f5f7] border-b border-[#d2d2d7]/30">
                <tr>
                  <th className="text-left text-[12px] font-medium text-[#86868b] uppercase tracking-wider px-6 py-3">Company</th>
                  <th className="text-left text-[12px] font-medium text-[#86868b] uppercase tracking-wider px-4 py-3">Status</th>
                  <th className="text-left text-[12px] font-medium text-[#86868b] uppercase tracking-wider px-4 py-3">Stats</th>
                  <th className="text-left text-[12px] font-medium text-[#86868b] uppercase tracking-wider px-4 py-3">Created</th>
                  <th className="w-40"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#d2d2d7]/20">
                {companies.map((company) => {
                  const status = STATUS_LABELS[company.subscriptionStatus] || STATUS_LABELS.expired

                  return (
                    <tr key={company.id} className="hover:bg-[#f5f5f7]/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-[14px] font-medium text-[#1d1d1f]">{company.name}</p>
                        <p className="text-[12px] text-[#86868b]">{company.slug}.exportflow.io</p>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[12px] font-medium ${status.bg} ${status.color}`}>
                          {status.label}
                        </span>
                        {company.trialDaysRemaining !== null && company.subscriptionStatus === 'trialing' && (
                          <p className="text-[11px] text-[#86868b] mt-1">{company.trialDaysRemaining}d left</p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3 text-[12px] text-[#86868b]">
                          <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{company._count.users}</span>
                          <span className="flex items-center gap-1"><Package className="w-3.5 h-3.5" />{company._count.products}</span>
                          <span className="flex items-center gap-1"><ShoppingCart className="w-3.5 h-3.5" />{company._count.orders}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-[13px] text-[#86868b]">
                          {new Date(company.createdAt).toLocaleDateString('fr-FR')}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <a
                            href={`https://${company.slug}.exportflow.io`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 hover:bg-[#f5f5f7] rounded-lg transition-colors"
                            title="Open portal"
                          >
                            <ExternalLink className="w-4 h-4 text-[#86868b]" />
                          </a>
                          <button
                            onClick={() => handleImpersonate(company.id)}
                            disabled={impersonating === company.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#5856d6]/10 text-[#5856d6] rounded-lg text-[12px] font-medium hover:bg-[#5856d6]/20 transition-colors disabled:opacity-50"
                          >
                            {impersonating === company.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <UserCheck className="w-3.5 h-3.5" />
                            )}
                            Impersonate
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {companies.length === 0 && (
              <div className="text-center py-12">
                <Building2 className="w-12 h-12 text-[#86868b] mx-auto mb-3" />
                <p className="text-[15px] text-[#86868b]">No companies found</p>
              </div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-[13px] text-[#86868b]">
                Page {page} of {totalPages} ({total} companies)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-2 hover:bg-[#f5f5f7] rounded-lg disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-2 hover:bg-[#f5f5f7] rounded-lg disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
