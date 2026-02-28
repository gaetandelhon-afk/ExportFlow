'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronLeft, Globe, Loader2, CheckCircle, AlertCircle, Copy, ExternalLink } from 'lucide-react'
import { FeatureGate } from '@/components/FeatureGate'

export default function DomainSettingsPage() {
  const [slug, setSlug] = useState('')
  const [customDomain, setCustomDomain] = useState('')
  const [savedDomain, setSavedDomain] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/settings/domain')
      .then((res) => res.json())
      .then((data) => {
        setSlug(data.slug || '')
        setCustomDomain(data.customDomain || '')
        setSavedDomain(data.customDomain || null)
      })
      .catch(() => setError('Failed to load domain settings'))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSuccess(false)

    try {
      const res = await fetch('/api/settings/domain', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customDomain: customDomain.trim() || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }

      const data = await res.json()
      setSavedDomain(data.customDomain)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleRemoveDomain = async () => {
    if (!confirm('Remove custom domain? Your portal will only be accessible via the default URL.')) return
    setCustomDomain('')
    setSaving(true)
    try {
      const res = await fetch('/api/settings/domain', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customDomain: null }),
      })
      if (res.ok) {
        setSavedDomain(null)
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      }
    } catch {
      setError('Failed to remove domain')
    } finally {
      setSaving(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0071e3]"></div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/settings" className="text-[#0071e3] hover:text-[#0077ed] flex items-center gap-1 text-[13px] mb-4">
        <ChevronLeft className="w-4 h-4" />
        Back to Settings
      </Link>

      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-[#34c759]/10 rounded-xl flex items-center justify-center">
          <Globe className="w-6 h-6 text-[#34c759]" />
        </div>
        <div>
          <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">Custom Domain</h1>
          <p className="text-[15px] text-[#86868b] mt-1">
            Use your own domain for the distributor portal
          </p>
        </div>
      </div>

      {/* Default URL */}
      <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-6 mb-6">
        <h2 className="text-[15px] font-semibold text-[#1d1d1f] mb-2">Default Portal URL</h2>
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-[#f5f5f7] px-4 py-2.5 rounded-lg text-[14px] text-[#1d1d1f] font-mono">
            {slug}.exportflow.io
          </code>
          <button
            onClick={() => copyToClipboard(`https://${slug}.exportflow.io`)}
            className="p-2.5 hover:bg-[#f5f5f7] rounded-lg transition-colors"
            title="Copy URL"
          >
            {copied ? <CheckCircle className="w-4 h-4 text-[#34c759]" /> : <Copy className="w-4 h-4 text-[#86868b]" />}
          </button>
          <a
            href={`https://${slug}.exportflow.io`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 hover:bg-[#f5f5f7] rounded-lg transition-colors"
          >
            <ExternalLink className="w-4 h-4 text-[#86868b]" />
          </a>
        </div>
        <p className="text-[13px] text-[#86868b] mt-2">
          This URL is always active, even if you configure a custom domain.
        </p>
      </div>

      {/* Custom domain */}
      <FeatureGate feature="custom_domain">
        <div className="bg-white rounded-2xl border border-[#d2d2d7]/30 p-6 mb-6">
          <h2 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">Custom Domain</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-[#1d1d1f] mb-1.5">Domain</label>
              <input
                type="text"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value.toLowerCase())}
                placeholder="orders.yourcompany.com"
                className="w-full h-10 px-3 bg-[#f5f5f7] border-0 rounded-lg text-[14px] focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              />
            </div>

            {/* DNS Instructions */}
            <div className="bg-[#f5f5f7] rounded-xl p-4">
              <h3 className="text-[13px] font-semibold text-[#1d1d1f] mb-2">DNS Configuration</h3>
              <p className="text-[13px] text-[#86868b] mb-3">
                Add a CNAME record in your DNS provider pointing to ExportFlow:
              </p>
              <div className="bg-white rounded-lg p-3 font-mono text-[13px]">
                <div className="grid grid-cols-3 gap-4 mb-1 text-[#86868b] font-sans font-medium">
                  <span>Type</span>
                  <span>Name</span>
                  <span>Value</span>
                </div>
                <div className="grid grid-cols-3 gap-4 text-[#1d1d1f]">
                  <span>CNAME</span>
                  <span>{customDomain || 'orders'}</span>
                  <span>cname.vercel-dns.com</span>
                </div>
              </div>
              <p className="text-[12px] text-[#86868b] mt-2">
                DNS propagation can take up to 24 hours. Your custom domain will work once the CNAME record is active.
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-[13px]">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-[13px]">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                Domain settings saved successfully
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 bg-[#0071e3] text-white rounded-xl text-[14px] font-medium hover:bg-[#0077ED] transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Save Domain
              </button>
              {savedDomain && (
                <button
                  onClick={handleRemoveDomain}
                  disabled={saving}
                  className="px-6 py-2.5 bg-[#f5f5f7] text-[#ff3b30] rounded-xl text-[14px] font-medium hover:bg-[#e8e8ed] transition-colors disabled:opacity-50"
                >
                  Remove Domain
                </button>
              )}
            </div>
          </div>
        </div>
      </FeatureGate>
    </div>
  )
}
