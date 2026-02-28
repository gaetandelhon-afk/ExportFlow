export type PlanName = 'starter' | 'pro' | 'business' | 'enterprise'
export type BillingPeriod = 'monthly' | 'yearly'

export type FeatureName =
  | 'team_members'
  | 'orders_per_month'
  | 'products'
  | 'price_tiers'
  | 'branding'
  | 'proforma_invoices'
  | 'custom_domain'
  | 'tt_payment_tracking'
  | 'whatsapp_support'
  | 'custom_requests_per_year'

export interface PlanFeatures {
  team_members: number
  orders_per_month: number
  products: number
  price_tiers: number
  branding: boolean
  proforma_invoices: boolean
  custom_domain: boolean
  tt_payment_tracking: boolean
  whatsapp_support: boolean
  custom_requests_per_year: number
}

export const UNLIMITED = Infinity

export const PLAN_FEATURES: Record<PlanName, PlanFeatures> = {
  starter: {
    team_members: 2,
    orders_per_month: 100,
    products: 500,
    price_tiers: 1,
    branding: false,
    proforma_invoices: false,
    custom_domain: false,
    tt_payment_tracking: false,
    whatsapp_support: false,
    custom_requests_per_year: 0,
  },
  pro: {
    team_members: 5,
    orders_per_month: 500,
    products: UNLIMITED,
    price_tiers: 3,
    branding: true,
    proforma_invoices: true,
    custom_domain: false,
    tt_payment_tracking: false,
    whatsapp_support: false,
    custom_requests_per_year: 0,
  },
  business: {
    team_members: 15,
    orders_per_month: 2000,
    products: UNLIMITED,
    price_tiers: UNLIMITED,
    branding: true,
    proforma_invoices: true,
    custom_domain: true,
    tt_payment_tracking: true,
    whatsapp_support: false,
    custom_requests_per_year: 0,
  },
  enterprise: {
    team_members: UNLIMITED,
    orders_per_month: UNLIMITED,
    products: UNLIMITED,
    price_tiers: UNLIMITED,
    branding: true,
    proforma_invoices: true,
    custom_domain: true,
    tt_payment_tracking: true,
    whatsapp_support: true,
    custom_requests_per_year: 3,
  },
}

export const PLAN_HIERARCHY: PlanName[] = ['starter', 'pro', 'business', 'enterprise']

export const PLAN_PRICING: Record<PlanName, { monthly: number; yearly: number }> = {
  starter: { monthly: 49, yearly: 490 },
  pro: { monthly: 149, yearly: 1490 },
  business: { monthly: 299, yearly: 2990 },
  enterprise: { monthly: 0, yearly: 499 },
}

export const PRICE_IDS = {
  monthly: {
    starter: 'price_1T3Hbk6qbRY63IUSVW2OCvfr',
    pro: 'price_1T3Hcv6qbRY63IUSJWfrmbId',
    business: 'price_1T3Hdm6qbRY63IUSYqs4YVW6',
  },
  yearly: {
    starter: 'price_1T3Hgl6qbRY63IUSJAVC1Gh2',
    pro: 'price_1T3HhW6qbRY63IUSACPimAcZ',
    business: 'price_1T3Hi86qbRY63IUSdDQRC3NX',
    enterprise: 'price_1T3Hef6qbRY63IUSo8I5uzr4',
  },
} as const

export const PRICE_ID_TO_PLAN: Record<string, { name: PlanName; period: BillingPeriod }> = {
  'price_1T3Hbk6qbRY63IUSVW2OCvfr': { name: 'starter', period: 'monthly' },
  'price_1T3Hcv6qbRY63IUSJWfrmbId': { name: 'pro', period: 'monthly' },
  'price_1T3Hdm6qbRY63IUSYqs4YVW6': { name: 'business', period: 'monthly' },
  'price_1T3Hgl6qbRY63IUSJAVC1Gh2': { name: 'starter', period: 'yearly' },
  'price_1T3HhW6qbRY63IUSACPimAcZ': { name: 'pro', period: 'yearly' },
  'price_1T3Hi86qbRY63IUSdDQRC3NX': { name: 'business', period: 'yearly' },
  'price_1T3Hef6qbRY63IUSo8I5uzr4': { name: 'enterprise', period: 'yearly' },
}

export function canUse(plan: PlanName, feature: FeatureName): boolean {
  const features = PLAN_FEATURES[plan]
  if (!features) return false

  const value = features[feature]
  
  if (typeof value === 'boolean') {
    return value
  }
  
  if (typeof value === 'number') {
    return value > 0
  }
  
  return false
}

export function getLimit(plan: PlanName, feature: FeatureName): number {
  const features = PLAN_FEATURES[plan]
  if (!features) return 0

  const value = features[feature]
  
  if (typeof value === 'number') {
    return value
  }
  
  return value ? UNLIMITED : 0
}

export function hasReachedLimit(plan: PlanName, feature: FeatureName, currentCount: number): boolean {
  const limit = getLimit(plan, feature)
  
  if (limit === UNLIMITED) {
    return false
  }
  
  return currentCount >= limit
}

export function getMinimumPlanFor(feature: FeatureName): PlanName {
  for (const plan of PLAN_HIERARCHY) {
    if (canUse(plan, feature)) {
      return plan
    }
  }
  return 'enterprise'
}

export function getPlanFromPriceId(priceId: string): { name: PlanName; period: BillingPeriod } | null {
  return PRICE_ID_TO_PLAN[priceId] || null
}

export function getPriceId(plan: PlanName, period: BillingPeriod): string | null {
  if (period === 'monthly') {
    return PRICE_IDS.monthly[plan as keyof typeof PRICE_IDS.monthly] || null
  }
  return PRICE_IDS.yearly[plan as keyof typeof PRICE_IDS.yearly] || null
}

export function isValidPriceId(priceId: string): boolean {
  return priceId in PRICE_ID_TO_PLAN
}
