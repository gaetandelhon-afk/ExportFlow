'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, Package, Users, ShoppingCart,
  Settings, Upload, Bell, Menu, Receipt, Building2,
  RefreshCcw, DollarSign, Ship, Factory, FileBox, ClipboardList, Eye,
  Moon, Sun, BarChart3, LogOut
} from 'lucide-react'
import { useBranding } from '@/contexts/BrandingContext'
import { useTheme } from '@/contexts/ThemeContext'
import { SignOutButton } from '@clerk/nextjs'

interface AdminNavigationProps {
  companyName?: string
  userName?: string
  pendingOrdersCount?: number
  overduePaymentsCount?: number
}

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Orders', href: '/orders', icon: ShoppingCart, showPendingBadge: true },
  { label: 'Products', href: '/products', icon: Package },
  { label: 'Customers', href: '/customers', icon: Users },
  { label: 'Invoices', href: '/invoices', icon: Receipt },
  { label: 'Quotes', href: '/quotes', icon: ClipboardList },
  { label: 'Export PL', href: '/packing-lists/export', icon: Ship },
  { label: 'Factory PL', href: '/packing-lists/factory', icon: Factory },
  { label: 'Shipments', href: '/shipments', icon: FileBox },
  { label: 'Payments', href: '/payments', icon: DollarSign, showOverdueBadge: true },
  { label: 'Reports', href: '/reports', icon: BarChart3 },
  { label: 'Substitutions', href: '/substitutions', icon: RefreshCcw },
  { label: 'Customer Preview', href: '/preview', icon: Eye },
  { label: 'Import', href: '/import', icon: Upload },
]

const bottomNavItems = [
  { label: 'Settings', href: '/settings', icon: Settings },
]

