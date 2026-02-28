'use client'

import { Package, Plus, Minus, ArrowRight } from 'lucide-react'
import { OrderChange, LateSurchargeResult } from '@/lib/orderModification'
import { CURRENCY_SYMBOLS } from '@/contexts/DistributorContext'
import { formatNumber } from '@/lib/utils'

interface OrderDiffViewProps {
  changes: OrderChange[]
  originalTotal: number
  newSubtotal: number
  surchargeResult: LateSurchargeResult
  currency: string
}

export default function OrderDiffView({
  changes,
  originalTotal,
  newSubtotal,
  surchargeResult,
  currency
}: OrderDiffViewProps) {
  const currencySymbol = CURRENCY_SYMBOLS[currency] || '€'
  
  const addedItems = changes.filter(c => c.type === 'added')
  const removedItems = changes.filter(c => c.type === 'removed')
  const modifiedItems = changes.filter(c => c.type === 'modified')
  
  const newTotal = newSubtotal + (surchargeResult.amount > 0 ? surchargeResult.amount : 0)
  const difference = newTotal - originalTotal

  if (changes.length === 0) {
    return (
      <div className="card p-6 text-center">
        <Package className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--color-text-tertiary)' }} />
        <p className="text-[14px]" style={{ color: 'var(--color-text-secondary)' }}>
          No changes detected
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Changes Summary */}
      <div className="card p-4">
        <h3 className="text-[14px] font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
          Changes Summary
        </h3>
        <div className="flex flex-wrap gap-3">
          {modifiedItems.length > 0 && (
            <span 
              className="text-[12px] px-3 py-1 rounded-full font-medium"
              style={{ backgroundColor: 'rgba(255, 149, 0, 0.1)', color: 'var(--color-warning)' }}
            >
              {modifiedItems.length} modified
            </span>
          )}
          {removedItems.length > 0 && (
            <span 
              className="text-[12px] px-3 py-1 rounded-full font-medium"
              style={{ backgroundColor: 'rgba(255, 59, 48, 0.1)', color: 'var(--color-error)' }}
            >
              {removedItems.length} removed
            </span>
          )}
          {addedItems.length > 0 && (
            <span 
              className="text-[12px] px-3 py-1 rounded-full font-medium"
              style={{ backgroundColor: 'rgba(52, 199, 89, 0.1)', color: 'var(--color-success)' }}
            >
              {addedItems.length} added
            </span>
          )}
        </div>
      </div>

      {/* Modified Items */}
      {modifiedItems.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <div 
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(255, 149, 0, 0.1)' }}
            >
              <ArrowRight className="w-3.5 h-3.5" style={{ color: 'var(--color-warning)' }} />
            </div>
            <h3 className="text-[14px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Modified
            </h3>
          </div>
          <div className="space-y-3">
            {modifiedItems.map((change) => (
              <div 
                key={change.productId}
                className="p-3 rounded-xl"
                style={{ backgroundColor: 'rgba(255, 149, 0, 0.05)', border: '1px solid rgba(255, 149, 0, 0.2)' }}
              >
                <p className="text-[14px] font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                  {change.productName}
                </p>
                <p className="text-[12px] mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  {change.productRef}
                </p>
                <div className="flex items-center gap-2 text-[13px]">
                  <span style={{ color: 'var(--color-text-secondary)' }}>Quantity:</span>
                  <span className="line-through" style={{ color: 'var(--color-error)' }}>{change.oldQuantity}</span>
                  <ArrowRight className="w-3 h-3" style={{ color: 'var(--color-text-tertiary)' }} />
                  <span className="font-medium" style={{ color: 'var(--color-success)' }}>{change.newQuantity}</span>
                  <span 
                    className="text-[11px] px-1.5 py-0.5 rounded"
                    style={{ 
                      backgroundColor: (change.newQuantity! - change.oldQuantity!) > 0 ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 59, 48, 0.1)',
                      color: (change.newQuantity! - change.oldQuantity!) > 0 ? 'var(--color-success)' : 'var(--color-error)'
                    }}
                  >
                    {(change.newQuantity! - change.oldQuantity!) > 0 ? '+' : ''}{change.newQuantity! - change.oldQuantity!}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[13px] mt-1">
                  <span style={{ color: 'var(--color-text-secondary)' }}>Line total:</span>
                  <span className="line-through" style={{ color: 'var(--color-error)' }}>
                    {currencySymbol}{formatNumber(change.oldLineTotal || 0)}
                  </span>
                  <ArrowRight className="w-3 h-3" style={{ color: 'var(--color-text-tertiary)' }} />
                  <span className="font-medium" style={{ color: 'var(--color-success)' }}>
                    {currencySymbol}{formatNumber(change.newLineTotal || 0)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Removed Items */}
      {removedItems.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <div 
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(255, 59, 48, 0.1)' }}
            >
              <Minus className="w-3.5 h-3.5" style={{ color: 'var(--color-error)' }} />
            </div>
            <h3 className="text-[14px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Removed
            </h3>
          </div>
          <div className="space-y-3">
            {removedItems.map((change) => (
              <div 
                key={change.productId}
                className="p-3 rounded-xl"
                style={{ backgroundColor: 'rgba(255, 59, 48, 0.05)', border: '1px solid rgba(255, 59, 48, 0.2)' }}
              >
                <p className="text-[14px] font-medium mb-1 line-through" style={{ color: 'var(--color-text-secondary)' }}>
                  {change.productName}
                </p>
                <p className="text-[12px] mb-2" style={{ color: 'var(--color-text-tertiary)' }}>
                  {change.productRef}
                </p>
                <p className="text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
                  Was: {change.oldQuantity} × {currencySymbol}{formatNumber(change.unitPrice)} = {currencySymbol}{formatNumber(change.oldLineTotal || 0)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Added Items */}
      {addedItems.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center gap-2 mb-3">
            <div 
              className="w-6 h-6 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(52, 199, 89, 0.1)' }}
            >
              <Plus className="w-3.5 h-3.5" style={{ color: 'var(--color-success)' }} />
            </div>
            <h3 className="text-[14px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Added
            </h3>
          </div>
          <div className="space-y-3">
            {addedItems.map((change) => (
              <div 
                key={change.productId}
                className="p-3 rounded-xl"
                style={{ backgroundColor: 'rgba(52, 199, 89, 0.05)', border: '1px solid rgba(52, 199, 89, 0.2)' }}
              >
                <p className="text-[14px] font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                  {change.productName}
                </p>
                <p className="text-[12px] mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  {change.productRef}
                </p>
                <p className="text-[13px]" style={{ color: 'var(--color-success)' }}>
                  New: {change.newQuantity} × {currencySymbol}{formatNumber(change.unitPrice)} = {currencySymbol}{formatNumber(change.newLineTotal || 0)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pricing Summary */}
      <div className="card p-4">
        <h3 className="text-[14px] font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
          Pricing
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between text-[13px]">
            <span style={{ color: 'var(--color-text-secondary)' }}>Original Total:</span>
            <span style={{ color: 'var(--color-text-primary)' }}>{currencySymbol}{formatNumber(originalTotal)}</span>
          </div>
          <div className="flex justify-between text-[13px]">
            <span style={{ color: 'var(--color-text-secondary)' }}>New Subtotal:</span>
            <span style={{ color: 'var(--color-text-primary)' }}>{currencySymbol}{formatNumber(newSubtotal)}</span>
          </div>
          {surchargeResult.amount > 0 && (
            <div className="flex justify-between text-[13px]">
              <span style={{ color: 'var(--color-warning)' }}>{surchargeResult.message}:</span>
              <span style={{ color: 'var(--color-warning)' }}>+{currencySymbol}{formatNumber(surchargeResult.amount)}</span>
            </div>
          )}
          <div 
            className="flex justify-between text-[15px] font-semibold pt-2 mt-2"
            style={{ borderTop: '1px solid rgba(210, 210, 215, 0.3)' }}
          >
            <span style={{ color: 'var(--color-text-primary)' }}>New Total:</span>
            <span style={{ color: 'var(--color-text-primary)' }}>{currencySymbol}{formatNumber(newTotal)}</span>
          </div>
          <div className="flex justify-between text-[13px]">
            <span style={{ color: 'var(--color-text-secondary)' }}>Difference:</span>
            <span 
              className="font-medium"
              style={{ color: difference >= 0 ? 'var(--color-success)' : 'var(--color-error)' }}
            >
              {difference >= 0 ? '+' : ''}{currencySymbol}{formatNumber(difference)}
            </span>
          </div>
        </div>
      </div>

      {/* Surcharge Warning */}
      {surchargeResult.tier !== 'free' && (
        <div 
          className="p-4 rounded-xl"
          style={{ 
            backgroundColor: surchargeResult.tier === 'urgent' ? 'rgba(255, 59, 48, 0.05)' : 
                            surchargeResult.tier === 'late' ? 'rgba(255, 149, 0, 0.05)' : 
                            'rgba(0, 113, 227, 0.05)',
            border: `1px solid ${
              surchargeResult.tier === 'urgent' ? 'rgba(255, 59, 48, 0.2)' :
              surchargeResult.tier === 'late' ? 'rgba(255, 149, 0, 0.2)' :
              'rgba(0, 113, 227, 0.2)'
            }`
          }}
        >
          <p 
            className="text-[13px] font-medium"
            style={{ 
              color: surchargeResult.tier === 'urgent' ? 'var(--color-error)' :
                     surchargeResult.tier === 'late' ? 'var(--color-warning)' :
                     'var(--color-brand-primary)'
            }}
          >
            {surchargeResult.message}
          </p>
          {surchargeResult.daysUntilReference !== null && (
            <p className="text-[12px] mt-1" style={{ color: 'var(--color-text-secondary)' }}>
              {surchargeResult.daysUntilReference} day{surchargeResult.daysUntilReference > 1 ? 's' : ''} until reference date
            </p>
          )}
        </div>
      )}
    </div>
  )
}
