'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import {
  ChevronLeft, Sparkles, Check, Loader2, ExternalLink, Zap, Crown, CheckCircle
} from 'lucide-react'
import {
  PlanName, PLAN_FEATURES, PLAN_PRICING, PLAN_HIERARCHY,
  UNLIMITED, FeatureName, getPriceId, type BillingPeriod
} from '@/lib/plans'
import { usePlan } from '@/hooks/usePlan'

const PLAN_DISPLAY: Record<PlanName, { name: string; icon: typeof Zap; color: string; bgColor: string }> = {
  starter: { name: 'Starter', icon: Zap, color: '#86868b', bgColor: '#f5f5f7' },
  pro: { name: 'Pro', icon: Sparkles, color: '#0071e3', bgColor: '#e8f4fd' },
  business: { name: 'Business', icon: Crown, color: '#af52de', bgColor: '#f5eefa' },
  enterprise: { name: 'Enterprise', icon: Crown, color: '#ff9500', bgColor: '#fff4e5' },
}

const FEATURE_LABELS: Record<FeatureName, string> = {
  team_members: 'Team members',
  orders_per_month: 'Orders per month',
  products: 'Products',
  price_tiers: 'Price tiers',
  branding: 'Custom branding',
  proforma_invoices: 'Proforma invoices',
  custom_domain: 'Custom domain',
  tt_payment_tracking: 'T/T payment tracking',
  whatsapp_support: 'WhatsApp support',
  custom_requests_per_year: 'Custom requests / year',
}

function formatLimit(value: number | boolean): string {
  if (typeof value === 'boolean') return value ? 'Included' : '—'
  if (value === UNLIMITED) return 'Unlimited'
  if (value === 0) return '—'
  return value.toLocaleString()
}

