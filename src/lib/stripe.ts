import Stripe from 'stripe'

const key = process.env.STRIPE_SECRET_KEY || 'sk_placeholder_not_configured'

export const stripe = new Stripe(key, {
  apiVersion: '2026-01-28.clover',
  typescript: true,
})
