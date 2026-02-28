'use client'

import Link from 'next/link'
import { Sparkles, ArrowRight } from 'lucide-react'
import { PlanName, PLAN_PRICING } from '@/lib/plans'

interface UpgradeBannerProps {
  requiredPlan: PlanName
  feature?: string
  className?: string
}

const PLAN_DISPLAY_NAMES: Record<PlanName, string> = {
  starter: 'Starter',
  pro: 'Pro',
  business: 'Business',
  enterprise: 'Enterprise',
}

export function UpgradeBanner({ requiredPlan, feature, className = '' }: UpgradeBannerProps) {
  const planName = PLAN_DISPLAY_NAMES[requiredPlan]
  const price = PLAN_PRICING[requiredPlan].monthly

  return (
    <div className={`bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 ${className}`}>
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-blue-600" />
          </div>
        </div>
        
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-900 mb-1">
            Upgrade to {planName}
          </h3>
          <p className="text-slate-600 mb-4">
            {feature 
              ? `Unlock ${feature} and much more with the ${planName} plan.`
              : `Unlock all advanced features with the ${planName} plan.`
            }
            {price > 0 && ` Starting at €${price}/month.`}
          </p>
          
          <Link
            href="/settings/subscription"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            View plans
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}

interface UpgradeInlineProps {
  requiredPlan: PlanName
  className?: string
}

export function UpgradeInline({ requiredPlan, className = '' }: UpgradeInlineProps) {
  const planName = PLAN_DISPLAY_NAMES[requiredPlan]

  return (
    <Link
      href="/settings/subscription"
      className={`inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium ${className}`}
    >
      <Sparkles className="w-3.5 h-3.5" />
      Upgrade to {planName}
    </Link>
  )
}