export default function SubscriptionPage() {
  const { user } = useUser()
  const { plan, isLoading } = usePlan()
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [upgradeSuccess, setUpgradeSuccess] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [trialInfo, setTrialInfo] = useState<{ status: string; endsAt: string | null } | null>(null)
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    async function loadCompanyInfo() {
      try {
        const res = await fetch('/api/settings/company')
        if (res.ok) {
          const data = await res.json()
          setTrialInfo({
            status: data.subscriptionStatus || '',
            endsAt: data.trialEndsAt || null,
          })
        }
      } catch {
        // ignore
      }
    }
    loadCompanyInfo()
  }, [])

  const verifySession = useCallback(async (sessionId: string) => {
    setVerifying(true)
    try {
      const res = await fetch('/api/checkout/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      const data = await res.json() as { plan?: string; error?: string }
      if (data.plan) {
        setUpgradeSuccess(data.plan)
        const url = new URL(window.location.href)
        url.searchParams.delete('session_id')
        router.replace(url.pathname, { scroll: false })
        setTimeout(() => window.location.reload(), 1500)
      } else if (data.error) {
        setError(data.error)
      }
    } catch {
      setError('Failed to verify your payment. Please refresh the page.')
    } finally {
      setVerifying(false)
    }
  }, [router])

  useEffect(() => {
    const sessionId = searchParams.get('session_id')
    if (sessionId) {
      verifySession(sessionId)
    }
  }, [searchParams, verifySession])

  const billingPeriod = (user?.publicMetadata?.billingPeriod as BillingPeriod) || 'monthly'
  const currentPlanInfo = PLAN_DISPLAY[plan]
  const PlanIcon = currentPlanInfo.icon

  const isTrialing = trialInfo?.status === 'trialing'
  const trialDaysLeft = (() => {
    if (!isTrialing || !trialInfo?.endsAt) return 0
    const end = new Date(trialInfo.endsAt)
    const now = new Date()
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(0, diff)
  })()

  async function handleUpgrade(targetPlan: PlanName) {
    setLoadingAction(targetPlan)
    setError(null)

    try {
      const priceId = getPriceId(targetPlan, billingPeriod)
      if (!priceId) {
        setError('This plan is not available for your billing period.')
        return
      }

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, skipTrial: true }),
      })

      if (res.status === 401) {
        setError('Session expired. Please refresh the page.')
        return
      }

      const data = await res.json() as { url?: string; error?: string }
      if (data.url) {
        window.location.assign(data.url)
        return
      }
      setError(data.error || 'Failed to start checkout.')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoadingAction(null)
    }
  }

  async function handleManageBilling() {
    setLoadingAction('portal')
    setError(null)

    try {
      const res = await fetch('/api/portal', { method: 'POST' })
      const data = await res.json() as { url?: string; error?: string }

      if (data.url) {
        window.location.assign(data.url)
        return
      }
      setError(data.error || 'Failed to open billing portal.')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoadingAction(null)
    }
  }

  const currentPlanIndex = PLAN_HIERARCHY.indexOf(plan)

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-48 bg-gray-200 rounded-lg" />
          <div className="h-40 bg-gray-100 rounded-2xl" />
          <div className="h-64 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-[13px] text-[#86868b] hover:text-[#1d1d1f] transition-colors mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          Settings
        </Link>
        <h1 className="text-[28px] font-semibold text-[#1d1d1f] tracking-tight">
          Subscription
        </h1>
        <p className="text-[15px] text-[#86868b] mt-1">
          Manage your plan, usage, and billing
        </p>
      </div>

      {verifying && (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 flex items-center gap-3">
          <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
          Verifying your payment…
        </div>
      )}

      {upgradeSuccess && (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 flex items-center gap-3">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          Successfully upgraded to <strong>{PLAN_DISPLAY[upgradeSuccess as PlanName]?.name || upgradeSuccess}</strong>! Refreshing…
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Current Plan */}
      <div className="rounded-2xl border border-[#d2d2d7]/30 bg-white p-6 mb-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: currentPlanInfo.bgColor }}
            >
              <PlanIcon className="w-6 h-6" style={{ color: currentPlanInfo.color }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-[#1d1d1f]">
                  {currentPlanInfo.name}
                </h2>
                {isTrialing ? (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-[#0071e3]/10 text-[#0071e3]">
                    Free Trial
                  </span>
                ) : (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
                    Active
                  </span>
                )}
              </div>
              <p className="text-[13px] text-[#86868b] mt-0.5">
                {isTrialing
                  ? `${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''} remaining in your free trial`
                  : plan === 'starter' && !user?.publicMetadata?.stripeSubscriptionId
                    ? 'Free plan — no billing'
                    : `€${PLAN_PRICING[plan][billingPeriod === 'yearly' ? 'yearly' : 'monthly']}/${billingPeriod === 'yearly' ? 'year' : 'month'}`
                }
              </p>
            </div>
          </div>

          {user?.publicMetadata?.stripeSubscriptionId ? (
            <button
              onClick={handleManageBilling}
              disabled={loadingAction === 'portal'}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#1d1d1f] bg-[#f5f5f7] hover:bg-[#e8e8ed] rounded-lg transition-colors disabled:opacity-50"
            >
              {loadingAction === 'portal' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ExternalLink className="w-4 h-4" />
              )}
              Manage billing
            </button>
          ) : null}
        </div>

        {/* Feature limits for current plan */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {(Object.entries(FEATURE_LABELS) as [FeatureName, string][]).map(([key, label]) => {
            const value = PLAN_FEATURES[plan][key]
            const formatted = formatLimit(value)
            if (formatted === '—') return null
            return (
              <div key={key} className="rounded-xl bg-[#f5f5f7] px-4 py-3">
                <p className="text-[13px] text-[#86868b]">{label}</p>
                <p className="text-[15px] font-semibold text-[#1d1d1f] mt-0.5">
                  {formatted}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Trial info banner */}
      {isTrialing && (
        <div className="rounded-2xl border border-[#0071e3]/20 bg-[#0071e3]/5 p-5 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#0071e3]/10 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-[#0071e3]" />
            </div>
            <div className="flex-1">
              <h3 className="text-[15px] font-semibold text-[#1d1d1f]">
                You&apos;re on a 14-day free trial
              </h3>
              <p className="text-[13px] text-[#86868b] mt-1">
                You have full access to the <strong>{currentPlanInfo.name}</strong> plan features.
                {trialDaysLeft > 0
                  ? ` Your trial ends in ${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''}. Subscribe to keep your access.`
                  : ' Your trial has ended. Subscribe to continue using ExportFlow.'
                }
              </p>
              {/* Trial progress bar */}
              <div className="mt-3 h-2 bg-[#d2d2d7]/30 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.max(0, Math.min(100, ((14 - trialDaysLeft) / 14) * 100))}%`,
                    backgroundColor: trialDaysLeft <= 3 ? '#ff3b30' : trialDaysLeft <= 7 ? '#ff9500' : '#0071e3',
                  }}
                />
              </div>
              <div className="flex justify-between mt-1.5 text-[11px] text-[#86868b]">
                <span>Trial started</span>
                <span>{trialDaysLeft} day{trialDaysLeft !== 1 ? 's' : ''} left</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade options */}
      {currentPlanIndex < PLAN_HIERARCHY.length - 1 && (
        <div className="rounded-2xl border border-[#d2d2d7]/30 bg-white p-6 mb-6">
          <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">
            Upgrade your plan
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PLAN_HIERARCHY.slice(currentPlanIndex + 1).map((upgradePlan) => {
              const info = PLAN_DISPLAY[upgradePlan]
              const pricing = PLAN_PRICING[upgradePlan]
              const features = PLAN_FEATURES[upgradePlan]
              const UpgradeIcon = info.icon
              const isEnterprise = upgradePlan === 'enterprise'

              return (
                <div
                  key={upgradePlan}
                  className="rounded-xl border border-[#d2d2d7]/30 p-5 hover:border-[#0071e3]/30 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: info.bgColor }}
                    >
                      <UpgradeIcon className="w-4 h-4" style={{ color: info.color }} />
                    </div>
                    <div>
                      <p className="text-[15px] font-semibold text-[#1d1d1f]">{info.name}</p>
                      <p className="text-[13px] text-[#86868b]">
                        {isEnterprise
                          ? '€499/year'
                          : `€${pricing.monthly}/mo`
                        }
                      </p>
                    </div>
                  </div>

                  <ul className="space-y-1.5 mb-4">
                    {(Object.entries(FEATURE_LABELS) as [FeatureName, string][]).slice(0, 5).map(([key, label]) => {
                      const currentVal = PLAN_FEATURES[plan][key]
                      const upgradeVal = features[key]
                      if (JSON.stringify(currentVal) === JSON.stringify(upgradeVal)) return null
                      const formatted = formatLimit(upgradeVal)
                      if (formatted === '—') return null
                      return (
                        <li key={key} className="flex items-center gap-2 text-[13px] text-[#1d1d1f]">
                          <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                          <span>{label}: {formatted}</span>
                        </li>
                      )
                    })}
                  </ul>

                  {isEnterprise ? (
                    <Link
                      href="/contact"
                      className="block w-full text-center px-4 py-2.5 text-sm font-medium rounded-lg bg-[#f5f5f7] hover:bg-[#e8e8ed] text-[#1d1d1f] transition-colors"
                    >
                      Contact sales
                    </Link>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(upgradePlan)}
                      disabled={loadingAction !== null}
                      className="w-full px-4 py-2.5 text-sm font-medium rounded-lg bg-[#0071e3] hover:bg-[#0077ed] text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loadingAction === upgradePlan ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Redirecting…
                        </>
                      ) : (
                        `Upgrade to ${info.name}`
                      )}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Plan comparison */}
      <div className="rounded-2xl border border-[#d2d2d7]/30 bg-white p-6">
        <h3 className="text-[15px] font-semibold text-[#1d1d1f] mb-4">
          Plan comparison
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#d2d2d7]/30">
                <th className="text-left py-3 pr-4 font-medium text-[#86868b]">Feature</th>
                {PLAN_HIERARCHY.map((p) => (
                  <th key={p} className="text-center py-3 px-3 font-semibold text-[#1d1d1f]">
                    <span className={p === plan ? 'px-2 py-0.5 rounded-full bg-[#0071e3]/10 text-[#0071e3]' : ''}>
                      {PLAN_DISPLAY[p].name}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(Object.entries(FEATURE_LABELS) as [FeatureName, string][]).map(([key, label]) => (
                <tr key={key} className="border-b border-[#d2d2d7]/10 last:border-0">
                  <td className="py-3 pr-4 text-[#1d1d1f]">{label}</td>
                  {PLAN_HIERARCHY.map((p) => {
                    const val = PLAN_FEATURES[p][key]
                    const formatted = formatLimit(val)
                    return (
                      <td key={p} className="text-center py-3 px-3 text-[#86868b]">
                        {typeof val === 'boolean' ? (
                          val ? <Check className="w-4 h-4 text-green-500 mx-auto" /> : <span>—</span>
                        ) : (
                          formatted
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
              <tr className="border-b border-[#d2d2d7]/10">
                <td className="py-3 pr-4 font-medium text-[#1d1d1f]">Price (monthly)</td>
                {PLAN_HIERARCHY.map((p) => (
                  <td key={p} className="text-center py-3 px-3 font-semibold text-[#1d1d1f]">
                    {PLAN_PRICING[p].monthly > 0 ? `€${PLAN_PRICING[p].monthly}` : 'Custom'}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
