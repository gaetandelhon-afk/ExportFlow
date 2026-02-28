'use client'

import Link from 'next/link'
import { useDistributor } from '@/contexts/DistributorContext'
import { getCompanyInfo } from '@/config/features'
import { 
  User, MapPin, Bell, Settings, ChevronRight, 
  FileText, Mail
} from 'lucide-react'

export default function AccountPage() {
  const { user, addresses, unreadCount, quotes } = useDistributor()
  const companyInfo = getCompanyInfo()

  const pendingQuotes = quotes?.filter(q => q.status === 'sent').length || 0

  return (
    <div className="max-w-2xl mx-auto">
        <h1 
          className="text-[28px] font-semibold tracking-tight mb-8"
          style={{ color: 'var(--color-text-primary)' }}
        >
          My Account
        </h1>

        {user && (
          <div className="card p-6 mb-6">
            <div className="flex items-start gap-4">
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: 'var(--color-brand-primary)' }}
              >
                <User className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1">
                <h2 
                  className="text-[18px] font-semibold"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {user.name}
                </h2>
                <p 
                  className="text-[14px]"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {user.company}
                </p>
                
                <div className="flex items-center gap-1.5 mt-2">
                  <Mail className="w-4 h-4" style={{ color: 'var(--color-text-tertiary)' }} />
                  <span className="text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
                    {user.email}
                  </span>
                </div>
              </div>
            </div>

            <div 
              className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6"
              style={{ borderTop: '1px solid rgba(210, 210, 215, 0.3)' }}
            >
              <div>
                <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--color-text-tertiary)' }}>
                  Customer Type
                </p>
                <p className="text-[14px] font-medium mt-0.5" style={{ color: 'var(--color-text-primary)' }}>
                  {user.priceType}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--color-text-tertiary)' }}>
                  Catalog Currency
                </p>
                <p className="text-[14px] font-medium mt-0.5" style={{ color: 'var(--color-text-primary)' }}>
                  {user.displayCurrency}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--color-text-tertiary)' }}>
                  Invoice Currency
                </p>
                <p className="text-[14px] font-medium mt-0.5" style={{ color: 'var(--color-text-primary)' }}>
                  {user.invoiceCurrency}
                </p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--color-text-tertiary)' }}>
                  Payment Terms
                </p>
                <p className="text-[14px] font-medium mt-0.5" style={{ color: 'var(--color-text-primary)' }}>
                  {user.paymentTerms || 'N/A'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Menu Items - Each as separate Link */}
        <div className="space-y-3">
          
          {/* Display Preferences */}
          <Link
            href="/account/preferences"
            className="card p-4 flex items-center justify-between hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
              >
                <Settings className="w-5 h-5" style={{ color: 'var(--color-text-secondary)' }} />
              </div>
              <div>
                <p className="text-[14px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  Display Preferences
                </p>
                <p className="text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
                  Indicative prices, currency settings
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5" style={{ color: 'var(--color-text-tertiary)' }} />
          </Link>

          {/* Addresses */}
          <Link
            href="/account/addresses"
            className="card p-4 flex items-center justify-between hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
              >
                <MapPin className="w-5 h-5" style={{ color: 'var(--color-text-secondary)' }} />
              </div>
              <div>
                <p className="text-[14px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  Addresses
                </p>
                <p className="text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
                  {addresses?.length || 0} saved addresses
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5" style={{ color: 'var(--color-text-tertiary)' }} />
          </Link>

          {/* My Quotes */}
          <Link
            href="/my-quotes"
            className="card p-4 flex items-center justify-between hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
              >
                <FileText className="w-5 h-5" style={{ color: 'var(--color-text-secondary)' }} />
              </div>
              <div>
                <p className="text-[14px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  My Quotes
                </p>
                <p className="text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
                  {pendingQuotes > 0 ? `${pendingQuotes} pending` : 'View all quotes'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {pendingQuotes > 0 && (
                <span 
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-medium text-white"
                  style={{ backgroundColor: 'var(--color-brand-primary)' }}
                >
                  {pendingQuotes}
                </span>
              )}
              <ChevronRight className="w-5 h-5" style={{ color: 'var(--color-text-tertiary)' }} />
            </div>
          </Link>

          {/* Notifications */}
          <Link
            href="/notifications"
            className="card p-4 flex items-center justify-between hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
              >
                <Bell className="w-5 h-5" style={{ color: 'var(--color-text-secondary)' }} />
              </div>
              <div>
                <p className="text-[14px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  Notifications
                </p>
                <p className="text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
                  {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <span 
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-medium text-white"
                  style={{ backgroundColor: 'var(--color-error)' }}
                >
                  {unreadCount}
                </span>
              )}
              <ChevronRight className="w-5 h-5" style={{ color: 'var(--color-text-tertiary)' }} />
            </div>
          </Link>

        </div>

        <div 
          className="mt-8 p-4 rounded-xl text-center"
          style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
        >
          <p className="text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
            Need help? Contact your sales representative or email us at
          </p>
          <a 
            href={`mailto:${companyInfo.email}`}
            className="text-[13px] font-medium"
            style={{ color: 'var(--color-brand-primary)' }}
          >
            {companyInfo.email}
          </a>
        </div>
    </div>
  )
}