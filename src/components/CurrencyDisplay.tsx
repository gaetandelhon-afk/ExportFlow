'use client'

import { useLocalization } from '@/hooks/useLocalization'
import { formatNumber } from '@/lib/utils'

interface CurrencyDisplayProps {
  amount: number
  className?: string
  showDecimals?: boolean
}

/**
 * Client component to display prices with the admin-configured currency symbol
 * Used in both client and server components for consistent currency display
 */
export default function CurrencyDisplay({ amount, className = '', showDecimals = true }: CurrencyDisplayProps) {
  const { currencySymbol, isLoaded } = useLocalization()
  
  // Show placeholder while loading to prevent hydration mismatch
  if (!isLoaded) {
    return <span className={className}>{formatNumber(amount)}</span>
  }
  
  return (
    <span className={className}>
      {currencySymbol}{showDecimals ? formatNumber(amount) : Math.round(amount).toLocaleString()}
    </span>
  )
}

/**
 * Inline version without wrapper span
 */
export function CurrencyText({ amount, showDecimals = true }: { amount: number; showDecimals?: boolean }) {
  const { currencySymbol, isLoaded } = useLocalization()
  
  if (!isLoaded) {
    return <>{formatNumber(amount)}</>
  }
  
  return <>{currencySymbol}{showDecimals ? formatNumber(amount) : Math.round(amount).toLocaleString()}</>
}
