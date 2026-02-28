'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  ChevronLeft, Shield, Save, Loader2, CheckCircle, 
  Key, Mail, Clock, AlertTriangle, Copy, Check, Smartphone,
  RefreshCw, Lock, Users
} from 'lucide-react'

interface SecuritySettings {
  // Email Code Settings
  codeExpiryMinutes: number
  codeLength: number
  maxCodeAttempts: number
  
  // Session
  sessionTimeoutMinutes: number
  maxConcurrentSessions: number
  rememberDeviceDays: number
  
  // Login Security
  maxLoginAttempts: number
  lockoutDurationMinutes: number
  
  // Allowed Domains (whitelist)
  allowedEmailDomains: string[]
  restrictToAllowedDomains: boolean
  
  // API Keys
  apiKeys: ApiKey[]
}

interface ApiKey {
  id: string
  name: string
  key: string
  createdAt: string
  lastUsed: string | null
  permissions: string[]
}

const STORAGE_KEY = 'orderbridge_security_settings'

const DEFAULT_SETTINGS: SecuritySettings = {
  codeExpiryMinutes: 10,
  codeLength: 6,
  maxCodeAttempts: 3,
  sessionTimeoutMinutes: 480, // 8 hours
  maxConcurrentSessions: 3,
  rememberDeviceDays: 30,
  maxLoginAttempts: 5,
  lockoutDurationMinutes: 15,
  allowedEmailDomains: [],
  restrictToAllowedDomains: false,
  apiKeys: []
}

