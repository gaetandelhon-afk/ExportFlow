import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a number consistently between server and client
 * Uses a fixed locale to avoid hydration mismatches
 */
export function formatNumber(value: number, options?: {
  minimumFractionDigits?: number
  maximumFractionDigits?: number
}): string {
  // Use 'en-US' as a consistent locale for server/client
  // This ensures "1,234.56" format everywhere
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: options?.minimumFractionDigits ?? 0,
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
  }).format(value)
}

/**
 * Format a price with consistent formatting
 */
export function formatPrice(value: number): string {
  return formatNumber(value, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}
