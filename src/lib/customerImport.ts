// ============================================
// CUSTOMER IMPORT UTILITIES
// For parsing and processing customer Excel/CSV files
// ============================================

import { parseNumber } from './fuzzyMatch'

// ============================================
// TYPES
// ============================================

export interface CustomerMappableFieldDef {
  id: CustomerMappedField
  label: string
  required: boolean
  help?: string
  variants?: string[] // Alternative column names to detect
}

export type CustomerMappedField =
  | 'companyName'      // Company/Business name
  | 'contactName'      // Contact person name
  | 'email'            // Email address
  | 'phone'            // Phone number
  | 'country'          // Country
  | 'currency'         // Preferred currency
  | 'vatNumber'        // VAT/Tax ID
  | 'paymentTerms'     // Payment terms
  | 'language'         // Preferred language
  | 'priceTier'        // Assigned price tier (by code)
  // Full address fields (legacy)
  | 'shippingAddress'  // Full shipping address in one field
  | 'billingAddress'   // Full billing address in one field
  // Structured shipping address
  | 'shippingStreet'
  | 'shippingCity'
  | 'shippingState'
  | 'shippingPostalCode'
  | 'shippingCountry'
  // Structured billing address
  | 'billingStreet'
  | 'billingCity'
  | 'billingState'
  | 'billingPostalCode'
  | 'billingCountry'
  // Other
  | 'ignore'
  | `custom_${string}` // Custom field

export interface CustomerColumnMapping {
  columnIndex: number
  columnHeader: string
  mappedTo: CustomerMappedField
  confidence: number
}

export interface ImportedCustomer {
  rowIndex: number
  companyName: string
  contactName?: string
  email: string
  phone?: string
  country?: string
  currency?: string
  vatNumber?: string
  paymentTerms?: string
  language?: string
  priceTier?: string
  // Full addresses
  shippingAddress?: string
  billingAddress?: string
  // Structured shipping
  shippingStreet?: string
  shippingCity?: string
  shippingState?: string
  shippingPostalCode?: string
  shippingCountry?: string
  // Structured billing
  billingStreet?: string
  billingCity?: string
  billingState?: string
  billingPostalCode?: string
  billingCountry?: string
  // Custom fields
  customFields?: Record<string, string>
  // Action
  action: 'create' | 'update' | 'skip'
  existingCustomerId?: string
  // Validation
  errors: string[]
  warnings: string[]
}

export interface CustomerImportValidation {
  isValid: boolean
  customers: ImportedCustomer[]
  errors: string[]
  warnings: string[]
  stats: {
    total: number
    valid: number
    toCreate: number
    toUpdate: number
    toSkip: number
    errors: number
    warnings: number
  }
}

// ============================================
// MAPPABLE FIELDS
// ============================================

