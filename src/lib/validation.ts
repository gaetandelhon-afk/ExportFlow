import { z } from 'zod'
import { NextResponse } from 'next/server'

/**
 * Validate request body against a Zod schema.
 * Returns the parsed data or a NextResponse error.
 */
export async function validateBody<T extends z.ZodType>(
  request: Request,
  schema: T
): Promise<z.infer<T> | NextResponse> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    )
  }

  const result = schema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      {
        error: 'Validation error',
        details: result.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      },
      { status: 400 }
    )
  }

  return result.data
}

export function isValidationError(result: unknown): result is NextResponse {
  return result instanceof NextResponse
}

// ============================================
// REUSABLE SCHEMA FRAGMENTS
// ============================================

const MAX_SHORT_STRING = 255
const MAX_TEXT = 5000
const MAX_LONG_TEXT = 50000

export const idSchema = z.string().uuid().or(z.string().cuid())

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

// ============================================
// ORDER SCHEMAS
// ============================================

export const orderStatusSchema = z.enum([
  'DRAFT', 'SUBMITTED', 'CONFIRMED', 'PREPARING',
  'SHIPPED', 'DELIVERED', 'CANCELLED',
])

export const updateOrderSchema = z.object({
  status: orderStatusSchema.optional(),
  notesEn: z.string().max(MAX_TEXT).optional(),
  modificationReason: z.string().max(MAX_SHORT_STRING).optional(),
  lines: z.array(z.object({
    id: z.string().max(MAX_SHORT_STRING),
    productId: z.string().max(MAX_SHORT_STRING).optional(),
    productRef: z.string().max(MAX_SHORT_STRING).optional(),
    productNameEn: z.string().max(MAX_SHORT_STRING).optional(),
    productNameCn: z.string().max(MAX_SHORT_STRING).optional(),
    quantity: z.number().int().min(0).max(1_000_000),
    unitPrice: z.number().min(0).max(1_000_000_000),
    product: z.object({
      id: z.string().optional(),
      ref: z.string().optional(),
      nameEn: z.string().optional(),
    }).optional(),
  })).optional(),
}).strict()

export const createOrderSchema = z.object({
  customerId: z.string().max(MAX_SHORT_STRING),
  notes: z.string().max(MAX_TEXT).optional(),
  currency: z.string().max(10).optional(),
  items: z.array(z.object({
    productId: z.string().max(MAX_SHORT_STRING),
    quantity: z.number().int().min(1).max(1_000_000),
    unitPrice: z.number().min(0).max(1_000_000_000).optional(),
    note: z.string().max(MAX_SHORT_STRING).optional(),
  })).min(1).max(500),
})

// ============================================
// CUSTOMER SCHEMAS
// ============================================

export const createCustomerSchema = z.object({
  companyName: z.string().min(1).max(MAX_SHORT_STRING),
  contactName: z.string().max(MAX_SHORT_STRING).optional().nullable(),
  email: z.string().email().max(MAX_SHORT_STRING).optional(),
  phone: z.string().max(50).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  currency: z.string().max(10).optional(),
  priceTier: z.string().max(MAX_SHORT_STRING).optional(),
  priceType: z.string().max(50).optional(),
  paymentTerms: z.string().max(MAX_SHORT_STRING).optional(),
  vatNumber: z.string().max(50).optional().nullable(),
  notes: z.string().max(MAX_TEXT).optional(),
  customDiscount: z.number().min(0).max(100).optional(),
  addresses: z.array(z.object({
    type: z.enum(['shipping', 'billing', 'both']),
    street: z.string().max(MAX_SHORT_STRING),
    city: z.string().max(MAX_SHORT_STRING),
    postalCode: z.string().max(20),
    country: z.string().max(100),
    state: z.string().max(100).optional(),
    contactName: z.string().max(MAX_SHORT_STRING).optional(),
    phone: z.string().max(50).optional(),
  })).optional(),
  customFields: z.array(z.object({
    label: z.string().max(MAX_SHORT_STRING),
    value: z.string().max(MAX_SHORT_STRING),
  })).optional(),
}).strict()

// ============================================
// PRODUCT SCHEMAS
// ============================================

export const createProductSchema = z.object({
  ref: z.string().min(1).max(MAX_SHORT_STRING),
  nameEn: z.string().min(1).max(MAX_SHORT_STRING),
  nameCn: z.string().max(MAX_SHORT_STRING).optional(),
  description: z.string().max(MAX_TEXT).optional(),
  categoryId: z.string().max(MAX_SHORT_STRING).optional().nullable(),
  priceRmb: z.number().min(0).max(1_000_000_000).optional(),
  priceBase: z.number().min(0).max(1_000_000_000).optional(),
  hsCode: z.string().max(20).optional(),
  weightKg: z.number().min(0).max(1_000_000).optional(),
  material: z.string().max(MAX_SHORT_STRING).optional(),
  moq: z.number().int().min(0).max(1_000_000).optional(),
}).strict()

