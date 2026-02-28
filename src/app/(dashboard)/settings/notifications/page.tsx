'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  ChevronLeft, Bell, Save, Loader2, CheckCircle, 
  Mail, ShoppingCart, Package, DollarSign, AlertTriangle, Users
} from 'lucide-react'

interface NotificationSetting {
  id: string
  category: string
  title: string
  description: string
  email: boolean
  inApp: boolean
  icon: typeof Bell
  color: string
}

interface NotificationSettings {
  // Email Settings
  emailEnabled: boolean
  emailFrom: string
  emailReplyTo: string
  
  // Notification toggles
  notifications: NotificationSetting[]
}

const STORAGE_KEY = 'orderbridge_notification_settings'

const DEFAULT_NOTIFICATIONS: NotificationSetting[] = [
  {
    id: 'new_order',
    category: 'Orders',
    title: 'New Order',
    description: 'When a new order is placed',
    email: true,
    inApp: true,
    icon: ShoppingCart,
    color: '#0071e3'
  },
  {
    id: 'order_confirmed',
    category: 'Orders',
    title: 'Order Confirmed',
    description: 'When an order is confirmed',
    email: true,
    inApp: true,
    icon: CheckCircle,
    color: '#34c759'
  },
  {
    id: 'order_shipped',
    category: 'Orders',
    title: 'Order Shipped',
    description: 'When an order is shipped',
    email: true,
    inApp: true,
    icon: Package,
    color: '#ff9500'
  },
  {
    id: 'payment_received',
    category: 'Payments',
    title: 'Payment Received',
    description: 'When a payment is received',
    email: true,
    inApp: true,
    icon: DollarSign,
    color: '#34c759'
  },
  {
    id: 'payment_overdue',
    category: 'Payments',
    title: 'Payment Overdue',
    description: 'When a payment becomes overdue',
    email: true,
    inApp: true,
    icon: AlertTriangle,
    color: '#ff3b30'
  },
  {
    id: 'low_stock',
    category: 'Inventory',
    title: 'Low Stock Alert',
    description: 'When product stock is low',
    email: false,
    inApp: true,
    icon: Package,
    color: '#ff9500'
  },
  {
    id: 'new_customer',
    category: 'Customers',
    title: 'New Customer',
    description: 'When a new customer registers',
    email: false,
    inApp: true,
    icon: Users,
    color: '#5856d6'
  },
]

const DEFAULT_SETTINGS: NotificationSettings = {
  emailEnabled: true,
  emailFrom: '',
  emailReplyTo: '',
  notifications: DEFAULT_NOTIFICATIONS
}

