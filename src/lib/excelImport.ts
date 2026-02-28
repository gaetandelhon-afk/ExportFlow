// ============================================
// EXCEL IMPORT UTILITIES
// For parsing and processing Excel/CSV files
// ============================================

import * as XLSX from 'xlsx'
import { 
  findMatchingSku, 
  parseNumber, 
  parseQuantity, 
  normalizeUnit,
  detectHeaders,
  detectVariants,
  ProductRef,
  SkuMatch,
  HeaderMatch,
  VariantGroup
} from './fuzzyMatch'

// ============================================
// TYPES
// ============================================

export interface SheetInfo {
  name: string
  rowCount: number
  columnCount: number
  preview: string[][] // First 5 rows for preview
}

export interface ParsedFile {
  filename: string
  sheets: SheetInfo[]
  selectedSheet?: string
}

export interface ColumnMapping {
  columnIndex: number
  columnHeader: string
  mappedTo: MappedField
  confidence: number
}

export type MappedField = 
  | 'ref'           // Product reference/SKU
  | 'nameEn'        // English name
  | 'nameCn'        // Chinese name
  | 'description'   // Description
  | 'price'         // Default price
  | 'priceDistributor' // Distributor price
  | 'priceWholesale'   // Wholesale price
  | 'priceRmb'         // RMB price
  | 'rrp'              // Recommended retail price
  | 'priceBase'        // Base price (for tier calculation)
  | 'quantity'      // Stock quantity
  | 'category'      // Category name
  | 'unit'          // Unit of measure
  | 'weight'        // Weight
  | 'hsCode'        // HS Code
  | 'material'      // Material
  | 'options'       // Product options (format: "GroupName:Option1;Option2|GroupName2:OptionA;OptionB")
  | 'ignore'        // Ignore this column
  | `custom_${string}` // Custom field (dynamically created)
  | `price_tier_${string}` // Dynamic price tier (e.g., price_tier_distributor)

// Price tier interface for import
export interface ImportPriceTier {
  id: string
  name: string
  code: string
  modifier: number
}

export type RowClassification = 
  | 'product'       // This is a product row
  | 'header'        // This is a header row (category)
  | 'subcategory'   // This is a subcategory row
  | 'info'          // This is an info row (notes about subcategory, etc.)
  | 'skip'          // Skip this row (empty, notes, etc.)

export interface ClassifiedRow {
  rowIndex: number
  originalData: Record<string, unknown>
  classification: RowClassification
  categoryName?: string // If header row
  subcategoryName?: string // If subcategory row
}

// Parsed option structure for import
export interface ImportedOption {
  groupName: string
  options: string[]  // Option names
}

export interface ImportedProduct {
  rowIndex: number
  ref: string
  nameEn: string
  nameCn?: string
  description?: string
  price?: number
  priceDistributor?: number
  priceWholesale?: number
  priceRmb?: number
  rrp?: number
  priceBase?: number  // Base price for tier calculation
  prices?: Record<string, number>  // Tier-specific prices: {"distributor": 150, "wholesale": 120}
  quantity?: number
  category?: string
  categoryId?: string
  subcategory?: string
  unit?: string
  weight?: number
  hsCode?: string
  material?: string
  options?: ImportedOption[]  // Parsed product options
  customFields?: Record<string, string>  // Custom fields
  
  // Matching status
  existingMatch?: SkuMatch
  action: 'create' | 'update' | 'skip'
  
  // Validation
  errors: string[]
  warnings: string[]
}

export interface ImportValidation {
  isValid: boolean
  products: ImportedProduct[]
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
  variantGroups: VariantGroup[]
}

export interface ImportResult {
  success: boolean
  created: number
  updated: number
  skipped: number
  errors: string[]
}

// ============================================
// FILE PARSING
// ============================================

/**
 * Parse an Excel or CSV file and return sheet information
 */