export const CUSTOMER_MAPPABLE_FIELDS: CustomerMappableFieldDef[] = [
  { 
    id: 'companyName', 
    label: 'Company Name', 
    required: true,
    variants: ['company', 'company name', 'business', 'business name', 'société', 'nom société', 'client', 'customer', 'customer name', 'distributor', 'raison sociale']
  },
  { 
    id: 'contactName', 
    label: 'Contact Name', 
    required: false,
    variants: ['contact', 'contact name', 'contact person', 'name', 'nom', 'full name', 'nom complet', 'person']
  },
  { 
    id: 'email', 
    label: 'Email', 
    required: true,
    variants: ['email', 'e-mail', 'mail', 'email address', 'courriel']
  },
  { 
    id: 'phone', 
    label: 'Phone', 
    required: false,
    variants: ['phone', 'telephone', 'tel', 'phone number', 'téléphone', 'mobile', 'cell']
  },
  { 
    id: 'country', 
    label: 'Country', 
    required: false,
    variants: ['country', 'pays', 'nation']
  },
  { 
    id: 'currency', 
    label: 'Currency', 
    required: false,
    variants: ['currency', 'devise', 'curr']
  },
  { 
    id: 'vatNumber', 
    label: 'VAT Number', 
    required: false,
    variants: ['vat', 'vat number', 'vat id', 'tax id', 'tax number', 'numéro tva', 'tva', 'siret']
  },
  { 
    id: 'paymentTerms', 
    label: 'Payment Terms', 
    required: false,
    variants: ['payment terms', 'terms', 'payment', 'conditions de paiement', 'délai de paiement']
  },
  { 
    id: 'language', 
    label: 'Language', 
    required: false,
    variants: ['language', 'lang', 'langue', 'preferred language']
  },
  { 
    id: 'priceTier', 
    label: 'Price Tier', 
    required: false,
    variants: ['price tier', 'tier', 'pricing', 'tarif', 'price level', 'customer type', 'type client']
  },
  // Full address fields
  { 
    id: 'shippingAddress', 
    label: 'Shipping Address (full)', 
    required: false,
    variants: ['shipping address', 'ship to', 'delivery address', 'adresse de livraison', 'livraison']
  },
  { 
    id: 'billingAddress', 
    label: 'Billing Address (full)', 
    required: false,
    variants: ['billing address', 'bill to', 'invoice address', 'adresse de facturation', 'facturation']
  },
  // Structured shipping
  { 
    id: 'shippingStreet', 
    label: 'Shipping Street', 
    required: false,
    variants: ['shipping street', 'ship street', 'delivery street', 'rue livraison']
  },
  { 
    id: 'shippingCity', 
    label: 'Shipping City', 
    required: false,
    variants: ['shipping city', 'ship city', 'delivery city', 'ville livraison']
  },
  { 
    id: 'shippingState', 
    label: 'Shipping State/Province', 
    required: false,
    variants: ['shipping state', 'ship state', 'shipping province', 'région livraison', 'province livraison']
  },
  { 
    id: 'shippingPostalCode', 
    label: 'Shipping Postal Code', 
    required: false,
    variants: ['shipping postal', 'ship postal', 'shipping zip', 'ship zip', 'code postal livraison']
  },
  { 
    id: 'shippingCountry', 
    label: 'Shipping Country', 
    required: false,
    variants: ['shipping country', 'ship country', 'delivery country', 'pays livraison']
  },
  // Structured billing
  { 
    id: 'billingStreet', 
    label: 'Billing Street', 
    required: false,
    variants: ['billing street', 'bill street', 'invoice street', 'rue facturation']
  },
  { 
    id: 'billingCity', 
    label: 'Billing City', 
    required: false,
    variants: ['billing city', 'bill city', 'invoice city', 'ville facturation']
  },
  { 
    id: 'billingState', 
    label: 'Billing State/Province', 
    required: false,
    variants: ['billing state', 'bill state', 'billing province', 'région facturation']
  },
  { 
    id: 'billingPostalCode', 
    label: 'Billing Postal Code', 
    required: false,
    variants: ['billing postal', 'bill postal', 'billing zip', 'code postal facturation']
  },
  { 
    id: 'billingCountry', 
    label: 'Billing Country', 
    required: false,
    variants: ['billing country', 'bill country', 'invoice country', 'pays facturation']
  },
  { id: 'ignore', label: '(Ignore)', required: false },
]

// ============================================
// AUTO-DETECTION
// ============================================

/**
 * Auto-detect column mappings based on header names
 */
export function autoDetectCustomerMappings(headerRow: string[]): CustomerColumnMapping[] {
  const mappings: CustomerColumnMapping[] = []
  const usedFields = new Set<CustomerMappedField>()
  
  for (let i = 0; i < headerRow.length; i++) {
    const header = String(headerRow[i] || '').trim()
    if (!header) {
      mappings.push({
        columnIndex: i,
        columnHeader: header,
        mappedTo: 'ignore',
        confidence: 0
      })
      continue
    }
    
    const headerLower = header.toLowerCase()
    let bestMatch: { field: CustomerMappedField; confidence: number } | null = null
    
    // Check each mappable field
    for (const fieldDef of CUSTOMER_MAPPABLE_FIELDS) {
      if (fieldDef.id === 'ignore') continue
      if (usedFields.has(fieldDef.id)) continue
      
      // Check exact match with field label
      if (headerLower === fieldDef.label.toLowerCase()) {
        bestMatch = { field: fieldDef.id, confidence: 1.0 }
        break
      }
      
      // Check variants
      if (fieldDef.variants) {
        for (const variant of fieldDef.variants) {
          if (headerLower === variant.toLowerCase()) {
            bestMatch = { field: fieldDef.id, confidence: 0.95 }
            break
          }
          if (headerLower.includes(variant.toLowerCase())) {
            const conf = variant.length / header.length
            if (!bestMatch || conf > bestMatch.confidence) {
              bestMatch = { field: fieldDef.id, confidence: Math.min(0.8, conf) }
            }
          }
        }
      }
      
      // Check if header contains field label
      if (headerLower.includes(fieldDef.label.toLowerCase())) {
        const conf = fieldDef.label.length / header.length
        if (!bestMatch || conf > bestMatch.confidence) {
          bestMatch = { field: fieldDef.id, confidence: Math.min(0.7, conf) }
        }
      }
    }
    
    if (bestMatch && bestMatch.confidence >= 0.5) {
      usedFields.add(bestMatch.field)
      mappings.push({
        columnIndex: i,
        columnHeader: header,
        mappedTo: bestMatch.field,
        confidence: bestMatch.confidence
      })
    } else {
      mappings.push({
        columnIndex: i,
        columnHeader: header,
        mappedTo: 'ignore',
        confidence: 0
      })
    }
  }
  
  return mappings
}

