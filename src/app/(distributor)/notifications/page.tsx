'use client'

import Link from 'next/link'
import { useDistributor } from '@/contexts/DistributorContext'
import { 
  Bell, Package, Tag, Info, ChevronRight, Check, CheckCheck, FileText
} from 'lucide-react'

const iconMap: Record<string, typeof Package> = {
  order: Package,
  promo: Tag,
  info: Info,
  quote: FileText,
}

const colorMap: Record<string, { bg: string; color: string }> = {
  order: { bg: 'rgba(0, 113, 227, 0.1)', color: 'var(--color-brand-primary)' },
  promo: { bg: 'rgba(255, 149, 0, 0.1)', color: 'var(--color-warning)' },
  info: { bg: 'rgba(88, 86, 214, 0.1)', color: 'var(--color-info)' },
  quote: { bg: 'rgba(52, 199, 89, 0.1)', color: 'var(--color-success)' },
}

export default function NotificationsPage() {
  const { notifications, markAsRead, markAllAsRead, unreadCount } = useDistributor()

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 
              className="text-[28px] font-semibold tracking-tight"
              style={{ color: 'var(--color-text-primary)' }}
            >
              Notifications
            </h1>
            <p 
              className="text-[15px] mt-1"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              {unreadCount > 0 
                ? `You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}`
                : 'All caught up!'}
            </p>
          </div>
          
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-[13px] font-medium flex items-center gap-1.5"
              style={{ color: 'var(--color-brand-primary)' }}
            >
              <CheckCheck className="w-4 h-4" />
              Mark all as read
            </button>
          )}
        </div>

        {/* Notifications List */}
        {notifications.length > 0 ? (
          <div className="space-y-3">
            {notifications.map((notification) => {
              const Icon = iconMap[notification.type] || Info
              const colors = colorMap[notification.type] || colorMap.info
              
              return (
                <div
                  key={notification.id}
                  className={`card p-4 transition-all ${!notification.read ? 'ring-2 ring-blue-100' : ''}`}
                  style={{ 
                    backgroundColor: notification.read ? 'var(--color-bg-secondary)' : 'rgba(0, 113, 227, 0.02)'
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: colors.bg }}
                    >
                      <Icon className="w-5 h-5" style={{ color: colors.color }} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p 
                          className={`text-[14px] ${notification.read ? 'font-medium' : 'font-semibold'}`}
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          {notification.title}
                        </p>
                        <span 
                          className="text-[11px] shrink-0"
                          style={{ color: 'var(--color-text-secondary)' }}
                        >
                          {formatDate(notification.date)}
                        </span>
                      </div>
                      
                      <p 
                        className="text-[13px] mt-1"
                        style={{ color: 'var(--color-text-secondary)' }}
                      >
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center justify-between mt-3">
                        {notification.link ? (
                          <Link
                            href={notification.link}
                            onClick={() => markAsRead(notification.id)}
                            className="text-[12px] font-medium flex items-center gap-1"
                            style={{ color: 'var(--color-brand-primary)' }}
                          >
                            View Details
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Link>
                        ) : (
                          <span />
                        )}
                        
                        {!notification.read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="text-[12px] font-medium flex items-center gap-1"
                            style={{ color: 'var(--color-text-secondary)' }}
                          >
                            <Check className="w-3.5 h-3.5" />
                            Mark as read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="card p-12 text-center">
            <Bell className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--color-text-tertiary)' }} />
            <p 
              className="text-[15px] mb-2"
              style={{ color: 'var(--color-text-primary)' }}
            >
              No notifications
            </p>
            <p 
              className="text-[13px]"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              You&apos;ll see order updates and important messages here
            </p>
          </div>
        )}
    </div>
  )
}