export function parseExcelFile(file: ArrayBuffer, filename: string): ParsedFile {
  const workbook = XLSX.read(file, { type: 'array' })
  
  const sheets: SheetInfo[] = workbook.SheetNames.map(name => {
    const sheet = workbook.Sheets[name]
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1')
    const data = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 })
    
    return {
      name,
      rowCount: range.e.r - range.s.r + 1,
      columnCount: range.e.c - range.s.c + 1,
      preview: (data as string[][]).slice(0, 5)
    }
  })
  
  return {
    filename,
    sheets,
    selectedSheet: sheets.length > 0 ? sheets[0].name : undefined
  }
}

/**
 * Get all rows from a specific sheet
 */
export function getSheetData(file: ArrayBuffer, sheetName: string): string[][] {
  const workbook = XLSX.read(file, { type: 'array' })
  const sheet = workbook.Sheets[sheetName]
  
  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" not found`)
  }
  
  return XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 }) as string[][]
}

// ============================================
// COLUMN MAPPING
// ============================================

/**
 * Available fields for mapping
 */
export interface MappableFieldDef {
  id: MappedField
  label: string
  required: boolean
  help?: string
  isCustom?: boolean
}

// Base mappable fields (without dynamic price tiers)
export const BASE_MAPPABLE_FIELDS: MappableFieldDef[] = [
  { id: 'ref', label: 'Reference / SKU', required: true },
  { id: 'nameEn', label: 'Name (English)', required: true },
  { id: 'nameCn', label: 'Name (Chinese)', required: false },
  { id: 'description', label: 'Description', required: false },
  { id: 'priceBase', label: 'Base Price', required: false, help: 'Base price for tier calculations' },
  { id: 'price', label: 'Price (Default/Primary)', required: false, help: 'Main price shown in product list' },
  { id: 'priceDistributor', label: 'Distributor Price (Legacy)', required: false },
  { id: 'priceWholesale', label: 'Wholesale Price (Legacy)', required: false },
  { id: 'priceRmb', label: 'Price (RMB)', required: false },
  { id: 'rrp', label: 'RRP (Retail Price)', required: false },
  { id: 'quantity', label: 'Stock Quantity', required: false },
  { id: 'category', label: 'Category', required: false },
  { id: 'unit', label: 'Unit', required: false },
  { id: 'weight', label: 'Weight (kg)', required: false },
  { id: 'hsCode', label: 'HS Code', required: false },
  { id: 'material', label: 'Material', required: false },
  { id: 'options', label: 'Product Options', required: false, help: 'Format: GroupName:Option1;Option2|Group2:OptionA;OptionB' },
  { id: 'ignore', label: '(Ignore)', required: false },
]

// Default MAPPABLE_FIELDS for backward compatibility
export const MAPPABLE_FIELDS: MappableFieldDef[] = BASE_MAPPABLE_FIELDS

/**
 * Generate mappable fields including dynamic price tiers
 * @param priceTiers Array of price tiers from the database
 * @returns Extended list of mappable fields
 */
export function getMappableFieldsWithTiers(priceTiers: ImportPriceTier[]): MappableFieldDef[] {
  // Start with base fields, but filter out the price tier section marker
  const baseFields = BASE_MAPPABLE_FIELDS.filter(f => 
    f.id !== 'priceDistributor' && f.id !== 'priceWholesale'
  )
  
  // Find the index where we should insert price tier fields (after priceBase)
  const priceBaseIndex = baseFields.findIndex(f => f.id === 'priceBase')
  const insertIndex = priceBaseIndex >= 0 ? priceBaseIndex + 1 : baseFields.length
  
  // Generate price tier fields
  const tierFields: MappableFieldDef[] = priceTiers.map(tier => ({
    id: `price_tier_${tier.code}` as MappedField,
    label: `Price - ${tier.name}`,
    required: false,
    help: tier.modifier !== 0 
      ? `${tier.modifier > 0 ? '+' : ''}${tier.modifier}% from base` 
      : 'Default tier'
  }))
  
  // Insert tier fields after priceBase
  return [
    ...baseFields.slice(0, insertIndex),
    ...tierFields,
    // Keep legacy price fields for backward compatibility
    { id: 'priceDistributor' as MappedField, label: 'Distributor Price (Legacy)', required: false },
    { id: 'priceWholesale' as MappedField, label: 'Wholesale Price (Legacy)', required: false },
    ...baseFields.slice(insertIndex)
  ]
}

