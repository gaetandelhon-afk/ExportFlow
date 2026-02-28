export interface PricingRuleBreak {
  minQuantity: number
  maxQuantity: number | null
  value: number
}

export interface PricingRule {
  id: string
  name: string
  code: string
  type: 'PERCENTAGE' | 'FIXED_PRICE'
  breaks: PricingRuleBreak[]
}

export interface PriceCalculationResult {
  unitPrice: number
  totalPrice: number
  discount: number
  discountPercent: number
  appliedRule: PricingRule | null
  appliedBreak: PricingRuleBreak | null
}

/**
 * Calculate the price for a product based on quantity and pricing rules
 * @param basePrice - The base price of the product
 * @param quantity - The quantity being ordered
 * @param pricingRules - Array of pricing rules assigned to the product
 * @param tierModifier - Optional percentage modifier from customer's price tier (e.g., -25 for 25% discount)
 * @returns PriceCalculationResult with calculated prices and applied discounts
 */
export function calculatePrice(
  basePrice: number,
  quantity: number,
  pricingRules: PricingRule[] = [],
  tierModifier: number = 0
): PriceCalculationResult {
  // Start with base price modified by tier
  let unitPrice = basePrice * (1 + tierModifier / 100)
  let appliedRule: PricingRule | null = null
  let appliedBreak: PricingRuleBreak | null = null
  let discount = 0

  // Find the best matching pricing rule
  for (const rule of pricingRules) {
    // Find the break that applies to this quantity
    const matchingBreak = rule.breaks.find(brk => {
      const minMatch = quantity >= brk.minQuantity
      const maxMatch = brk.maxQuantity === null || quantity <= brk.maxQuantity
      return minMatch && maxMatch
    })

    if (matchingBreak) {
      let newUnitPrice: number

      if (rule.type === 'PERCENTAGE') {
        // Percentage discount/markup
        newUnitPrice = unitPrice * (1 + matchingBreak.value / 100)
      } else {
        // Fixed price per unit
        newUnitPrice = matchingBreak.value
      }

      // Use the rule that gives the best price (lowest)
      if (newUnitPrice < unitPrice || !appliedRule) {
        unitPrice = newUnitPrice
        appliedRule = rule
        appliedBreak = matchingBreak
      }
    }
  }

  // Calculate discount from original base price
  const originalPrice = basePrice * (1 + tierModifier / 100)
  discount = originalPrice - unitPrice
  const discountPercent = originalPrice > 0 ? (discount / originalPrice) * 100 : 0

  return {
    unitPrice: Math.max(0, unitPrice),
    totalPrice: Math.max(0, unitPrice * quantity),
    discount: Math.max(0, discount),
    discountPercent: Math.max(0, discountPercent),
    appliedRule,
    appliedBreak
  }
}

/**
 * Format a pricing rule break for display
 */
export function formatBreak(rule: PricingRule, brk: PricingRuleBreak, currencySymbol: string = '€'): string {
  const qtyRange = brk.maxQuantity
    ? `${brk.minQuantity}-${brk.maxQuantity}`
    : `${brk.minQuantity}+`

  if (rule.type === 'PERCENTAGE') {
    const sign = brk.value >= 0 ? '+' : ''
    return `${qtyRange}: ${sign}${brk.value}%`
  } else {
    return `${qtyRange}: ${currencySymbol}${brk.value.toFixed(2)}`
  }
}

/**
 * Get the applicable break for a given quantity
 */
export function getApplicableBreak(pricingRules: PricingRule[], quantity: number): { rule: PricingRule; break: PricingRuleBreak } | null {
  for (const rule of pricingRules) {
    const matchingBreak = rule.breaks.find(brk => {
      const minMatch = quantity >= brk.minQuantity
      const maxMatch = brk.maxQuantity === null || quantity <= brk.maxQuantity
      return minMatch && maxMatch
    })

    if (matchingBreak) {
      return { rule, break: matchingBreak }
    }
  }
  return null
}
