// Product Options Types
// Options allow products to have selectable variants (e.g., material, color, size)
// Each option can have images that customers click to select

export interface ProductOptionImage {
  id: string
  url: string
  sortOrder: number
}

export interface ProductOption {
  id: string
  name: string           // e.g., "Premium"
  description: string    // Detailed description shown under the image
  images: ProductOptionImage[]
  priceModifier: number  // Additional price (can be negative for discounts)
  sku?: string           // Optional SKU suffix for this option
  stock?: number         // Optional stock tracking per option
  sortOrder: number
  isDefault?: boolean    // If true, this option is pre-selected
}

export interface ProductOptionGroup {
  id: string
  name: string           // e.g., "Material" or "Color"
  description?: string   // Optional description for the group
  required: boolean      // If true, customer must select an option
  options: ProductOption[]
  sortOrder: number
}

// The full options structure stored in Product.customFields
export interface ProductOptions {
  optionGroups: ProductOptionGroup[]
}

// Helper to generate unique IDs
export function generateOptionId(): string {
  return `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export function generateGroupId(): string {
  return `grp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// For order lines - stores selected options
export interface SelectedOption {
  groupId: string
  groupName: string
  optionId: string
  optionName: string
  priceModifier: number
}

// Default empty options
export const DEFAULT_PRODUCT_OPTIONS: ProductOptions = {
  optionGroups: []
}

// Parse options from customFields
export function parseProductOptions(customFields: unknown): ProductOptions {
  if (!customFields || typeof customFields !== 'object') {
    return DEFAULT_PRODUCT_OPTIONS
  }
  
  const fields = customFields as Record<string, unknown>
  if (fields.optionGroups && Array.isArray(fields.optionGroups)) {
    return {
      optionGroups: fields.optionGroups as ProductOptionGroup[]
    }
  }
  
  return DEFAULT_PRODUCT_OPTIONS
}

// Merge options into existing customFields
export function mergeOptionsIntoCustomFields(
  existingFields: unknown,
  options: ProductOptions
): Record<string, unknown> {
  const existing = (existingFields && typeof existingFields === 'object') 
    ? existingFields as Record<string, unknown>
    : {}
  
  return {
    ...existing,
    optionGroups: options.optionGroups
  }
}