export default function AdminNavigation({ 
  companyName = 'ExportFlow', 
  userName = 'Admin',
  pendingOrdersCount = 0,
  overduePaymentsCount = 0
}: AdminNavigationProps) {
  const pathname = usePathname()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const { branding } = useBranding()
  const { resolvedTheme, setTheme } = useTheme()
  
  // Use branding company name if available
  const displayCompanyName = branding.companyName || companyName

  // Close mobile menu on route change
  useEffect(() => {
    queueMicrotask(() => setIsMobileOpen(false))
  }, [pathname])

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileOpen])

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(href)
  }

  const closeMobileMenu = () => {
    setIsMobileOpen(false)
  }

  const renderLogoDisplay = (size: 'small' | 'default' = 'default') => {
    const dimensions = size === 'small' ? 'w-8 h-8' : 'w-10 h-10'
    const iconSize = size === 'small' ? 'w-4 h-4' : 'w-5 h-5'

    if (branding.logoUrl) {
      return (
        <div className={`${dimensions} rounded-xl overflow-hidden flex items-center justify-center bg-white flex-shrink-0`}>
          <Image 
            src={branding.logoUrl} 
            alt={displayCompanyName}
            width={branding.logoWidth || 40}
            height={40}
            className="object-contain max-h-full max-w-full"
          />
        </div>
      )
    }

    return (
      <div className={`${dimensions} bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] rounded-xl flex items-center justify-center flex-shrink-0`}>
        <Building2 className={`${iconSize} text-white`} />
      </div>
    )
  }

  const renderNavLink = (item: typeof navItems[0], onClick?: () => void) => {
    const Icon = item.icon
    const active = isActive(item.href)
    const showPendingBadge = 'showPendingBadge' in item && item.showPendingBadge && pendingOrdersCount > 0
    const showOverdueBadge = 'showOverdueBadge' in item && item.showOverdueBadge && overduePaymentsCount > 0

    return (
      <Link
        href={item.href}
        onClick={onClick}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
          active ? 'bg-[var(--color-primary)] text-white' : 'text-[#1d1d1f] hover:bg-[#f5f5f7]'
        }`}
      >
        <Icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-white' : 'text-[#86868b] group-hover:text-[#1d1d1f]'}`} />
        <span className="text-[14px] font-medium">{item.label}</span>
        {showPendingBadge && (
          <span className={`ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full ${
            active ? 'bg-white/20 text-white' : 'bg-[#ff3b30] text-white'
          }`}>
            {pendingOrdersCount}
          </span>
        )}
        {showOverdueBadge && (
          <span className={`ml-auto w-2 h-2 rounded-full ${
            active ? 'bg-white' : 'bg-[#ff3b30]'
          }`} title={`${overduePaymentsCount} overdue payment${overduePaymentsCount > 1 ? 's' : ''}`} />
        )}
      </Link>
    )
  }

  return (
    <>
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white/80 backdrop-blur-xl border-b border-[#d2d2d7]/30 z-40 flex items-center justify-between px-4">
        <button
          onClick={() => setIsMobileOpen(true)}
          className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[#f5f5f7] transition-colors"
        >
          <Menu className="w-5 h-5 text-[#1d1d1f]" />
        </button>
        
        <Link href="/dashboard" className="flex items-center gap-2">
          {renderLogoDisplay('small')}
          <span className="text-[15px] font-semibold text-[#1d1d1f]">{displayCompanyName}</span>
        </Link>

        <button className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[#f5f5f7] transition-colors relative">
          <Bell className="w-5 h-5 text-[#1d1d1f]" />
          {pendingOrdersCount > 0 && (
            <span className="absolute top-2 right-2 w-2 h-2 bg-[#ff3b30] rounded-full" />
          )}
        </button>
      </header>

      {/* Mobile Sidebar Overlay */}
      {isMobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/30 backdrop-blur-sm z-[60]"
          onClick={closeMobileMenu}
        />
      )}

      {/* Mobile Sidebar */}
      <aside 
        className={`lg:hidden fixed top-0 left-0 bottom-0 w-72 bg-white z-[70] transform transition-transform duration-300 ease-out flex flex-col ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-[#d2d2d7]/30">
          <Link href="/dashboard" onClick={closeMobileMenu} className="flex items-center gap-3">
            {renderLogoDisplay()}
            <div className="overflow-hidden">
              <p className="text-[14px] font-semibold text-[#1d1d1f] truncate">{displayCompanyName}</p>
              <p className="text-[11px] text-[#86868b]">Admin Portal</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <div key={item.href}>{renderNavLink(item, closeMobileMenu)}</div>
          ))}
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t border-[#d2d2d7]/30 space-y-0.5">
          {bottomNavItems.map((item) => (
            <div key={item.href}>{renderNavLink(item, closeMobileMenu)}</div>
          ))}
          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#86868b] hover:bg-[#f5f5f7] hover:text-[#1d1d1f] transition-colors"
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
            <span className="text-[14px] font-medium">
              {resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </span>
          </button>
          <SignOutButton redirectUrl="/">
            <button
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#86868b] hover:bg-[#f5f5f7] hover:text-[#1d1d1f] transition-colors"
              type="button"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-[14px] font-medium">Sign out</span>
            </button>
          </SignOutButton>
          <div className="flex items-center gap-3 px-3 py-2.5 mt-2 rounded-xl bg-[#f5f5f7]">
            <div className="w-8 h-8 bg-[var(--color-primary)] rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-[12px] font-semibold text-white">
                {userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-[#1d1d1f] truncate">{userName}</p>
              <p className="text-[11px] text-[#86868b]">Administrator</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Desktop Sidebar - Fixed width 256px (w-64) */}
      <aside className="hidden lg:flex fixed top-0 left-0 bottom-0 w-64 bg-white border-r border-[#d2d2d7]/30 flex-col z-30">
        {/* Logo */}
        <div className="p-4 border-b border-[#d2d2d7]/30">
          <Link href="/dashboard" className="flex items-center gap-3">
            {renderLogoDisplay()}
            <div className="overflow-hidden">
              <p className="text-[14px] font-semibold text-[#1d1d1f] truncate">{displayCompanyName}</p>
              <p className="text-[11px] text-[#86868b]">Admin Portal</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <div key={item.href}>{renderNavLink(item)}</div>
          ))}
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t border-[#d2d2d7]/30 space-y-0.5">
          {bottomNavItems.map((item) => (
            <div key={item.href}>{renderNavLink(item)}</div>
          ))}
          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#86868b] hover:bg-[#f5f5f7] hover:text-[#1d1d1f] transition-colors"
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
            <span className="text-[14px] font-medium">
              {resolvedTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </span>
          </button>
          <SignOutButton redirectUrl="/">
            <button
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#86868b] hover:bg-[#f5f5f7] hover:text-[#1d1d1f] transition-colors"
              type="button"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-[14px] font-medium">Sign out</span>
            </button>
          </SignOutButton>
          <div className="flex items-center gap-3 px-3 py-2.5 mt-2 rounded-xl bg-[#f5f5f7]">
            <div className="w-8 h-8 bg-[var(--color-primary)] rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-[12px] font-semibold text-white">
                {userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-[#1d1d1f] truncate">{userName}</p>
              <p className="text-[11px] text-[#86868b]">Administrator</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
