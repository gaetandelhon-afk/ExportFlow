'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Package, ShoppingCart, ClipboardList, User, Bell, ChevronRight, ThumbsUp, Moon, Sun, FileText } from 'lucide-react'
import { useDistributor } from '@/contexts/DistributorContext'
import { useBranding } from '@/contexts/BrandingContext'
import { useTheme } from '@/contexts/ThemeContext'

const navItems = [
  { href: '/catalog', label: 'Catalog', icon: Package },
  { href: '/cart', label: 'Cart', icon: ShoppingCart },
  { href: '/my-orders', label: 'My Orders', icon: ClipboardList },
  { href: '/approvals', label: 'Approvals', icon: ThumbsUp },
  { href: '/my-quotes', label: 'My Quotes', icon: FileText },
  { href: '/account', label: 'Account', icon: User },
]

export default function DistributorNavigation() {
  const pathname = usePathname()
  const { user, cart, unreadCount, effectiveSettings } = useDistributor()
  const { branding } = useBranding()
  const { resolvedTheme, setTheme } = useTheme()

  const cartItemCount = cart?.length ?? 0
  const hasNotifications = effectiveSettings?.hasNotifications ?? true
  const notifCount = unreadCount ?? 0
  
  const displayCompanyName = branding.companyName || 'ExportFlow'

  const isDark = resolvedTheme === 'dark'
  
  return (
    <header 
      className="backdrop-blur-xl border-b sticky top-0 z-50"
      style={{ 
        backgroundColor: isDark ? 'rgba(28, 28, 30, 0.8)' : 'rgba(255, 255, 255, 0.8)',
        borderColor: isDark ? 'rgba(56, 56, 58, 0.5)' : 'rgba(210, 210, 215, 0.3)'
      }}
    >
      <div className="max-w-6xl mx-auto px-6 h-14 flex flex-row items-center justify-between">
        {/* Logo */}
        <Link href="/catalog" className="flex items-center gap-2.5 shrink-0">
          {branding.logoUrl ? (
            <div className="h-8 flex items-center">
              <Image 
                src={branding.logoUrl} 
                alt={displayCompanyName}
                width={branding.logoWidth || 120}
                height={32}
                className="object-contain max-h-8"
              />
            </div>
          ) : (
            <>
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                <span className="text-white font-semibold text-sm">
                  {displayCompanyName.slice(0, 2).toUpperCase()}
                </span>
              </div>
              <span 
                className="text-[15px] font-semibold hidden sm:block"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {displayCompanyName}
              </span>
            </>
          )}
        </Link>

        {/* Nav Links */}
        <nav className="flex flex-row items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = item.icon
            const showBadge = item.href === '/cart' && cartItemCount > 0
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-row items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors whitespace-nowrap relative"
                style={{ 
                  backgroundColor: isActive ? 'rgba(0, 113, 227, 0.1)' : 'transparent',
                  color: isActive ? 'var(--color-brand-primary)' : 'var(--color-text-primary)'
                }}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{item.label}</span>
                {showBadge && (
                  <span 
                    className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full text-white text-[10px] font-bold flex items-center justify-center px-1"
                    style={{ backgroundColor: 'var(--color-error)' }}
                  >
                    {cartItemCount > 99 ? '99+' : cartItemCount}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Right Side */}
        <div className="flex flex-row items-center gap-2 shrink-0">
          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-lg transition-colors hover:bg-gray-100"
            title={resolvedTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="w-5 h-5" style={{ color: 'var(--color-text-secondary)' }} />
            ) : (
              <Moon className="w-5 h-5" style={{ color: 'var(--color-text-secondary)' }} />
            )}
          </button>

          {/* Notifications */}
          {hasNotifications && (
            <Link
              href="/notifications"
              className="relative p-2 rounded-lg transition-colors hover:bg-gray-100"
            >
              <Bell className="w-5 h-5" style={{ color: 'var(--color-text-secondary)' }} />
              {notifCount > 0 && (
                <span 
                  className="absolute top-1 right-1 w-2 h-2 rounded-full"
                  style={{ backgroundColor: 'var(--color-error)' }}
                />
              )}
            </Link>
          )}

          {/* User Info */}
          <div className="flex flex-row items-center gap-2 pl-2 border-l border-gray-200">
            <div className="text-right hidden md:block">
              <p 
                className="text-[13px] font-medium"
                style={{ color: 'var(--color-text-primary)' }}
              >
                {user?.name || 'User'}
              </p>
              <p 
                className="text-[11px]"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {user?.company || ''}
              </p>
            </div>
            <Link
              href="/account"
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'var(--color-avatar-bg)' }}
            >
              <span className="text-white text-[13px] font-medium">
                {user?.name?.charAt(0) || 'U'}
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* Cart Summary Bar */}
      {cartItemCount > 0 && pathname !== '/cart' && pathname !== '/checkout' && (
        <div 
          className="border-t px-6 py-2"
          style={{ 
            backgroundColor: 'rgba(0, 113, 227, 0.05)',
            borderColor: 'rgba(0, 113, 227, 0.1)'
          }}
        >
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <p 
              className="text-[13px]"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {cartItemCount} product{cartItemCount !== 1 ? 's' : ''}
              </span>
              {' '}in your cart
            </p>
            <Link
              href="/cart"
              className="text-[13px] font-medium flex items-center gap-1"
              style={{ color: 'var(--color-brand-primary)' }}
            >
              View Cart
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}