// ============================================
// CATEGORY SCHEMAS
// ============================================

export const createCategorySchema = z.object({
  nameEn: z.string().min(1).max(MAX_SHORT_STRING),
  nameCn: z.string().max(MAX_SHORT_STRING).optional().nullable(),
  parentId: z.string().max(MAX_SHORT_STRING).optional().nullable(),
}).strict()

export const updateCategorySchema = z.object({
  nameEn: z.string().min(1).max(MAX_SHORT_STRING).optional(),
  nameCn: z.string().max(MAX_SHORT_STRING).optional().nullable(),
  parentId: z.string().max(MAX_SHORT_STRING).optional().nullable(),
}).strict()

// ============================================
// CHECKOUT SCHEMA
// ============================================

export const checkoutSchema = z.object({
  priceId: z.string().min(1).max(MAX_SHORT_STRING),
  skipTrial: z.boolean().optional(),
}).strict()

// ============================================
// SHIPMENT SCHEMAS
// ============================================

export const createShipmentSchema = z.object({
  name: z.string().max(MAX_SHORT_STRING).optional(),
  orderIds: z.array(z.string().max(MAX_SHORT_STRING)).optional(),
  transportMethod: z.string().max(50).optional(),
  carrierName: z.string().max(MAX_SHORT_STRING).optional(),
  trackingNumber: z.string().max(MAX_SHORT_STRING).optional(),
  originLocation: z.string().max(MAX_SHORT_STRING).optional(),
  destinationLocation: z.string().max(MAX_SHORT_STRING).optional(),
  transportDetails: z.string().max(MAX_TEXT).optional(),
  containerNumber: z.string().max(MAX_SHORT_STRING).optional(),
  blNumber: z.string().max(MAX_SHORT_STRING).optional(),
  vessel: z.string().max(MAX_SHORT_STRING).optional(),
  portOfLoading: z.string().max(MAX_SHORT_STRING).optional(),
  portOfDischarge: z.string().max(MAX_SHORT_STRING).optional(),
  estimatedLoadingDate: z.string().max(MAX_SHORT_STRING).optional(),
  estimatedArrivalDate: z.string().max(MAX_SHORT_STRING).optional(),
  notes: z.string().max(MAX_TEXT).optional(),
})

// ============================================
// TEMPLATE SCHEMAS
// ============================================

export const createTemplateSchema = z.object({
  name: z.string().min(1).max(MAX_SHORT_STRING),
  documentType: z.string().min(1).max(50),
  layoutElements: z.unknown().optional(),
  tableColumns: z.unknown().optional(),
  margins: z.unknown().optional(),
  displaySettings: z.unknown().optional(),
  isDefault: z.boolean().optional(),
}).strict()

// ============================================
// INVOICE SEND SCHEMA
// ============================================

export const sendInvoiceSchema = z.object({
  to: z.union([z.string().email(), z.array(z.string().email())]),
  cc: z.union([z.string().email(), z.array(z.string().email())]).optional(),
  subject: z.string().min(1).max(MAX_SHORT_STRING),
  body: z.string().max(MAX_LONG_TEXT).optional(),
}).strict()

// ============================================
// PRICE TIER SCHEMA
// ============================================

export const createPriceTierSchema = z.object({
  name: z.string().min(1).max(MAX_SHORT_STRING),
  code: z.string().min(1).max(50),
  description: z.string().max(MAX_TEXT).optional().nullable(),
  type: z.enum(['FIXED_PRICE', 'PERCENTAGE']).optional(),
  modifier: z.number().min(-100).max(10000).optional(),
  baseTierCode: z.string().max(50).optional().nullable(),
  isDefault: z.boolean().optional(),
}).strict()

// ============================================
// QUOTE SCHEMA
// ============================================

export const createQuoteSchema = z.object({
  customerId: z.string().max(MAX_SHORT_STRING),
  lines: z.array(z.object({
    productId: z.string().max(MAX_SHORT_STRING),
    productRef: z.string().max(MAX_SHORT_STRING),
    productNameEn: z.string().max(MAX_SHORT_STRING),
    quantity: z.number().int().min(1).max(1_000_000),
    unitPrice: z.number().min(0).max(1_000_000_000),
  })).min(1).max(500),
  validityDays: z.number().int().min(1).max(365).optional(),
  notes: z.string().max(MAX_TEXT).optional(),
})

// ============================================
// GROUPED INVOICE SCHEMA
// ============================================

export const createGroupedInvoiceSchema = z.object({
  orderIds: z.array(z.string().max(MAX_SHORT_STRING)).min(1).max(100),
  customerId: z.string().max(MAX_SHORT_STRING).optional(),
  notes: z.string().max(MAX_TEXT).optional(),
})