/**
 * Check if a field is a price tier field
 */
export function isPriceTierField(fieldId: MappedField): boolean {
  return fieldId.startsWith('price_tier_')
}

/**
 * Extract tier code from price tier field ID
 */
export function getTierCodeFromField(fieldId: MappedField): string | null {
  if (!isPriceTierField(fieldId)) return null
  return fieldId.replace('price_tier_', '')
}

// Generate custom field ID
export function createCustomFieldId(name: string): MappedField {
  return `custom_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}` as MappedField
}

// Check if field is custom
export function isCustomField(fieldId: MappedField): boolean {
  return fieldId.startsWith('custom_')
}

// Get custom field name from ID
export function getCustomFieldName(fieldId: MappedField): string {
  if (!isCustomField(fieldId)) return ''
  return fieldId.replace('custom_', '').replace(/_/g, ' ')
}

/**
 * Parse product options from a string
 * Format: "GroupName:Option1;Option2;Option3|AnotherGroup:OptionA;OptionB"
 * Example: "Material:Aluminum;Carbon;Steel|Color:Red;Blue;Green"
 * Returns an array of ImportedOption
 */
export function parseOptionsString(optionsStr: string | undefined | null): ImportedOption[] {
  if (!optionsStr || typeof optionsStr !== 'string') {
    return []
  }
  
  const trimmed = optionsStr.trim()
  if (!trimmed) {
    return []
  }
  
  const groups: ImportedOption[] = []
  
  // Split by | to get groups
  const groupParts = trimmed.split('|')
  
  for (const groupPart of groupParts) {
    const colonIndex = groupPart.indexOf(':')
    if (colonIndex === -1) continue
    
    const groupName = groupPart.substring(0, colonIndex).trim()
    const optionsStr = groupPart.substring(colonIndex + 1).trim()
    
    if (!groupName || !optionsStr) continue
    
    // Split options by semicolon
    const options = optionsStr.split(';').map(o => o.trim()).filter(o => o.length > 0)
    
    if (options.length > 0) {
      groups.push({
        groupName,
        options
      })
    }
  }
  
  return groups
}

/**
 * Auto-detect column mappings from header row
 * Improved pattern matching for complex Excel files
 */
