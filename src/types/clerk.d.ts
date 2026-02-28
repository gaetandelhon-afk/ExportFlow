import { UserMetadata } from '@/lib/auth'

declare global {
  interface CustomJwtSessionClaims {
    metadata?: {
      plan?: 'starter' | 'pro' | 'business' | 'enterprise'
      companyId?: string
      companyName?: string
      country?: string
      stripeCustomerId?: string
      stripeSubscriptionId?: string
      onboardingComplete?: boolean
    }
  }
}

export {}
