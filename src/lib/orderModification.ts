// ============================================
// ORDER MODIFICATION UTILITIES
// ============================================

import { Order } from '@/contexts/DistributorContext'
import { getOrderModificationSettings, OrderModificationRule } from '@/config/features'

// ============================================
// TYPES
// ============================================

export interface OrderChange {
  type: 'added' | 'removed' | 'modified'
  productId: string
  productRef: string
  productName: string
  oldQuantity?: number
  newQuantity?: number
  oldLineTotal?: number
  newLineTotal?: number
  unitPrice: number
}

export interface OrderModification {
  id: string
  orderId: string
  version: number
  timestamp: string
  modifiedBy: string
  reason: string
  changes: OrderChange[]
  surchargeApplied: number
  surchargeMessage: string
  previousTotal: number
  newTotal: number
}

export interface LateSurchargeResult {
  amount: number
  message: string
  canModify: boolean
  daysUntilReference: number | null
  tier: string
  rule: OrderModificationRule | null
}

export interface ModifiedOrderItem {
  id: string
  ref: string
  name: string
  quantity: number
  price: number
  originalQuantity?: number
  isNew?: boolean
  isRemoved?: boolean
}

// ============================================
// SURCHARGE CALCULATION (USES CONFIG)
// ============================================

/**
 * Calculate modification surcharge based on admin-configured rules
 * Rules are defined in config/features.ts and can be modified by admin
 */