export function autoDetectMappings(headerRow: string[]): ColumnMapping[] {
  const detected = detectHeaders([headerRow])
  
  // Track which fields are already assigned to avoid duplicates
  const assignedFields = new Set<MappedField>()
  
  const mappings = headerRow.map((header, index) => {
    const match = detected.mappings.find(m => m.columnIndex === index)
    
    let mappedTo: MappedField = 'ignore'
    let confidence = 0
    
    if (match) {
      switch (match.matchedField) {
        case 'ref': mappedTo = 'ref'; confidence = match.confidence; break
        case 'name': mappedTo = 'nameEn'; confidence = match.confidence; break
        case 'price': mappedTo = 'price'; confidence = match.confidence; break
        case 'quantity': mappedTo = 'quantity'; confidence = match.confidence; break
        case 'category': mappedTo = 'category'; confidence = match.confidence; break
        default: mappedTo = 'ignore'
      }
    }
    
    // Additional pattern matching for complex headers
    const lowerHeader = (header || '').toLowerCase()
    
    // Name patterns - check first for product name columns
    if (lowerHeader.includes('parts') || lowerHeader.includes('products') || lowerHeader.includes('items') ||
        lowerHeader.includes('description') || lowerHeader.includes('product name') || 
        lowerHeader.includes('item name') || lowerHeader.includes('产品') || lowerHeader.includes('商品')) {
      if (!assignedFields.has('nameEn')) {
        mappedTo = 'nameEn'
        confidence = 0.7
      }
    }
    
    // Chinese name patterns
    if (lowerHeader.includes('chinese') || lowerHeader.includes('中文') || lowerHeader.includes('cn name')) {
      mappedTo = 'nameCn'
      confidence = 0.8
    }
    
    // Price patterns - DS Price, Distributor price, etc.
    if (lowerHeader.includes('ds price') || lowerHeader.includes('distributor')) {
      mappedTo = 'priceDistributor'
      confidence = 0.8
    }
    if (lowerHeader.includes('wholesale') || lowerHeader.includes('ws price')) {
      mappedTo = 'priceWholesale'
      confidence = 0.8
    }
    if (lowerHeader.includes('rmb') || lowerHeader.includes('cny')) {
      // If already mapped to price, check if there's RMB context
      if (!mappedTo.includes('price') || mappedTo === 'ignore') {
        mappedTo = 'priceRmb'
        confidence = 0.7
      }
    }
    if (lowerHeader.includes('rrp') || lowerHeader.includes('retail') || lowerHeader.includes('msrp')) {
      mappedTo = 'rrp'
      confidence = 0.8
    }
    
    // Weight patterns
    if (lowerHeader.includes('weight') || lowerHeader.includes('重量') || lowerHeader.includes('kgs') || lowerHeader.includes('kg')) {
      mappedTo = 'weight'
      confidence = 0.8
    }
    
    // HS Code patterns
    if (lowerHeader.includes('hs code') || lowerHeader.includes('hs #') || lowerHeader.includes('import code') || lowerHeader.includes('hscode')) {
      mappedTo = 'hsCode'
      confidence = 0.8
    }
    
    // Material patterns
    if (lowerHeader.includes('material') || lowerHeader.includes('材料') || lowerHeader.includes('材质')) {
      mappedTo = 'material'
      confidence = 0.7
    }
    
    // Unit patterns
    if (lowerHeader.includes('unit') || lowerHeader.includes('单位') || lowerHeader.includes('uom')) {
      mappedTo = 'unit'
      confidence = 0.7
    }
    
    // Stock/Quantity patterns
    if (lowerHeader.includes('stock') || lowerHeader.includes('qty') || lowerHeader.includes('inventory')) {
      mappedTo = 'quantity'
      confidence = 0.8
    }
    
    // Reference/SKU patterns - additional
    if (lowerHeader.includes('part no') || lowerHeader.includes('article') || lowerHeader.includes('item no') || 
        lowerHeader.includes('model') || lowerHeader.includes('code') && !lowerHeader.includes('hs')) {
      if (!assignedFields.has('ref')) {
        mappedTo = 'ref'
        confidence = 0.7
      }
    }
    
    // Track assigned fields
    if (mappedTo !== 'ignore') {
      assignedFields.add(mappedTo)
    }
    
    return {
      columnIndex: index,
      columnHeader: header,
      mappedTo,
      confidence
    }
  })
  
  // Second pass: if no name column found, try first column with substantial text
  if (!mappings.some(m => m.mappedTo === 'nameEn')) {
    // Find first column with non-empty header that's not already mapped to something important
    for (const mapping of mappings) {
      if (mapping.mappedTo === 'ignore' && mapping.columnHeader && mapping.columnHeader.length > 3) {
        mapping.mappedTo = 'nameEn'
        mapping.confidence = 0.5
        break
      }
    }
  }
  
  return mappings
}

// ============================================
// ROW CLASSIFICATION
// ============================================

/**
 * Classify rows as product, header (category), or skip
 */