export default function NotificationsSettingsPage() {
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        // Merge with defaults to ensure all notifications exist
        setSettings({
          ...DEFAULT_SETTINGS,
          ...parsed,
          notifications: DEFAULT_NOTIFICATIONS.map(n => {
            const saved = parsed.notifications?.find((s: NotificationSetting) => s.id === n.id)
            return saved ? { ...n, email: saved.email, inApp: saved.inApp } : n
          })
        })
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
    setLoading(false)
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      console.error('Failed to save:', error)
    } finally {
      setSaving(false)
    }
  }

  const updateNotification = (id: string, field: 'email' | 'inApp', value: boolean) => {
    setSettings(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => 
        n.id === id ? { ...n, [field]: value } : n
      )
    }))
  }

  const toggleAll = (field: 'email' | 'inApp', value: boolean) => {
    setSettings(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => ({ ...n, [field]: value }))
    }))
  }

  // Group notifications by category
  const groupedNotifications = settings.notifications.reduce((acc, n) => {
    if (!acc[n.category]) acc[n.category] = []
    acc[n.category].push(n)
    return acc
  }, {} as Record<string, NotificationSetting[]>)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0071e3]"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Link href="/settings" className="text-[#0071e3] hover:text-[#0077ed] flex items-center gap-1 text-[13px] mb-4">
        <ChevronLeft className="w-4 h-4" />
        Back to Settings
      </Link>
      
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#ff9500]/10 rounded-xl flex items-center justify-center">
            <Bell className="w-6 h-6 text-[#ff9500]" />
          </div>
          <div>
            <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">Notifications</h1>
            <p className="text-[15px] text-[#86868b] mt-1">
              Configure email notifications and alerts
            </p>
          </div>
        </div>
        
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#0071e3] text-white rounded-xl text-[14px] font-medium hover:bg-[#0077ED] transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <div className="space-y-6">
        {/* Email Settings */}
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Mail className="w-5 h-5 text-[#0071e3]" />
            <h2 className="text-[17px] font-semibold text-[#1d1d1f]">Email Settings</h2>
          </div>
          
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.emailEnabled}
                onChange={(e) => setSettings(prev => ({ ...prev, emailEnabled: e.target.checked }))}
                className="w-5 h-5 rounded border-[#d2d2d7] text-[#0071e3] focus:ring-[#0071e3]"
              />
              <div>
                <p className="text-[14px] font-medium text-[#1d1d1f]">Enable Email Notifications</p>
                <p className="text-[12px] text-[#86868b]">Receive notifications via email</p>
              </div>
            </label>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">From Email</label>
                <input
                  type="email"
                  value={settings.emailFrom}
                  onChange={(e) => setSettings(prev => ({ ...prev, emailFrom: e.target.value }))}
                  placeholder="noreply@yourcompany.com"
                  className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Reply-To Email</label>
                <input
                  type="email"
                  value={settings.emailReplyTo}
                  onChange={(e) => setSettings(prev => ({ ...prev, emailReplyTo: e.target.value }))}
                  placeholder="support@yourcompany.com"
                  className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Notification Types */}
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-[#ff9500]" />
              <h2 className="text-[17px] font-semibold text-[#1d1d1f]">Notification Types</h2>
            </div>
            <div className="flex items-center gap-3 text-[12px]">
              <span className="text-[#86868b]">Email:</span>
              <button
                onClick={() => toggleAll('email', true)}
                className="text-[#0071e3] hover:underline"
              >
                Enable all
              </button>
              <button
                onClick={() => toggleAll('email', false)}
                className="text-[#86868b] hover:underline"
              >
                Disable all
              </button>
              <span className="text-[#d2d2d7]">|</span>
              <span className="text-[#86868b]">In-App:</span>
              <button
                onClick={() => toggleAll('inApp', true)}
                className="text-[#0071e3] hover:underline"
              >
                Enable all
              </button>
              <button
                onClick={() => toggleAll('inApp', false)}
                className="text-[#86868b] hover:underline"
              >
                Disable all
              </button>
            </div>
          </div>
          
          {/* Table Header */}
          <div className="flex items-center px-4 py-2 bg-[#f5f5f7] rounded-lg mb-2">
            <span className="flex-1 text-[12px] font-medium text-[#86868b] uppercase">Notification</span>
            <span className="w-[200px] text-[12px] font-medium text-[#86868b] uppercase text-center">Channels</span>
          </div>
          
          {/* Grouped Notifications */}
          {Object.entries(groupedNotifications).map(([category, notifications]) => (
            <div key={category} className="mb-4">
              <p className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wider px-4 py-2">{category}</p>
              <div className="space-y-1">
                {notifications.map(n => {
                  const Icon = n.icon
                  return (
                    <div key={n.id} className="flex items-center px-4 py-3 hover:bg-[#f5f5f7]/50 rounded-lg transition-colors">
                      <div className="flex-1 flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${n.color}15` }}
                        >
                          <Icon className="w-4 h-4" style={{ color: n.color }} />
                        </div>
                        <div>
                          <p className="text-[14px] font-medium text-[#1d1d1f]">{n.title}</p>
                          <p className="text-[12px] text-[#86868b]">{n.description}</p>
                        </div>
                      </div>
                      <div className="w-[200px] flex items-center justify-center gap-6">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={n.email}
                            onChange={(e) => updateNotification(n.id, 'email', e.target.checked)}
                            className="w-4 h-4 rounded border-[#d2d2d7] text-[#0071e3] focus:ring-[#0071e3]"
                          />
                          <span className="text-[12px] text-[#86868b]">Email</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={n.inApp}
                            onChange={(e) => updateNotification(n.id, 'inApp', e.target.checked)}
                            className="w-4 h-4 rounded border-[#d2d2d7] text-[#0071e3] focus:ring-[#0071e3]"
                          />
                          <span className="text-[12px] text-[#86868b]">In-App</span>
                        </label>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
