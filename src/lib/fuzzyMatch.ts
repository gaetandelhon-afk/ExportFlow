// ============================================
// FUZZY MATCHING UTILITIES
// For tolerant SKU/reference matching during import
// ============================================

/**
 * Levenshtein distance between two strings
 * Returns the minimum number of single-character edits needed
 */
export function levenshtein(a: string, b: string): number {
  const matrix: number[][] = []

  // Increment along the first column of each row
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }

  // Increment each column in the first row
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  // Fill in the rest of the matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

/**
 * Normalize a SKU for comparison
 * Removes spaces, dashes, underscores, dots and converts to uppercase
 */
export function normalizeSku(sku: string): string {
  return sku.toUpperCase().replace(/[\s\-_\.]/g, '')
}

/**
 * Match result from SKU lookup
 */
export interface SkuMatch {
  productId: string
  productRef: string
  productName: string
  confidence: number // 0-1
  type: 'exact' | 'fuzzy' | 'none'
  distance?: number
}

/**
 * Product reference for matching
 */
export interface ProductRef {
  id: string
  ref: string
  nameEn: string
}

/**
 * Find matching SKU in catalog with fuzzy matching
 */
export function findMatchingSku(
  input: string, 
  catalog: ProductRef[],
  maxDistance: number = 2
): SkuMatch | null {
  if (!input || input.trim() === '') return null
  
  const normalized = normalizeSku(input)
  
  // Try exact match first (normalized)
  const exact = catalog.find(p => normalizeSku(p.ref) === normalized)
  if (exact) {
    return { 
      productId: exact.id,
      productRef: exact.ref,
      productName: exact.nameEn,
      confidence: 1.0, 
      type: 'exact' 
    }
  }
  
  // Fuzzy match using Levenshtein
  const candidates = catalog
    .map(p => ({
      product: p,
      distance: levenshtein(normalized, normalizeSku(p.ref))
    }))
    .filter(c => c.distance <= maxDistance)
    .sort((a, b) => a.distance - b.distance)
  
  if (candidates.length > 0) {
    const best = candidates[0]
    return { 
      productId: best.product.id,
      productRef: best.product.ref,
      productName: best.product.nameEn,
      confidence: 1 - (best.distance / 10), // Distance 2 = 0.8 confidence
      type: 'fuzzy',
      distance: best.distance
    }
  }
  
  return null
}

/**
 * Batch match multiple SKUs
 */
export function batchMatchSkus(
  inputs: string[],
  catalog: ProductRef[]
): (SkuMatch | null)[] {
  return inputs.map(input => findMatchingSku(input, catalog))
}

// ============================================
// UNIT NORMALIZATION
// ============================================

const UNIT_MAPPINGS: Record<string, string> = {
  // Pieces
  'pcs': 'pcs',
  'pc': 'pcs',
  'piece': 'pcs',
  'pieces': 'pcs',
  'ea': 'pcs',
  'each': 'pcs',
  'unit': 'pcs',
  'units': 'pcs',
  'item': 'pcs',
  'items': 'pcs',
  '个': 'pcs',
  '件': 'pcs',
  
  // Sets
  'set': 'set',
  'sets': 'set',
  'kit': 'set',
  'kits': 'set',
  '套': 'set',
  
  // Pairs
  'pair': 'pair',
  'pairs': 'pair',
  'pr': 'pair',
  '对': 'pair',
  
  // Boxes
  'box': 'box',
  'boxes': 'box',
  'bx': 'box',
  'carton': 'box',
  'ctn': 'box',
  '箱': 'box',
  '盒': 'box',
  
  // Meters
  'm': 'm',
  'meter': 'm',
  'meters': 'm',
  'metre': 'm',
  'metres': 'm',
  '米': 'm',
  
  // Kilograms
  'kg': 'kg',
  'kgs': 'kg',
  'kilogram': 'kg',
  'kilograms': 'kg',
  '公斤': 'kg',
}

/**
 * Normalize unit to standard format
 */
export function normalizeUnit(unit: string): string {
  const normalized = unit.toLowerCase().trim()
  return UNIT_MAPPINGS[normalized] || normalized
}

// ============================================
// NUMBER CLEANING
// ============================================

/**
 * Clean and parse a number from various formats
 * Handles: "1,234.56", "1.234,56", "1234", "$1,234.56"
 */
export function parseNumber(value: string | number): number | null {
  if (typeof value === 'number') return value
  if (!value || value.trim() === '') return null
  
  // Remove currency symbols and whitespace
  let cleaned = value.replace(/[€$¥£₹\s]/g, '').trim()
  
  // Handle empty after cleaning
  if (cleaned === '' || cleaned === '-') return null
  
  // Detect format based on position of separators
  const lastDot = cleaned.lastIndexOf('.')
  const lastComma = cleaned.lastIndexOf(',')
  
  if (lastDot > lastComma) {
    // English format: 1,234.56
    cleaned = cleaned.replace(/,/g, '')
  } else if (lastComma > lastDot) {
    // European format: 1.234,56
    cleaned = cleaned.replace(/\./g, '').replace(',', '.')
  }
  
  const result = parseFloat(cleaned)
  return isNaN(result) ? null : result
}

/**
 * Parse integer quantity
 */
export function parseQuantity(value: string | number): number | null {
  const num = parseNumber(value)
  if (num === null) return null
  return Math.round(num)
}

// ============================================
// VARIANT DETECTION
// ============================================

export interface VariantGroup {
  baseName: string
  variants: {
    fullName: string
    attribute: string
    value: string
    rowIndex: number
  }[]
}