export function classifyRows(
  rows: string[][],
  headerRowIndex: number,
  mappings: ColumnMapping[]
): ClassifiedRow[] {
  const refColIndex = mappings.find(m => m.mappedTo === 'ref')?.columnIndex
  const nameColIndex = mappings.find(m => m.mappedTo === 'nameEn')?.columnIndex
  
  return rows.map((row, index) => {
    // Skip header row itself
    if (index <= headerRowIndex) {
      return {
        rowIndex: index,
        originalData: rowToObject(row, mappings),
        classification: 'skip' as RowClassification
      }
    }
    
    // Check if row is empty
    const nonEmptyCells = row.filter(cell => cell && String(cell).trim() !== '')
    if (nonEmptyCells.length === 0) {
      return {
        rowIndex: index,
        originalData: rowToObject(row, mappings),
        classification: 'skip' as RowClassification
      }
    }
    
    // Check if it's a category header (only one or two cells filled, looks like a title)
    if (nonEmptyCells.length <= 2 && refColIndex !== undefined) {
      const refValue = row[refColIndex]
      if (!refValue || String(refValue).trim() === '') {
        // No reference, might be a category header
        const potentialCategory = nonEmptyCells[0]
        if (potentialCategory && typeof potentialCategory === 'string' && potentialCategory.length > 2) {
          return {
            rowIndex: index,
            originalData: rowToObject(row, mappings),
            classification: 'header' as RowClassification,
            categoryName: potentialCategory
          }
        }
      }
    }
    
    // Has reference = product row
    const hasRef = refColIndex !== undefined && row[refColIndex] && String(row[refColIndex]).trim() !== ''
    const hasName = nameColIndex !== undefined && row[nameColIndex] && String(row[nameColIndex]).trim() !== ''
    
    if (hasRef || hasName) {
      return {
        rowIndex: index,
        originalData: rowToObject(row, mappings),
        classification: 'product' as RowClassification
      }
    }
    
    return {
      rowIndex: index,
      originalData: rowToObject(row, mappings),
      classification: 'skip' as RowClassification
    }
  })
}

function rowToObject(row: string[], mappings: ColumnMapping[]): Record<string, unknown> {
  const obj: Record<string, unknown> = {}
  const customFields: Record<string, string> = {}
  
  mappings.forEach(m => {
    if (m.mappedTo !== 'ignore') {
      if (isCustomField(m.mappedTo)) {
        const fieldName = getCustomFieldName(m.mappedTo)
        customFields[fieldName] = String(row[m.columnIndex] || '')
      } else {
        obj[m.mappedTo] = row[m.columnIndex]
      }
    }
  })
  
  if (Object.keys(customFields).length > 0) {
    obj.customFields = customFields
  }
  
  return obj
}

// ============================================
// PRODUCT EXTRACTION
// ============================================

/**
 * Extract products from classified rows
 */
