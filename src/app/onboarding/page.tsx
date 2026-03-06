'use client'

import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@clerk/nextjs'
import { Building2, Globe, Loader2, CheckCircle, Link2, AlertCircle, Mail, Phone } from 'lucide-react'

const COUNTRIES = [
  { code: 'FR', name: 'France' },
  { code: 'BE', name: 'Belgium' },
  { code: 'CH', name: 'Switzerland' },
  { code: 'CA', name: 'Canada' },
  { code: 'US', name: 'United States' },
  { code: 'UK', name: 'United Kingdom' },
  { code: 'DE', name: 'Germany' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'PT', name: 'Portugal' },
  { code: 'MA', name: 'Morocco' },
  { code: 'TN', name: 'Tunisia' },
  { code: 'SN', name: 'Senegal' },
  { code: 'CI', name: "Ivory Coast" },
  { code: 'OTHER', name: 'Other' },
]

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 30)
}

export default function OnboardingPage() {
  const { user } = useUser()
  const [companyName, setCompanyName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null)
  const [slugCheckReason, setSlugCheckReason] = useState('')
  const [checkingSlug, setCheckingSlug] = useState(false)
  const [country, setCountry] = useState('')
  const [phone, setPhone] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const checkSlugAvailability = useCallback(async (value: string) => {
    if (value.length < 3) {
      setSlugAvailable(null)
      setSlugCheckReason('')
      return
    }
    setCheckingSlug(true)
    try {
      const res = await fetch(`/api/check-slug?slug=${encodeURIComponent(value)}`)
      const data = await res.json()
      setSlugAvailable(data.available)
      setSlugCheckReason(data.reason || '')
    } catch {
      setSlugAvailable(null)
    } finally {
      setCheckingSlug(false)
    }
  }, [])

  useEffect(() => {
    if (!slugManuallyEdited) {
      const auto = generateSlug(companyName)
      setSlug(auto)
    }
  }, [companyName, slugManuallyEdited])

  useEffect(() => {
    if (slug.length < 3) {
      setSlugAvailable(null)
      return
    }
    const timer = setTimeout(() => checkSlugAvailability(slug), 400)
    return () => clearTimeout(timer)
  }, [slug, checkSlugAvailability])

  const handleSlugChange = (value: string) => {
    const sanitized = value.toLowerCase().replace(/[^a-z0-9-]/g, '').substring(0, 30)
    setSlug(sanitized)
    setSlugManuallyEdited(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!companyName.trim()) {
      setError('Company name is required')
      return
    }
    if (!country) {
      setError('Please select a country')
      return
    }
    if (!slug || slug.length < 3) {
      setError('Portal URL must be at least 3 characters')
      return
    }
    if (slugAvailable === false) {
      setError('This URL is not available')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: companyName.trim(),
          country,
          slug,
          phone: phone.trim() || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.detail || data.error || 'An error occurred')
      }

      window.location.href = '/dashboard'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50 flex flex-col">
      <header className="p-6">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">EF</span>
          </div>
          <span className="font-semibold text-slate-900">ExportFlow</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
              <CheckCircle className="h-8 w-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Welcome, {user?.firstName || 'User'}!
            </h1>
            <p className="text-slate-600">
              Let&apos;s set up your workspace in a few seconds
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                  <Mail className="h-4 w-4" />
                  Email
                </label>
                <input
                  type="email"
                  value={user?.primaryEmailAddress?.emailAddress || ''}
                  readOnly
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg bg-slate-50 text-slate-500 cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-slate-400">
                  We&apos;ll use this email to send you order notifications and updates
                </p>
              </div>

              <div>
                <label
                  htmlFor="phone"
                  className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2"
                >
                  <Phone className="h-4 w-4" />
                  Phone Number <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 555 000 0000"
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  disabled={isSubmitting}
                />
                <p className="mt-1 text-xs text-slate-400">
                  Used for account recovery and important notifications
                </p>
              </div>

              <div>
                <label
                  htmlFor="companyName"
                  className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2"
                >
                  <Building2 className="h-4 w-4" />
                  Company Name
                </label>
                <input
                  id="companyName"
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Acme Export Ltd"
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label
                  htmlFor="slug"
                  className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2"
                >
                  <Link2 className="h-4 w-4" />
                  Portal URL
                </label>
                <div className="flex items-center gap-0">
                  <input
                    id="slug"
                    type="text"
                    value={slug}
                    onChange={(e) => handleSlugChange(e.target.value)}
                    placeholder="acme-export"
                    className="flex-1 px-4 py-3 border border-slate-200 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    disabled={isSubmitting}
                  />
                  <span className="px-4 py-3 bg-slate-100 border border-l-0 border-slate-200 rounded-r-lg text-slate-500 text-sm whitespace-nowrap">
                    .exportflow.io
                  </span>
                </div>
                {slug.length >= 3 && (
                  <div className="mt-2 flex items-center gap-1.5">
                    {checkingSlug ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                    ) : slugAvailable === true ? (
                      <>
                        <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                        <span className="text-xs text-green-600">Available</span>
                      </>
                    ) : slugAvailable === false ? (
                      <>
                        <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                        <span className="text-xs text-red-600">{slugCheckReason}</span>
                      </>
                    ) : null}
                  </div>
                )}
                {slug && (
                  <p className="mt-1.5 text-xs text-slate-400">
                    Your distributors will access: <strong>{slug}.exportflow.io</strong>
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="country"
                  className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2"
                >
                  <Globe className="h-4 w-4" />
                  Country
                </label>
                <select
                  id="country"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                  disabled={isSubmitting}
                >
                  <option value="">Select your country</option>
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting || slugAvailable === false}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  'Go to my dashboard'
                )}
              </button>
            </form>
          </div>

        </div>
      </main>

      <footer className="p-6 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} ExportFlow. All rights reserved.
      </footer>
    </div>
  )
}