// ============================================
// DATA EXTRACTION
// ============================================

/**
 * Convert row data to mapped object
 */
export function mapCustomerRowData(
  row: string[],
  mappings: CustomerColumnMapping[]
): Record<string, string> {
  const data: Record<string, string> = {}
  
  for (const mapping of mappings) {
    if (mapping.mappedTo === 'ignore') continue
    const value = row[mapping.columnIndex]
    if (value !== undefined && value !== null && String(value).trim()) {
      // Handle custom fields
      if (mapping.mappedTo.startsWith('custom_')) {
        if (!data.customFields) data.customFields = '{}'
        const customFields = JSON.parse(data.customFields || '{}')
        customFields[mapping.mappedTo.replace('custom_', '')] = String(value).trim()
        data.customFields = JSON.stringify(customFields)
      } else {
        data[mapping.mappedTo] = String(value).trim()
      }
    }
  }
  
  return data
}

/**
 * Extract customers from sheet data
 */
export function extractCustomers(
  sheetData: string[][],
  mappings: CustomerColumnMapping[],
  headerRowIndex: number,
  existingEmails: Set<string>,
  duplicateAction: 'update' | 'skip' | 'create_new'
): ImportedCustomer[] {
  const customers: ImportedCustomer[] = []
  
  for (let i = headerRowIndex + 1; i < sheetData.length; i++) {
    const row = sheetData[i]
    if (!row || row.every(cell => !cell || !String(cell).trim())) continue
    
    const data = mapCustomerRowData(row, mappings)
    const errors: string[] = []
    const warnings: string[] = []
    
    // Required fields
    const companyName = data.companyName || ''
    const email = data.email || ''
    
    if (!companyName) {
      errors.push('Missing company name')
    }
    if (!email) {
      errors.push('Missing email')
    } else if (!isValidEmail(email)) {
      errors.push('Invalid email format')
    }
    
    // Check for existing customer
    const emailLower = email.toLowerCase()
    const exists = existingEmails.has(emailLower)
    
    let action: 'create' | 'update' | 'skip' = 'create'
    if (exists) {
      switch (duplicateAction) {
        case 'update':
          action = 'update'
          warnings.push('Will update existing customer')
          break
        case 'skip':
          action = 'skip'
          warnings.push('Skipping - customer exists')
          break
        case 'create_new':
          action = 'create'
          warnings.push('Creating duplicate customer')
          break
      }
    }
    
    // Parse custom fields
    let customFields: Record<string, string> | undefined
    if (data.customFields) {
      try {
        customFields = JSON.parse(data.customFields)
      } catch {
        // Ignore parse errors
      }
    }
    
    customers.push({
      rowIndex: i,
      companyName,
      contactName: data.contactName,
      email,
      phone: data.phone,
      country: data.country,
      currency: data.currency,
      vatNumber: data.vatNumber,
      paymentTerms: data.paymentTerms,
      language: data.language,
      priceTier: data.priceTier,
      shippingAddress: data.shippingAddress,
      billingAddress: data.billingAddress,
      shippingStreet: data.shippingStreet,
      shippingCity: data.shippingCity,
      shippingState: data.shippingState,
      shippingPostalCode: data.shippingPostalCode,
      shippingCountry: data.shippingCountry,
      billingStreet: data.billingStreet,
      billingCity: data.billingCity,
      billingState: data.billingState,
      billingPostalCode: data.billingPostalCode,
      billingCountry: data.billingCountry,
      customFields,
      action,
      errors,
      warnings
    })
  }
  
  return customers
}

// ============================================
// VALIDATION
// ============================================

/**
 * Check if email is valid
 */
function isValidEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

/**
 * Validate all customers before import
 */
