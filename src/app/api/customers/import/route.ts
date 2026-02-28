import { NextRequest, NextResponse } from 'next/server'
import { getApiSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface ImportedCustomer {
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
}

interface PriceTierRef {
  id: string
  name: string
  code: string
}

interface ImportRequest {
  customers: ImportedCustomer[]
  priceTiers?: PriceTierRef[]
}

// POST - Import customers
export async function POST(request: NextRequest) {
  try {
    const session = await getApiSession()
    if (!session?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body: ImportRequest = await request.json()
    const { customers, priceTiers } = body

    if (!customers || customers.length === 0) {
      return NextResponse.json({ error: 'No customers to import' }, { status: 400 })
    }

    let created = 0
    let updated = 0
    const errors: string[] = []

    // Build price tier code -> id map
    const priceTierMap = new Map<string, string>()
    if (priceTiers && priceTiers.length > 0) {
      for (const tier of priceTiers) {
        priceTierMap.set(tier.code.toLowerCase(), tier.id)
      }
    } else {
      // Fetch from database
      const dbTiers = await prisma.priceTier.findMany({
        where: { companyId: session.companyId }
      })
      for (const tier of dbTiers) {
        priceTierMap.set(tier.code.toLowerCase(), tier.id)
      }
    }

    // Get existing customers by email
    const existingCustomers = await prisma.customer.findMany({
      where: {
        companyId: session.companyId,
        email: { in: customers.map(c => c.email.toLowerCase()) }
      },
      select: { id: true, email: true }
    })
    const existingMap = new Map(existingCustomers.map(c => [c.email.toLowerCase(), c.id]))

    // Process each customer
    for (const customer of customers) {
      try {
        if (customer.action === 'skip') continue

        const emailLower = customer.email.toLowerCase()
        const existingId = existingMap.get(emailLower)

        // Resolve price tier ID
        let priceTierId: string | null = null
        if (customer.priceTier) {
          const tierCode = customer.priceTier.toLowerCase().trim()
          priceTierId = priceTierMap.get(tierCode) || null
        }

        // Build custom fields
        const customFields: Record<string, unknown> = {}
        if (customer.customFields) {
          for (const [key, value] of Object.entries(customer.customFields)) {
            if (value && value.trim()) {
              customFields[key] = value.trim()
            }
          }
        }

        // Build full addresses from structured fields if not already provided
        let shippingAddress = customer.shippingAddress
        if (!shippingAddress && (customer.shippingStreet || customer.shippingCity)) {
          const parts = [
            customer.shippingStreet,
            customer.shippingCity,
            customer.shippingState,
            customer.shippingPostalCode,
            customer.shippingCountry
          ].filter(Boolean)
          shippingAddress = parts.join(', ')
        }

        let billingAddress = customer.billingAddress
        if (!billingAddress && (customer.billingStreet || customer.billingCity)) {
          const parts = [
            customer.billingStreet,
            customer.billingCity,
            customer.billingState,
            customer.billingPostalCode,
            customer.billingCountry
          ].filter(Boolean)
          billingAddress = parts.join(', ')
        }

        if (customer.action === 'create' && !existingId) {
          // Create new customer
          await prisma.customer.create({
            data: {
              companyName: customer.companyName,
              contactName: customer.contactName || null,
              email: customer.email,
              phone: customer.phone || null,
              country: customer.country || customer.shippingCountry || customer.billingCountry || null,
              currency: customer.currency || 'EUR',
              vatNumber: customer.vatNumber || null,
              paymentTerms: customer.paymentTerms || 'Net 30',
              language: customer.language || 'en',
              // Full addresses
              shippingAddress: shippingAddress || null,
              billingAddress: billingAddress || null,
              // Structured shipping
              shippingStreet: customer.shippingStreet || null,
              shippingCity: customer.shippingCity || null,
              shippingState: customer.shippingState || null,
              shippingPostalCode: customer.shippingPostalCode || null,
              shippingCountry: customer.shippingCountry || null,
              // Structured billing
              billingStreet: customer.billingStreet || null,
              billingCity: customer.billingCity || null,
              billingState: customer.billingState || null,
              billingPostalCode: customer.billingPostalCode || null,
              billingCountry: customer.billingCountry || null,
              // Price tier
              priceTierId: priceTierId,
              // Custom fields
              customFields: Object.keys(customFields).length > 0 
                ? customFields as Parameters<typeof prisma.customer.create>[0]['data']['customFields']
                : undefined,
              // Company
              companyId: session.companyId,
              isActive: true,
            }
          })
          created++
        } else if (customer.action === 'update' && existingId) {
          // Update existing customer
          const updateData: Record<string, unknown> = {
            companyName: customer.companyName,
          }
          
          if (customer.contactName) updateData.contactName = customer.contactName
          if (customer.phone) updateData.phone = customer.phone
          if (customer.country) updateData.country = customer.country
          if (customer.currency) updateData.currency = customer.currency
          if (customer.vatNumber) updateData.vatNumber = customer.vatNumber
          if (customer.paymentTerms) updateData.paymentTerms = customer.paymentTerms
          if (customer.language) updateData.language = customer.language
          if (priceTierId) updateData.priceTierId = priceTierId
          
          // Addresses
          if (shippingAddress) updateData.shippingAddress = shippingAddress
          if (billingAddress) updateData.billingAddress = billingAddress
          if (customer.shippingStreet) updateData.shippingStreet = customer.shippingStreet
          if (customer.shippingCity) updateData.shippingCity = customer.shippingCity
          if (customer.shippingState) updateData.shippingState = customer.shippingState
          if (customer.shippingPostalCode) updateData.shippingPostalCode = customer.shippingPostalCode
          if (customer.shippingCountry) updateData.shippingCountry = customer.shippingCountry
          if (customer.billingStreet) updateData.billingStreet = customer.billingStreet
          if (customer.billingCity) updateData.billingCity = customer.billingCity
          if (customer.billingState) updateData.billingState = customer.billingState
          if (customer.billingPostalCode) updateData.billingPostalCode = customer.billingPostalCode
          if (customer.billingCountry) updateData.billingCountry = customer.billingCountry
          
          if (Object.keys(customFields).length > 0) {
            updateData.customFields = customFields as Parameters<typeof prisma.customer.update>[0]['data']['customFields']
          }
          
          await prisma.customer.update({
            where: { id: existingId },
            data: updateData as Parameters<typeof prisma.customer.update>[0]['data']
          })
          updated++
        } else if (customer.action === 'create' && existingId) {
          // Create duplicate (create_new action)
          await prisma.customer.create({
            data: {
              companyName: customer.companyName,
              contactName: customer.contactName || null,
              email: customer.email, // This will create a duplicate email
              phone: customer.phone || null,
              country: customer.country || null,
              currency: customer.currency || 'EUR',
              vatNumber: customer.vatNumber || null,
              paymentTerms: customer.paymentTerms || 'Net 30',
              language: customer.language || 'en',
              shippingAddress: shippingAddress || null,
              billingAddress: billingAddress || null,
              shippingStreet: customer.shippingStreet || null,
              shippingCity: customer.shippingCity || null,
              shippingState: customer.shippingState || null,
              shippingPostalCode: customer.shippingPostalCode || null,
              shippingCountry: customer.shippingCountry || null,
              billingStreet: customer.billingStreet || null,
              billingCity: customer.billingCity || null,
              billingState: customer.billingState || null,
              billingPostalCode: customer.billingPostalCode || null,
              billingCountry: customer.billingCountry || null,
              priceTierId: priceTierId,
              customFields: Object.keys(customFields).length > 0 
                ? customFields as Parameters<typeof prisma.customer.create>[0]['data']['customFields']
                : undefined,
              companyId: session.companyId,
              isActive: true,
            }
          })
          created++
        }
      } catch (err) {
        errors.push(`Row ${customer.rowIndex + 1} (${customer.email}): ${err instanceof Error ? err.message : 'Unknown error'}`)
      }
    }

    return NextResponse.json({
      success: true,
      created,
      updated,
      errors
    })

  } catch (error) {
    console.error('Import customers error:', error)
    return NextResponse.json(
      { error: 'Failed to import customers' },
      { status: 500 }
    )
  }
}
