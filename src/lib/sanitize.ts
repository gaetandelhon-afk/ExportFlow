/**
 * Utility functions to sanitize sensitive data before logging or returning in API responses.
 */

/**
 * Mask an email address, showing only first 2 chars and the domain.
 * "john.doe@example.com" → "jo***@example.com"
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return '***'
  const visible = local.slice(0, 2)
  return `${visible}***@${domain}`
}

/**
 * Mask a payment method / card / IBAN, showing only last 4 characters.
 * "4242424242424242" → "************4242"
 */
export function maskPaymentMethod(value: string): string {
  if (!value || value.length < 4) return '****'
  return '*'.repeat(value.length - 4) + value.slice(-4)
}

/**
 * Mask a Stripe customer/subscription ID for logs.
 * "cus_AbCdEfGhIjKlMn" → "cus_***KlMn"
 */
export function maskStripeId(id: string): string {
  if (!id || id.length < 8) return '***'
  const prefix = id.split('_')[0]
  return `${prefix}_***${id.slice(-4)}`
}

/**
 * Remove sensitive fields from an object before logging.
 */
const SENSITIVE_KEYS = new Set([
  'password', 'secret', 'token', 'apiKey', 'api_key',
  'creditCard', 'credit_card', 'cardNumber', 'card_number',
  'cvv', 'cvc', 'ssn', 'otpCode', 'otp_code',
  'stripeCustomerId', 'stripe_customer_id',
  'stripeSubscriptionId', 'stripe_subscription_id',
  'accountNumber', 'account_number', 'swiftCode', 'swift_code',
])

export function sanitizeForLog(obj: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key)) {
      sanitized[key] = '[REDACTED]'
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeForLog(value as Record<string, unknown>)
    } else {
      sanitized[key] = value
    }
  }

  return sanitized
}
