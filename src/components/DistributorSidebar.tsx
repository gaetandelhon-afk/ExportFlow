'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { 
  Package, ShoppingCart, ClipboardList, FileText, 
  User, Bell, Ship, Receipt, Sun, Moon
} from 'lucide-react'
import { useDistributor } from '@/contexts/DistributorContext'
import { useBranding } from '@/contexts/BrandingContext'
import { usePreview } from '@/contexts/PreviewContext'
import { useTheme } from '@/contexts/ThemeContext'

const navItems = [
  { href: '/catalog', label: 'Catalog', icon: Package },
  { href: '/order', label: 'New Order', icon: ShoppingCart },
  { href: '/my-orders', label: 'My Orders', icon: ClipboardList },
  { href: '/my-quotes', label: 'My Quotes', icon: FileText },
  { href: '/my-packing-lists', label: 'Packing Lists', icon: Ship },
  { href: '/my-invoices', label: 'Invoices', icon: Receipt },
]

const bottomNavItems = [
  { href: '/account', label: 'My Account', icon: User },
  { href: '/notifications', label: 'Notifications', icon: Bell },
]

export default function DistributorSidebar() {
  const pathname = usePathname()
  const { user, unreadCount } = useDistributor()
  const { branding } = useBranding()
  const { isPreviewMode } = usePreview()
  const { resolvedTheme, setTheme } = useTheme()

  const displayCompanyName = branding.companyName || 'ExportFlow'
  const topOffset = isPreviewMode ? '48px' : '0'
  const isDark = resolvedTheme === 'dark'

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark')
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <aside 
        className="hidden lg:flex fixed left-0 bottom-0 w-64 bg-white border-r border-[#d2d2d7]/30 flex-col z-30"
        style={{ top: topOffset }}
      >
        {/* Logo */}
        <div className="p-4 border-b border-[#d2d2d7]/30">
          <Link href="/catalog" className="flex items-center gap-3">
            {branding.logoUrl ? (
              <Image 
                src={branding.logoUrl} 
                alt={displayCompanyName}
                width={branding.logoWidth || 140}
                height={36}
                className="object-contain max-h-9"
              />
            ) : (
              <>
                <div 
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: 'var(--color-brand-primary)' }}
                >
                  <span className="text-white font-bold text-sm">
                    {displayCompanyName.slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div className="overflow-hidden">
                  <p className="text-[14px] font-semibold text-[#1d1d1f] truncate">{displayCompanyName}</p>
                  <p className="text-[11px] text-[#86868b]">Customer Portal</p>
                </div>
              </>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = item.icon
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
                  isActive
                    ? 'text-white'
                    : 'text-[#1d1d1f] hover:bg-[#f5f5f7]'
                }`}
                style={isActive ? { backgroundColor: 'var(--color-brand-primary)' } : {}}
              >
                <Icon className="w-[18px] h-[18px]" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t border-[#d2d2d7]/30 space-y-1">
          {bottomNavItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            const showBadge = item.href === '/notifications' && unreadCount > 0
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all relative ${
                  isActive
                    ? 'bg-[#f5f5f7] text-[#1d1d1f]'
                    : 'text-[#86868b] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]'
                }`}
              >
                <Icon className="w-[18px] h-[18px]" />
                <span>{item.label}</span>
                {showBadge && (
                  <span 
                    className="absolute right-3 min-w-[18px] h-[18px] rounded-full text-white text-[10px] font-bold flex items-center justify-center px-1"
                    style={{ backgroundColor: 'var(--color-error)' }}
                  >
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
            )
          })}
          
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all w-full text-[#86868b] hover:bg-[#f5f5f7] hover:text-[#1d1d1f]"
          >
            {isDark ? (
              <>
                <Sun className="w-[18px] h-[18px]" />
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-[18px] h-[18px]" />
                <span>Dark Mode</span>
              </>
            )}
          </button>
          
          {/* User Info */}
          <div className="flex items-center gap-3 px-3 py-2.5 mt-2 rounded-xl bg-[#f5f5f7]">
            <div 
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'var(--color-brand-primary)' }}
            >
              <span className="text-[12px] font-semibold text-white">
                {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-[#1d1d1f] truncate">{user?.name || 'Customer'}</p>
              <p className="text-[11px] text-[#86868b] truncate">{user?.company || ''}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header 
        className="lg:hidden fixed left-0 right-0 h-14 bg-white border-b border-[#d2d2d7]/30 z-40 flex items-center px-4"
        style={{ top: topOffset }}
      >
        <Link href="/catalog" className="flex items-center gap-2">
          {branding.logoUrl ? (
            <Image 
              src={branding.logoUrl} 
              alt={displayCompanyName}
              width={100}
              height={28}
              className="object-contain max-h-7"
            />
          ) : (
            <span className="text-[15px] font-semibold text-[#1d1d1f]">{displayCompanyName}</span>
          )}
        </Link>
        
        <nav className="flex-1 flex items-center justify-end gap-1">
          {navItems.slice(0, 4).map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = item.icon
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`p-2 rounded-lg transition-colors ${
                  isActive ? 'bg-[#f5f5f7]' : ''
                }`}
                style={isActive ? { color: 'var(--color-brand-primary)' } : { color: '#86868b' }}
              >
                <Icon className="w-5 h-5" />
              </Link>
            )
          })}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg transition-colors"
            style={{ color: '#86868b' }}
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </nav>
      </header>
    </>
  )
}