/**
 * Common variant patterns to detect
 */
const VARIANT_PATTERNS = [
  // Size patterns
  /^(.+?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*(mm|cm|m|inch|"|'|ft)?$/i,
  /^(.+?)\s+(\d+(?:\.\d+)?)\s*(mm|cm|m|inch|"|'|ft)$/i,
  /^(.+?)\s+size\s*[:=]?\s*(\w+)$/i,
  
  // Color patterns
  /^(.+?)\s*[-–]\s*(black|white|red|blue|green|yellow|silver|gold|chrome|brass|stainless)$/i,
  /^(.+?)\s+(black|white|red|blue|green|yellow|silver|gold|chrome|brass|stainless)$/i,
  
  // Material patterns
  /^(.+?)\s*[-–]\s*(steel|aluminum|brass|copper|plastic|wood|rubber|nylon)$/i,
  /^(.+?)\s+(stainless steel|carbon steel|aluminum|brass)$/i,
]

/**
 * Detect variants in product names
 * Groups products that appear to be variants of each other
 */
export function detectVariants(
  products: { name: string; rowIndex: number }[]
): VariantGroup[] {
  const groups: Map<string, VariantGroup> = new Map()
  
  for (const product of products) {
    let matched = false
    
    for (const pattern of VARIANT_PATTERNS) {
      const match = product.name.match(pattern)
      if (match) {
        const baseName = match[1].trim()
        const variantValue = match[2] + (match[3] || '')
        
        if (!groups.has(baseName)) {
          groups.set(baseName, {
            baseName,
            variants: []
          })
        }
        
        groups.get(baseName)!.variants.push({
          fullName: product.name,
          attribute: detectVariantType(match[2], match[3]),
          value: variantValue,
          rowIndex: product.rowIndex
        })
        
        matched = true
        break
      }
    }
    
    // If no pattern matched, treat as standalone
    if (!matched) {
      // Could still be grouped by similar base names later
    }
  }
  
  // Only return groups with 2+ variants
  return Array.from(groups.values()).filter(g => g.variants.length >= 2)
}

/**
 * Detect the type of variant attribute
 */
function detectVariantType(value: string, unit?: string): string {
  if (unit && /mm|cm|m|inch|"|'|ft/i.test(unit)) return 'Size'
  if (/^\d+(?:\.\d+)?$/.test(value)) return 'Size'
  if (/black|white|red|blue|green|yellow|silver|gold|chrome|brass/i.test(value)) return 'Color'
  if (/steel|aluminum|brass|copper|plastic|wood|rubber|nylon/i.test(value)) return 'Material'
  return 'Variant'
}

// ============================================
// HEADER DETECTION
// ============================================

const COMMON_HEADERS = [
  // SKU/Reference
  ['ref', 'reference', 'sku', 'code', 'item', 'product code', 'item code', 'part number', '产品编码', '编号'],
  // Name
  ['name', 'product', 'description', 'item name', 'product name', '产品名称', '名称'],
  // Price
  ['price', 'unit price', 'cost', 'amount', '价格', '单价'],
  // Quantity
  ['qty', 'quantity', 'amount', 'units', '数量'],
  // Category
  ['category', 'type', 'group', '类别', '分类'],
]

export interface HeaderMatch {
  columnIndex: number
  headerValue: string
  matchedField: 'ref' | 'name' | 'price' | 'quantity' | 'category' | 'unknown'
  confidence: number
}

/**
 * Auto-detect header row and column mappings
 */
export function detectHeaders(rows: string[][]): {
  headerRowIndex: number
  mappings: HeaderMatch[]
} {
  let bestRowIndex = 0
  let bestScore = 0
  let bestMappings: HeaderMatch[] = []
  
  // Check first 10 rows for potential headers
  for (let rowIndex = 0; rowIndex < Math.min(10, rows.length); rowIndex++) {
    const row = rows[rowIndex]
    if (!row || row.length === 0) continue
    
    const mappings: HeaderMatch[] = []
    let score = 0
    
    for (let colIndex = 0; colIndex < row.length; colIndex++) {
      const cellValue = String(row[colIndex] || '').toLowerCase().trim()
      if (!cellValue) continue
      
      let matched = false
      
      // Check against known headers
      const fieldNames: ('ref' | 'name' | 'price' | 'quantity' | 'category')[] = 
        ['ref', 'name', 'price', 'quantity', 'category']
      
      for (let fieldIndex = 0; fieldIndex < COMMON_HEADERS.length; fieldIndex++) {
        const patterns = COMMON_HEADERS[fieldIndex]
        if (patterns.some(p => cellValue.includes(p))) {
          mappings.push({
            columnIndex: colIndex,
            headerValue: row[colIndex],
            matchedField: fieldNames[fieldIndex],
            confidence: 0.9
          })
          score += 1
          matched = true
          break
        }
      }
      
      if (!matched && cellValue.length > 0) {
        mappings.push({
          columnIndex: colIndex,
          headerValue: row[colIndex],
          matchedField: 'unknown',
          confidence: 0
        })
      }
    }
    
    // Prefer rows with ref AND name matches
    const hasRef = mappings.some(m => m.matchedField === 'ref')
    const hasName = mappings.some(m => m.matchedField === 'name')
    if (hasRef && hasName) score += 2
    
    if (score > bestScore) {
      bestScore = score
      bestRowIndex = rowIndex
      bestMappings = mappings
    }
  }
  
  return {
    headerRowIndex: bestRowIndex,
    mappings: bestMappings
  }
}