export function validateCustomerImport(customers: ImportedCustomer[]): CustomerImportValidation {
  const errors: string[] = []
  const warnings: string[] = []
  
  let valid = 0
  let toCreate = 0
  let toUpdate = 0
  let toSkip = 0
  let errorCount = 0
  let warningCount = 0
  
  // Check for duplicate emails in import
  const emailCounts = new Map<string, number>()
  for (const customer of customers) {
    const email = customer.email.toLowerCase()
    emailCounts.set(email, (emailCounts.get(email) || 0) + 1)
  }
  
  for (const [email, count] of emailCounts) {
    if (count > 1) {
      warnings.push(`Email "${email}" appears ${count} times in import`)
    }
  }
  
  for (const customer of customers) {
    if (customer.errors.length > 0) {
      errorCount++
    } else {
      valid++
      switch (customer.action) {
        case 'create': toCreate++; break
        case 'update': toUpdate++; break
        case 'skip': toSkip++; break
      }
    }
    warningCount += customer.warnings.length
  }
  
  const isValid = errorCount === 0 && valid > 0
  
  return {
    isValid,
    customers,
    errors,
    warnings,
    stats: {
      total: customers.length,
      valid,
      toCreate,
      toUpdate,
      toSkip,
      errors: errorCount,
      warnings: warningCount
    }
  }
}

// ============================================
// TEMPLATE GENERATION
// ============================================

import * as XLSX from 'xlsx'

/**
 * Generate a customer import template
 */
export function generateCustomerTemplate(): ArrayBuffer {
  const wb = XLSX.utils.book_new()
  
  // Data sheet with headers
  const headers = [
    'Company Name',
    'Contact Name',
    'Email',
    'Phone',
    'Country',
    'Currency',
    'VAT Number',
    'Payment Terms',
    'Price Tier',
    'Shipping Street',
    'Shipping City',
    'Shipping State',
    'Shipping Postal Code',
    'Shipping Country',
    'Billing Street',
    'Billing City',
    'Billing State',
    'Billing Postal Code',
    'Billing Country',
  ]
  
  const exampleRow = [
    'Acme Corporation',
    'John Doe',
    'john@acme.com',
    '+1 555 123 4567',
    'United States',
    'USD',
    'US123456789',
    'Net 30',
    'distributor',
    '123 Main Street',
    'New York',
    'NY',
    '10001',
    'United States',
    '123 Main Street',
    'New York',
    'NY',
    '10001',
    'United States',
  ]
  
  const dataSheet = XLSX.utils.aoa_to_sheet([headers, exampleRow])
  
  // Set column widths
  dataSheet['!cols'] = headers.map(() => ({ wch: 20 }))
  
  XLSX.utils.book_append_sheet(wb, dataSheet, 'Customers')
  
  // Instructions sheet
  const instructions = [
    ['Customer Import Template - Instructions'],
    [''],
    ['Required Fields:'],
    ['  - Company Name: The name of the customer company/business'],
    ['  - Email: Primary contact email address (must be unique)'],
    [''],
    ['Optional Fields:'],
    ['  - Contact Name: Name of the primary contact person'],
    ['  - Phone: Phone number'],
    ['  - Country: Country name'],
    ['  - Currency: 3-letter currency code (USD, EUR, CNY, etc.)'],
    ['  - VAT Number: Tax identification number'],
    ['  - Payment Terms: e.g., "Net 30", "Net 60", "Due on receipt"'],
    ['  - Price Tier: Price tier code (e.g., "distributor", "wholesale")'],
    [''],
    ['Address Fields:'],
    ['  You can use either:'],
    ['  - Full address in one field: "Shipping Address" or "Billing Address"'],
    ['  - OR separate fields: Street, City, State, Postal Code, Country'],
    [''],
    ['Notes:'],
    ['  - The first row should contain column headers'],
    ['  - Customers with the same email will be updated (not duplicated)'],
    ['  - Empty rows will be skipped'],
  ]
  
  const instructionSheet = XLSX.utils.aoa_to_sheet(instructions)
  instructionSheet['!cols'] = [{ wch: 80 }]
  XLSX.utils.book_append_sheet(wb, instructionSheet, 'Instructions')
  
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
}

// ============================================
// HELPERS
// ============================================

/**
 * Get Excel column letter from index
 */
export function getExcelColumnLetter(index: number): string {
  let letter = ''
  let temp = index
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter
    temp = Math.floor(temp / 26) - 1
  }
  return letter
}

/**
 * Create custom field ID
 */
export function createCustomerCustomFieldId(name: string): CustomerMappedField {
  return `custom_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}` as CustomerMappedField
}

/**
 * Check if field is custom
 */
export function isCustomerCustomField(fieldId: CustomerMappedField): boolean {
  return fieldId.startsWith('custom_')
}

// Re-export parseNumber for convenience
export { parseNumber }
