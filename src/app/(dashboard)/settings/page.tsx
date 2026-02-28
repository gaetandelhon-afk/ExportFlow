'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  Palette, Building2, Users, Bell, Shield, CreditCard, 
  Package, FileText, Globe, ChevronRight, Settings, FolderTree, DollarSign, Sparkles
} from 'lucide-react'

interface SettingsSection {
  id: string
  title: string
  description: string
  href: string
  icon: typeof Settings
  color: string
}

interface AccountStats {
  products: number
  customers: number
  orders30d: number
  teamMembers: number
}

const settingsSections: SettingsSection[] = [
  {
    id: 'subscription',
    title: 'Subscription & Plan',
    description: 'View your current plan, usage, and upgrade options',
    href: '/settings/subscription',
    icon: Sparkles,
    color: '#af52de'
  },
  {
    id: 'branding',
    title: 'Branding',
    description: 'Customize colors, logo, and document templates',
    href: '/settings/branding',
    icon: Palette,
    color: '#0071e3'
  },
  {
    id: 'company',
    title: 'Company',
    description: 'Company information, address, and legal details',
    href: '/settings/company',
    icon: Building2,
    color: '#34c759'
  },
  {
    id: 'users',
    title: 'Team & Users',
    description: 'Manage admin users and their permissions',
    href: '/settings/users',
    icon: Users,
    color: '#5856d6'
  },
  {
    id: 'notifications',
    title: 'Notifications',
    description: 'Configure email notifications and alerts',
    href: '/settings/notifications',
    icon: Bell,
    color: '#ff9500'
  },
  {
    id: 'billing',
    title: 'Billing & Payments',
    description: 'Payment terms, bank details, and invoicing',
    href: '/settings/billing',
    icon: CreditCard,
    color: '#ff2d55'
  },
  {
    id: 'pricing',
    title: 'Pricing & Tiers',
    description: 'Price tiers for different customer types',
    href: '/settings/pricing',
    icon: DollarSign,
    color: '#30d158'
  },
  {
    id: 'products',
    title: 'Product Settings',
    description: 'Units, SKU, and catalog configuration',
    href: '/settings/products',
    icon: Package,
    color: '#00c7be'
  },
  {
    id: 'categories',
    title: 'Categories',
    description: 'Organize products with categories and subcategories',
    href: '/settings/categories',
    icon: FolderTree,
    color: '#64d2ff'
  },
  {
    id: 'documents',
    title: 'Documents',
    description: 'Invoice, quote, and packing list templates',
    href: '/settings/documents',
    icon: FileText,
    color: '#af52de'
  },
  {
    id: 'domain',
    title: 'Custom Domain',
    description: 'Configure a custom domain for your distributor portal',
    href: '/settings/domain',
    icon: Globe,
    color: '#34c759'
  },
  {
    id: 'localization',
    title: 'Localization',
    description: 'Languages, currencies, and regional settings',
    href: '/settings/localization',
    icon: Globe,
    color: '#007aff'
  },
  {
    id: 'security',
    title: 'Security',
    description: 'Password policies and two-factor authentication',
    href: '/settings/security',
    icon: Shield,
    color: '#ff3b30'
  }
]

export default function SettingsPage() {
  const [stats, setStats] = useState<AccountStats>({
    products: 0,
    customers: 0,
    orders30d: 0,
    teamMembers: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/settings/stats')
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">Settings</h1>
        <p className="text-[15px] text-[#86868b] mt-1">
          Configure your ExportFlow account and preferences
        </p>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {settingsSections.map((section) => {
          const Icon = section.icon
          return (
            <Link
              key={section.id}
              href={section.href}
              className="group bg-white rounded-2xl border border-[#d2d2d7]/30 p-5 hover:border-[#0071e3]/30 hover:shadow-lg transition-all"
            >
              <div className="flex items-start gap-4">
                <div 
                  className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${section.color}15` }}
                >
                  <Icon className="w-5 h-5" style={{ color: section.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[15px] font-semibold text-[#1d1d1f] group-hover:text-[#0071e3] transition-colors">
                    {section.title}
                  </h3>
                  <p className="text-[13px] text-[#86868b] mt-0.5 line-clamp-2">
                    {section.description}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-[#86868b] group-hover:text-[#0071e3] transition-colors flex-shrink-0" />
              </div>
            </Link>
          )
        })}
      </div>

      {/* Quick Stats */}
      <div className="mt-8 bg-[#f5f5f7] rounded-2xl p-6">
        <h2 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">Account Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4">
            <p className="text-[24px] font-semibold text-[#1d1d1f]">
              {loading ? '-' : stats.products.toLocaleString()}
            </p>
            <p className="text-[12px] text-[#86868b]">Products</p>
          </div>
          <div className="bg-white rounded-xl p-4">
            <p className="text-[24px] font-semibold text-[#1d1d1f]">
              {loading ? '-' : stats.customers.toLocaleString()}
            </p>
            <p className="text-[12px] text-[#86868b]">Customers</p>
          </div>
          <div className="bg-white rounded-xl p-4">
            <p className="text-[24px] font-semibold text-[#1d1d1f]">
              {loading ? '-' : stats.orders30d.toLocaleString()}
            </p>
            <p className="text-[12px] text-[#86868b]">Orders (30d)</p>
          </div>
          <div className="bg-white rounded-xl p-4">
            <p className="text-[24px] font-semibold text-[#1d1d1f]">
              {loading ? '-' : stats.teamMembers.toLocaleString()}
            </p>
            <p className="text-[12px] text-[#86868b]">Team Members</p>
          </div>
        </div>
      </div>
    </div>
  )
}