export function calculateLateSurcharge(
  referenceDate: string | undefined,
  orderSubtotal: number
): LateSurchargeResult {
  const settings = getOrderModificationSettings()
  
  // If modification is disabled globally
  if (!settings.enabled) {
    return {
      amount: -1,
      message: 'Order modifications are disabled',
      canModify: false,
      daysUntilReference: null,
      tier: 'blocked',
      rule: null
    }
  }

  // If no reference date is set
  if (!referenceDate || settings.referenceDateField === 'none') {
    switch (settings.noDateBehavior) {
      case 'block':
        return {
          amount: -1,
          message: 'Cannot modify - no reference date set',
          canModify: false,
          daysUntilReference: null,
          tier: 'blocked',
          rule: null
        }
      case 'apply_default_rule':
        const defaultRule = settings.rules.find(r => r.id === settings.defaultRuleId)
        if (defaultRule) {
          return applyRule(defaultRule, orderSubtotal, null)
        }
        // Fall through to allow_free
      case 'allow_free':
      default:
        return {
          amount: 0,
          message: 'Modification allowed',
          canModify: true,
          daysUntilReference: null,
          tier: 'free',
          rule: null
        }
    }
  }

  // Calculate days until reference date
  const refDate = new Date(referenceDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  refDate.setHours(0, 0, 0, 0)
  
  const diffTime = refDate.getTime() - today.getTime()
  const daysUntilReference = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  // Find matching rule (first match wins)
  for (const rule of settings.rules) {
    const matchesMin = rule.minDays === null || daysUntilReference >= rule.minDays
    const matchesMax = rule.maxDays === null || daysUntilReference <= rule.maxDays
    
    if (matchesMin && matchesMax) {
      return applyRule(rule, orderSubtotal, daysUntilReference)
    }
  }

  // No matching rule found - allow by default
  return {
    amount: 0,
    message: 'Modification allowed',
    canModify: true,
    daysUntilReference,
    tier: 'free',
    rule: null
  }
}

/**
 * Apply a specific rule to calculate surcharge
 */
function applyRule(
  rule: OrderModificationRule,
  orderSubtotal: number,
  daysUntilReference: number | null
): LateSurchargeResult {
  if (!rule.allowModification) {
    return {
      amount: -1,
      message: rule.message,
      canModify: false,
      daysUntilReference,
      tier: rule.tier,
      rule
    }
  }

  let surchargeAmount = 0

  switch (rule.surchargeType) {
    case 'fixed':
      surchargeAmount = rule.fixedAmount || 0
      break
    case 'percentage':
      surchargeAmount = orderSubtotal * ((rule.percentageAmount || 0) / 100)
      break
    case 'higher_of':
      const fixed = rule.fixedAmount || 0
      const percentage = orderSubtotal * ((rule.percentageAmount || 0) / 100)
      surchargeAmount = Math.max(fixed, percentage)
      break
    case 'none':
    default:
      surchargeAmount = 0
  }

  // Round to 2 decimal places
  surchargeAmount = Math.round(surchargeAmount * 100) / 100

  // Build message with days info if available
  let message = rule.message
  if (daysUntilReference !== null) {
    message = message.replace('{days}', String(daysUntilReference))
  }

  return {
    amount: surchargeAmount,
    message,
    canModify: true,
    daysUntilReference,
    tier: rule.tier,
    rule
  }
}

// ============================================
// DIFF CALCULATION
// ============================================

/**
 * Calculate the differences between original and modified order items
 */
export function calculateOrderChanges(
  originalItems: Order['items'],
  modifiedItems: ModifiedOrderItem[]
): OrderChange[] {
  const changes: OrderChange[] = []
  const originalMap = new Map(originalItems.map(item => [item.id, item]))
  const modifiedMap = new Map(modifiedItems.filter(i => !i.isRemoved).map(item => [item.id, item]))

  // Check for removed and modified items
  for (const original of originalItems) {
    const modified = modifiedMap.get(original.id)
    
    if (!modified) {
      // Item was removed
      changes.push({
        type: 'removed',
        productId: original.id,
        productRef: original.ref,
        productName: original.name,
        oldQuantity: original.quantity,
        newQuantity: 0,
        oldLineTotal: original.price * original.quantity,
        newLineTotal: 0,
        unitPrice: original.price
      })
    } else if (modified.quantity !== original.quantity) {
      // Item was modified
      changes.push({
        type: 'modified',
        productId: original.id,
        productRef: original.ref,
        productName: original.name,
        oldQuantity: original.quantity,
        newQuantity: modified.quantity,
        oldLineTotal: original.price * original.quantity,
        newLineTotal: modified.price * modified.quantity,
        unitPrice: modified.price
      })
    }
  }

  // Check for added items
  for (const modified of modifiedItems) {
    if (modified.isRemoved) continue
    
    const original = originalMap.get(modified.id)
    if (!original) {
      // Item was added
      changes.push({
        type: 'added',
        productId: modified.id,
        productRef: modified.ref,
        productName: modified.name,
        oldQuantity: 0,
        newQuantity: modified.quantity,
        oldLineTotal: 0,
        newLineTotal: modified.price * modified.quantity,
        unitPrice: modified.price
      })
    }
  }

  return changes
}

/**
 * Calculate totals for modified order
 */
export function calculateModifiedTotals(
  modifiedItems: ModifiedOrderItem[],
  lateSurcharge: number
): { subtotal: number; surcharge: number; total: number } {
  const subtotal = modifiedItems
    .filter(item => !item.isRemoved)
    .reduce((sum, item) => sum + (item.price * item.quantity), 0)
  
  const surcharge = lateSurcharge > 0 ? lateSurcharge : 0
  
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    surcharge: Math.round(surcharge * 100) / 100,
    total: Math.round((subtotal + surcharge) * 100) / 100
  }
}

/**
 * Format change summary for status history
 */
export function formatChangesSummary(changes: OrderChange[]): string {
  const added = changes.filter(c => c.type === 'added').length
  const removed = changes.filter(c => c.type === 'removed').length
  const modified = changes.filter(c => c.type === 'modified').length

  const parts: string[] = []
  if (modified > 0) parts.push(`${modified} item${modified > 1 ? 's' : ''} modified`)
  if (removed > 0) parts.push(`${removed} item${removed > 1 ? 's' : ''} removed`)
  if (added > 0) parts.push(`${added} item${added > 1 ? 's' : ''} added`)

  return parts.join(', ')
}

/**
 * Check if order can be modified based on its status
 */
export function canModifyOrder(order: Order): { canModify: boolean; reason?: string } {
  const modifiableStatuses = ['pending', 'confirmed']
  
  if (!modifiableStatuses.includes(order.status)) {
    return {
      canModify: false,
      reason: `Orders with status "${order.status}" cannot be modified`
    }
  }

  return { canModify: true }
}