export function extractProducts(
  classifiedRows: ClassifiedRow[],
  existingProducts: ProductRef[],
  duplicateAction: 'update' | 'skip' | 'create_new'
): ImportedProduct[] {
  let currentCategory: string | undefined
  let currentSubcategory: string | undefined
  const products: ImportedProduct[] = []
  
  for (const row of classifiedRows) {
    if (row.classification === 'header') {
      currentCategory = row.categoryName
      currentSubcategory = undefined // Reset subcategory when new category
      continue
    }
    
    if (row.classification === 'subcategory') {
      currentSubcategory = row.subcategoryName
      continue
    }
    
    if (row.classification === 'info' || row.classification === 'skip') continue
    
    if (row.classification !== 'product') continue
    
    const data = row.originalData
    const errors: string[] = []
    const warnings: string[] = []
    
    // Extract ref
    const ref = String(data.ref || '').trim()
    if (!ref) {
      errors.push('Missing reference/SKU')
    }
    
    // Extract name
    const nameEn = String(data.nameEn || '').trim()
    if (!nameEn) {
      errors.push('Missing product name')
    }
    
    // Parse prices
    const price = parseNumber(data.price as string)
    const priceDistributor = parseNumber(data.priceDistributor as string)
    const priceWholesale = parseNumber(data.priceWholesale as string)
    const priceRmb = parseNumber(data.priceRmb as string)
    const rrp = parseNumber(data.rrp as string)
    const priceBase = parseNumber(data.priceBase as string)
    
    // Extract tier-specific prices from data
    const prices: Record<string, number> = {}
    for (const key of Object.keys(data)) {
      if (key.startsWith('price_tier_')) {
        const tierCode = key.replace('price_tier_', '')
        const tierPrice = parseNumber(data[key] as string)
        if (tierPrice !== null && tierPrice > 0) {
          prices[tierCode] = tierPrice
        }
      }
    }
    
    if (price !== null && price < 0) {
      errors.push('Price cannot be negative')
    }
    
    // Parse quantity
    const quantity = parseQuantity(data.quantity as string)
    
    // Normalize unit
    const unit = data.unit ? normalizeUnit(String(data.unit)) : undefined
    
    // Parse weight
    const weight = parseNumber(data.weight as string) ?? undefined
    
    // Extract custom fields
    const customFields = data.customFields as Record<string, string> | undefined
    
    // Check for existing product
    const existingMatch = ref ? findMatchingSku(ref, existingProducts) : null
    
    // Determine action
    let action: 'create' | 'update' | 'skip' = 'create'
    if (existingMatch) {
      if (existingMatch.type === 'exact') {
        switch (duplicateAction) {
          case 'update': 
            action = 'update'
            warnings.push(`Will update existing product: ${existingMatch.productRef}`)
            break
          case 'skip':
            action = 'skip'
            warnings.push(`Skipping - product exists: ${existingMatch.productRef}`)
            break
          case 'create_new':
            action = 'create'
            warnings.push(`Creating duplicate (existing: ${existingMatch.productRef})`)
            break
        }
      } else if (existingMatch.type === 'fuzzy') {
        warnings.push(`Similar product found: ${existingMatch.productRef} (${Math.round(existingMatch.confidence * 100)}% match)`)
      }
    }
    
    // Parse product options
    const options = data.options ? parseOptionsString(String(data.options)) : undefined
    if (options && options.length > 0) {
      const totalOptions = options.reduce((sum, g) => sum + g.options.length, 0)
      warnings.push(`${options.length} option group(s) with ${totalOptions} options found`)
    }
    
    // Note custom fields in warnings
    if (customFields && Object.keys(customFields).length > 0) {
      warnings.push(`${Object.keys(customFields).length} custom field(s) will be imported`)
    }

    products.push({
      rowIndex: row.rowIndex,
      ref,
      nameEn,
      nameCn: data.nameCn ? String(data.nameCn).trim() : undefined,
      description: data.description ? String(data.description).trim() : undefined,
      price: price ?? undefined,
      priceDistributor: priceDistributor ?? undefined,
      priceWholesale: priceWholesale ?? undefined,
      priceRmb: priceRmb ?? undefined,
      rrp: rrp ?? undefined,
      priceBase: priceBase ?? undefined,
      prices: Object.keys(prices).length > 0 ? prices : undefined,
      quantity: quantity ?? undefined,
      category: data.category ? String(data.category).trim() : currentCategory,
      subcategory: currentSubcategory,
      unit,
      weight,
      hsCode: data.hsCode ? String(data.hsCode).trim() : undefined,
      material: data.material ? String(data.material).trim() : undefined,
      options: options && options.length > 0 ? options : undefined,
      customFields: customFields && Object.keys(customFields).length > 0 ? customFields : undefined,
      existingMatch: existingMatch ?? undefined,
      action,
      errors,
      warnings
    })
  }
  
  return products
}

// ============================================
// VALIDATION
// ============================================