// ============================================
// BRANDING SCHEMA
// ============================================

export const updateBrandingSchema = z.object({
  primaryColor: z.string().max(20).optional(),
  secondaryColor: z.string().max(20).optional(),
  accentColor: z.string().max(20).optional(),
  logoUrl: z.string().url().max(2000).optional().nullable(),
  logoWidth: z.number().int().min(50).max(500).optional(),
  faviconUrl: z.string().url().max(2000).optional().nullable(),
  companyLegalName: z.string().max(MAX_SHORT_STRING).optional().nullable(),
  tagline: z.string().max(MAX_SHORT_STRING).optional().nullable(),
  invoiceHeader: z.string().max(MAX_TEXT).optional().nullable(),
  invoiceFooter: z.string().max(MAX_TEXT).optional().nullable(),
  emailSignature: z.string().max(MAX_TEXT).optional().nullable(),
  customCss: z.string().max(MAX_LONG_TEXT).optional().nullable(),
})

// ============================================
// EMAIL SEND SCHEMA
// ============================================

export const sendEmailSchema = z.object({
  type: z.string().min(1).max(50),
  to: z.union([z.string().email(), z.array(z.string().email())]),
  customerName: z.string().max(MAX_SHORT_STRING).optional(),
  orderNumber: z.string().max(MAX_SHORT_STRING).optional(),
  invoiceNumber: z.string().max(MAX_SHORT_STRING).optional(),
  packingListNumber: z.string().max(MAX_SHORT_STRING).optional(),
  factoryName: z.string().max(MAX_SHORT_STRING).optional(),
  orderReference: z.string().max(MAX_SHORT_STRING).optional(),
  totalItems: z.number().int().min(0).optional(),
  productionDate: z.string().max(MAX_SHORT_STRING).optional(),
  amount: z.string().max(MAX_SHORT_STRING).optional(),
  currency: z.string().max(10).optional(),
  dueDate: z.string().max(MAX_SHORT_STRING).optional(),
  pdfBase64: z.string().max(10_000_000).optional(),
  companyName: z.string().max(MAX_SHORT_STRING).optional(),
  quoteNumber: z.string().max(MAX_SHORT_STRING).optional(),
  validUntil: z.string().max(MAX_SHORT_STRING).optional(),
  orderDate: z.string().max(MAX_SHORT_STRING).optional(),
  items: z.array(z.object({
    name: z.string().max(MAX_SHORT_STRING),
    quantity: z.number(),
    price: z.string().max(MAX_SHORT_STRING),
  })).optional(),
  total: z.string().max(MAX_SHORT_STRING).optional(),
  trackingNumber: z.string().max(MAX_SHORT_STRING).optional(),
  carrier: z.string().max(MAX_SHORT_STRING).optional(),
  estimatedDelivery: z.string().max(MAX_SHORT_STRING).optional(),
  subject: z.string().max(MAX_SHORT_STRING).optional(),
  message: z.string().max(MAX_LONG_TEXT).optional(),
  title: z.string().max(MAX_SHORT_STRING).optional(),
  actionUrl: z.string().url().max(2000).optional(),
  actionText: z.string().max(MAX_SHORT_STRING).optional(),
  totalPackages: z.number().int().min(0).optional(),
  totalWeight: z.union([z.number().min(0), z.string().max(MAX_SHORT_STRING)]).optional(),
  shipmentDate: z.string().max(MAX_SHORT_STRING).optional(),
})

// ============================================
// TRASH SCHEMAS
// ============================================

const TRASHABLE_MODELS = [
  'product', 'category', 'customer', 'customerCategory',
  'invoice', 'order', 'shipment', 'packingList', 'documentTemplate',
] as const

export const trashRestoreAllSchema = z.object({
  entityType: z.enum(TRASHABLE_MODELS).optional(),
}).strict()

export const trashSettingsSchema = z.object({
  retentionDays: z.number().int().refine(
    (v) => [15, 30, 60].includes(v),
    { message: 'Retention days must be 15, 30, or 60' }
  ),
}).strict()

export const trashEntityTypeSchema = z.enum(TRASHABLE_MODELS)

// ============================================
// LEDGER ENTRY SCHEMA
// ============================================

export const createLedgerEntrySchema = z.object({
  type: z.enum(['OPENING_BALANCE', 'INVOICE', 'PAYMENT', 'CREDIT_NOTE', 'ADJUSTMENT']),
  date: z.string().max(MAX_SHORT_STRING),
  description: z.string().min(1).max(MAX_SHORT_STRING),
  reference: z.string().max(MAX_SHORT_STRING).optional().nullable(),
  amount: z.union([z.number(), z.string()]),
  notes: z.string().max(MAX_TEXT).optional().nullable(),
  invoiceId: z.string().max(MAX_SHORT_STRING).optional().nullable(),
}).strict()