export default function SecuritySettingsPage() {
  const [settings, setSettings] = useState<SecuritySettings>(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showNewKeyModal, setShowNewKeyModal] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null)
  const [newDomain, setNewDomain] = useState('')
  const [sessionDurationDays, setSessionDurationDays] = useState(7)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) })
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
    }

    fetch('/api/user/preferences')
      .then((r) => r.json())
      .then((data) => {
        if (data.sessionDurationDays) setSessionDurationDays(data.sessionDurationDays)
      })
      .catch(() => {})

    setLoading(false)
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))

      await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionDurationDays: String(sessionDurationDays) }),
      })

      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      console.error('Failed to save:', error)
    } finally {
      setSaving(false)
    }
  }

  const addDomain = () => {
    if (!newDomain || settings.allowedEmailDomains.includes(newDomain)) return
    setSettings(prev => ({
      ...prev,
      allowedEmailDomains: [...prev.allowedEmailDomains, newDomain.toLowerCase()]
    }))
    setNewDomain('')
  }

  const removeDomain = (domain: string) => {
    setSettings(prev => ({
      ...prev,
      allowedEmailDomains: prev.allowedEmailDomains.filter(d => d !== domain)
    }))
  }

  const generateApiKey = () => {
    if (!newKeyName) return
    
    const key = `ob_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
    const newApiKey: ApiKey = {
      id: `key_${Date.now()}`,
      name: newKeyName,
      key,
      createdAt: new Date().toISOString(),
      lastUsed: null,
      permissions: ['read', 'write']
    }
    
    setSettings(prev => ({
      ...prev,
      apiKeys: [...prev.apiKeys, newApiKey]
    }))
    setNewKeyName('')
    setShowNewKeyModal(false)
  }

  const deleteApiKey = (keyId: string) => {
    if (!confirm('Delete this API key? This action cannot be undone.')) return
    setSettings(prev => ({
      ...prev,
      apiKeys: prev.apiKeys.filter(k => k.id !== keyId)
    }))
  }

  const copyToClipboard = (key: string, keyId: string) => {
    navigator.clipboard.writeText(key)
    setCopiedKeyId(keyId)
    setTimeout(() => setCopiedKeyId(null), 2000)
  }

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
          <div className="w-12 h-12 bg-[#ff3b30]/10 rounded-xl flex items-center justify-center">
            <Shield className="w-6 h-6 text-[#ff3b30]" />
          </div>
          <div>
            <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">Security</h1>
            <p className="text-[15px] text-[#86868b] mt-1">
              Email verification, sessions, and API access
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
        {/* Authentication Method Info */}
        <div className="bg-[#0071e3]/5 border border-[#0071e3]/20 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-[#0071e3]/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <Mail className="w-6 h-6 text-[#0071e3]" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-1">Passwordless Authentication</h3>
              <p className="text-[14px] text-[#86868b]">
                ExportFlow uses secure email-based authentication. Users receive a {settings.codeLength}-digit verification code 
                sent to their registered email address. No passwords to remember or manage.
              </p>
              <div className="flex items-center gap-4 mt-3">
                <span className="inline-flex items-center gap-1.5 text-[12px] text-[#34c759]">
                  <CheckCircle className="w-4 h-4" />
                  Secure
                </span>
                <span className="inline-flex items-center gap-1.5 text-[12px] text-[#34c759]">
                  <CheckCircle className="w-4 h-4" />
                  No password breaches
                </span>
                <span className="inline-flex items-center gap-1.5 text-[12px] text-[#34c759]">
                  <CheckCircle className="w-4 h-4" />
                  Easy to use
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Email Verification Settings */}
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Smartphone className="w-5 h-5 text-[#0071e3]" />
            <h2 className="text-[17px] font-semibold text-[#1d1d1f]">Verification Code Settings</h2>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Code Length</label>
              <select
                value={settings.codeLength}
                onChange={(e) => setSettings(prev => ({ ...prev, codeLength: parseInt(e.target.value) }))}
                className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              >
                <option value={4}>4 digits</option>
                <option value={6}>6 digits (recommended)</option>
                <option value={8}>8 digits</option>
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Code Expiry (minutes)</label>
              <input
                type="number"
                value={settings.codeExpiryMinutes}
                onChange={(e) => setSettings(prev => ({ ...prev, codeExpiryMinutes: parseInt(e.target.value) || 10 }))}
                min={1}
                max={30}
                className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Max Code Attempts</label>
              <input
                type="number"
                value={settings.maxCodeAttempts}
                onChange={(e) => setSettings(prev => ({ ...prev, maxCodeAttempts: parseInt(e.target.value) || 3 }))}
                min={1}
                max={10}
                className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              />
              <p className="text-[11px] text-[#86868b] mt-1">Before code is invalidated</p>
            </div>
          </div>
        </div>

        {/* Allowed Email Domains */}
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-[#5856d6]" />
              <div>
                <h2 className="text-[17px] font-semibold text-[#1d1d1f]">Allowed Email Domains</h2>
                <p className="text-[12px] text-[#86868b]">Restrict login to specific email domains</p>
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.restrictToAllowedDomains}
                onChange={(e) => setSettings(prev => ({ ...prev, restrictToAllowedDomains: e.target.checked }))}
                className="w-5 h-5 rounded border-[#d2d2d7] text-[#0071e3] focus:ring-[#0071e3]"
              />
              <span className="text-[14px] text-[#1d1d1f]">Enable restriction</span>
            </label>
          </div>
          
          {settings.restrictToAllowedDomains && (
            <>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  placeholder="company.com"
                  className="flex-1 h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                  onKeyDown={(e) => e.key === 'Enter' && addDomain()}
                />
                <button
                  onClick={addDomain}
                  disabled={!newDomain}
                  className="px-4 h-10 bg-[#0071e3] text-white rounded-lg text-[14px] font-medium hover:bg-[#0077ED] transition-colors disabled:opacity-50"
                >
                  Add Domain
                </button>
              </div>
              
              {settings.allowedEmailDomains.length === 0 ? (
                <div className="bg-[#ff9500]/10 rounded-lg p-3">
                  <p className="text-[12px] text-[#ff9500]">
                    <AlertTriangle className="w-4 h-4 inline mr-1" />
                    No domains configured. Add at least one domain to enable restriction.
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {settings.allowedEmailDomains.map(domain => (
                    <span
                      key={domain}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#f5f5f7] rounded-lg text-[14px]"
                    >
                      @{domain}
                      <button
                        onClick={() => removeDomain(domain)}
                        className="text-[#ff3b30] hover:text-[#ff3b30]/70"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
          
          {!settings.restrictToAllowedDomains && (
            <p className="text-[13px] text-[#86868b]">
              Any email address registered in your customer or user database can request a login code.
            </p>
          )}
        </div>

        {/* Session Settings */}
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Clock className="w-5 h-5 text-[#ff9500]" />
            <h2 className="text-[17px] font-semibold text-[#1d1d1f]">Session Settings</h2>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Stay logged in</label>
              <select
                value={sessionDurationDays}
                onChange={(e) => setSessionDurationDays(parseInt(e.target.value))}
                className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              >
                <option value={1}>1 day</option>
                <option value={7}>7 days</option>
                <option value={15}>15 days</option>
                <option value={30}>30 days</option>
              </select>
              <p className="text-[11px] text-[#86868b] mt-1">Auto-logout after inactivity</p>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Session Timeout</label>
              <select
                value={settings.sessionTimeoutMinutes}
                onChange={(e) => setSettings(prev => ({ ...prev, sessionTimeoutMinutes: parseInt(e.target.value) }))}
                className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              >
                <option value={60}>1 hour</option>
                <option value={240}>4 hours</option>
                <option value={480}>8 hours</option>
                <option value={1440}>24 hours</option>
                <option value={10080}>7 days</option>
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Max Concurrent Sessions</label>
              <input
                type="number"
                value={settings.maxConcurrentSessions}
                onChange={(e) => setSettings(prev => ({ ...prev, maxConcurrentSessions: parseInt(e.target.value) || 1 }))}
                min={1}
                max={10}
                className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Remember Device (days)</label>
              <input
                type="number"
                value={settings.rememberDeviceDays}
                onChange={(e) => setSettings(prev => ({ ...prev, rememberDeviceDays: parseInt(e.target.value) || 30 }))}
                min={1}
                max={365}
                className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              />
            </div>
          </div>
        </div>

        {/* Login Security */}
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Lock className="w-5 h-5 text-[#ff3b30]" />
            <h2 className="text-[17px] font-semibold text-[#1d1d1f]">Login Protection</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Max Failed Login Attempts</label>
              <input
                type="number"
                value={settings.maxLoginAttempts}
                onChange={(e) => setSettings(prev => ({ ...prev, maxLoginAttempts: parseInt(e.target.value) || 5 }))}
                min={3}
                max={10}
                className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              />
              <p className="text-[11px] text-[#86868b] mt-1">Before account is temporarily locked</p>
            </div>
            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Lockout Duration (minutes)</label>
              <input
                type="number"
                value={settings.lockoutDurationMinutes}
                onChange={(e) => setSettings(prev => ({ ...prev, lockoutDurationMinutes: parseInt(e.target.value) || 15 }))}
                min={5}
                max={60}
                className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              />
            </div>
          </div>
        </div>

        {/* API Keys */}
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Key className="w-5 h-5 text-[#5856d6]" />
              <h2 className="text-[17px] font-semibold text-[#1d1d1f]">API Keys</h2>
            </div>
            <button
              onClick={() => setShowNewKeyModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#0071e3] text-white rounded-lg text-[13px] font-medium hover:bg-[#0077ED] transition-colors"
            >
              <Key className="w-4 h-4" />
              Generate Key
            </button>
          </div>
          
          {settings.apiKeys.length === 0 ? (
            <div className="text-center py-8">
              <Key className="w-10 h-10 text-[#86868b] mx-auto mb-3" />
              <p className="text-[14px] text-[#86868b]">No API keys yet</p>
              <p className="text-[12px] text-[#86868b]">Generate a key for external integrations</p>
            </div>
          ) : (
            <div className="space-y-3">
              {settings.apiKeys.map(key => (
                <div key={key.id} className="flex items-center justify-between p-4 bg-[#f5f5f7] rounded-xl">
                  <div className="flex-1">
                    <p className="text-[14px] font-medium text-[#1d1d1f]">{key.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-[12px] text-[#86868b] font-mono bg-white px-2 py-0.5 rounded">
                        {key.key.substring(0, 20)}...
                      </code>
                      <button
                        onClick={() => copyToClipboard(key.key, key.id)}
                        className="p-1 hover:bg-white rounded transition-colors"
                      >
                        {copiedKeyId === key.id ? (
                          <Check className="w-4 h-4 text-[#34c759]" />
                        ) : (
                          <Copy className="w-4 h-4 text-[#86868b]" />
                        )}
                      </button>
                    </div>
                    <p className="text-[11px] text-[#86868b] mt-1">
                      Created: {new Date(key.createdAt).toLocaleDateString('fr-FR')}
                      {key.lastUsed && ` · Last used: ${new Date(key.lastUsed).toLocaleDateString('fr-FR')}`}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteApiKey(key.id)}
                    className="p-2 text-[#ff3b30] hover:bg-[#ff3b30]/10 rounded-lg transition-colors"
                  >
                    <AlertTriangle className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* New API Key Modal */}
      {showNewKeyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 m-4">
            <h2 className="text-[17px] font-semibold text-[#1d1d1f] mb-4">Generate API Key</h2>
            
            <div className="mb-6">
              <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Key Name</label>
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g., Production API"
                className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              />
            </div>

            <div className="bg-[#ff9500]/10 rounded-lg p-3 mb-6">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-[#ff9500] flex-shrink-0 mt-0.5" />
                <p className="text-[12px] text-[#ff9500]">
                  The API key will only be shown once. Make sure to copy it before closing this dialog.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowNewKeyModal(false); setNewKeyName('') }}
                className="flex-1 h-10 bg-[#f5f5f7] text-[#1d1d1f] rounded-xl text-[14px] font-medium hover:bg-[#e8e8ed] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={generateApiKey}
                disabled={!newKeyName}
                className="flex-1 h-10 bg-[#0071e3] text-white rounded-xl text-[14px] font-medium hover:bg-[#0077ED] transition-colors disabled:opacity-50"
              >
                Generate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