/**
 * Validate all products before import
 */
export function validateImport(products: ImportedProduct[]): ImportValidation {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Check for duplicate refs in import
  const refs = products.filter(p => p.ref).map(p => p.ref)
  const duplicateRefs = refs.filter((ref, i) => refs.indexOf(ref) !== i)
  if (duplicateRefs.length > 0) {
    errors.push(`Duplicate references in file: ${[...new Set(duplicateRefs)].join(', ')}`)
  }
  
  // Count stats
  const valid = products.filter(p => p.errors.length === 0)
  const toCreate = products.filter(p => p.action === 'create' && p.errors.length === 0)
  const toUpdate = products.filter(p => p.action === 'update' && p.errors.length === 0)
  const toSkip = products.filter(p => p.action === 'skip')
  const withErrors = products.filter(p => p.errors.length > 0)
  const withWarnings = products.filter(p => p.warnings.length > 0)
  
  // Detect variants
  const productNames = products.map(p => ({ name: p.nameEn, rowIndex: p.rowIndex }))
  const variantGroups = detectVariants(productNames)
  
  if (variantGroups.length > 0) {
    warnings.push(`${variantGroups.length} potential variant group(s) detected`)
  }
  
  return {
    isValid: withErrors.length === 0 && errors.length === 0,
    products,
    errors,
    warnings,
    stats: {
      total: products.length,
      valid: valid.length,
      toCreate: toCreate.length,
      toUpdate: toUpdate.length,
      toSkip: toSkip.length,
      errors: withErrors.length,
      warnings: withWarnings.length
    },
    variantGroups
  }
}

// ============================================
// EXPORT FOR TEMPLATE
// ============================================

/**
 * Generate a template Excel file for import
 */
export function generateTemplate(): ArrayBuffer {
  const headers = [
    'Reference',
    'Product Name (English)',
    'Product Name (Chinese)',
    'Category',
    'Description',
    'Price',
    'Distributor Price',
    'Unit',
    'Weight (kg)',
    'HS Code',
    'Material',
    'Options'
  ]
  
  const exampleRow = [
    'TB-030',
    'T-Bolt 30mm',
    'T型螺栓 30mm',
    'Fasteners',
    'Stainless steel T-bolt, marine grade',
    '12.50',
    '10.00',
    'pcs',
    '0.15',
    '7318.15',
    'Stainless Steel 316',
    'Material:Aluminum;Carbon;Steel|Color:Red;Blue;Green'  // Example options format
  ]
  
  // Add instructions sheet
  const instructionsHeaders = ['Field', 'Description', 'Format', 'Required']
  const instructions = [
    ['Reference', 'Unique product identifier/SKU', 'Text', 'Yes'],
    ['Product Name (English)', 'Product name in English', 'Text', 'Yes'],
    ['Product Name (Chinese)', 'Product name in Chinese', 'Text', 'No'],
    ['Category', 'Product category', 'Text', 'No'],
    ['Description', 'Product description', 'Text', 'No'],
    ['Price', 'Base/default price', 'Number', 'No'],
    ['Distributor Price', 'Price for distributors', 'Number', 'No'],
    ['Unit', 'Unit of measure (pcs, kg, m, etc.)', 'Text', 'No'],
    ['Weight (kg)', 'Product weight in kilograms', 'Number', 'No'],
    ['HS Code', 'Harmonized System code for customs', 'Text', 'No'],
    ['Material', 'Product material', 'Text', 'No'],
    ['Options', 'Product options/variants. Format: GroupName:Option1;Option2|Group2:OptionA;OptionB', 'Text', 'No'],
  ]
  
  const wsProducts = XLSX.utils.aoa_to_sheet([headers, exampleRow])
  const wsInstructions = XLSX.utils.aoa_to_sheet([instructionsHeaders, ...instructions])
  
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, wsProducts, 'Products')
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions')
  
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
}
