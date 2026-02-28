import { NextRequest, NextResponse } from 'next/server'
import { getApiSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/auditLog'

export async function POST(request: NextRequest) {
  try {
    const session = await getApiSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!session.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    if (!body.companyName) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 })
    }

    // Map priceTier to priceType (valid values: DISTRIBUTOR, DIRECT)
    let priceType: 'DISTRIBUTOR' | 'DIRECT' = 'DISTRIBUTOR'
    if (body.priceTier === 'direct' || body.priceTier === 'wholesale' || body.priceTier === 'vip') {
      priceType = 'DIRECT'
    } else if (body.priceType === 'DIRECT') {
      priceType = 'DIRECT'
    }

    // Build shipping address from first address if available
    let shippingAddress: string | null = null
    let billingAddress: string | null = null
    
    if (body.addresses && body.addresses.length > 0) {
      const shippingAddr = body.addresses.find((a: { type: string }) => a.type === 'shipping' || a.type === 'both')
      const billingAddr = body.addresses.find((a: { type: string }) => a.type === 'billing' || a.type === 'both')
      
      if (shippingAddr) {
        shippingAddress = `${shippingAddr.street}\n${shippingAddr.postalCode} ${shippingAddr.city}\n${shippingAddr.country}`
      }
      if (billingAddr) {
        billingAddress = `${billingAddr.street}\n${billingAddr.postalCode} ${billingAddr.city}\n${billingAddr.country}`
      }
    }

    // Build custom fields object - use Record<string, JsonValue> for Prisma compatibility
    const customFields: Record<string, string | number | boolean | null | Record<string, unknown>[]> = {}
    if (body.customFields && Array.isArray(body.customFields)) {
      body.customFields.forEach((field: { label: string; value: string }) => {
        if (field.label) {
          customFields[field.label] = field.value
        }
      })
    }
    // Also store notes in custom fields if provided
    if (body.notes) {
      customFields['notes'] = body.notes
    }
    // Store discount if provided
    if (body.customDiscount && body.customDiscount > 0) {
      customFields['discount'] = body.customDiscount
    }
    // Store legal name if provided
    if (body.legalName) {
      customFields['legalName'] = body.legalName
    }
    // Store addresses data
    if (body.addresses && body.addresses.length > 0) {
      customFields['addresses'] = body.addresses
    }

    const customer = await prisma.customer.create({
      data: {
        companyName: body.companyName,
        contactName: body.contactName || null,
        email: body.email || `${body.companyName.toLowerCase().replace(/\s+/g, '.')}@placeholder.com`, // Generate placeholder if not provided
        phone: body.phone || null,
        country: body.country || null,
        currency: body.currency || 'EUR',
        priceType,
        paymentTerms: body.paymentTerms || 'Net 30',
        vatNumber: body.vatNumber || null,
        shippingAddress,
        billingAddress,
        customFields: Object.keys(customFields).length > 0 ? customFields as Parameters<typeof prisma.customer.create>[0]['data']['customFields'] : undefined,
        companyId: session.companyId,
        isActive: true,
      },
    })

    await createAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      action: 'CREATE',
      entityType: 'Customer',
      entityId: customer.id,
      metadata: { companyName: customer.companyName, email: customer.email, priceTierId: customer.priceTierId },
      request,
    })

    return NextResponse.json({ customer })

  } catch (error) {
    console.error('Create customer error:', error)
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 })
  }
}