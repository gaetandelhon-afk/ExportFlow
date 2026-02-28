import { NextRequest, NextResponse } from 'next/server'
import { getApiSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { softDelete } from '@/lib/trash'
import { createAuditLog, computeChanges } from '@/lib/auditLog'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getApiSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!session.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const customer = await prisma.customer.findFirst({
      where: { id, companyId: session.companyId },
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    return NextResponse.json({ customer })

  } catch (error) {
    console.error('Get customer error:', error)
    return NextResponse.json({ error: 'Failed to get customer' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getApiSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!session.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // Fetch existing for audit diff
    const existingCustomer = await prisma.customer.findFirst({
      where: { id, companyId: session.companyId },
    })
    if (!existingCustomer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Get price tier ID if provided (new system)
    const priceTierId = body.priceTierId || null
    
    // Legacy priceType support
    let priceType = body.priceType || 'DISTRIBUTOR'
    if (!priceTierId) {
      // Only use legacy mapping if no priceTierId is provided
      if (body.priceTier === 'distributor') priceType = 'DISTRIBUTOR'
      else if (body.priceTier === 'wholesale') priceType = 'WHOLESALE'
      else if (body.priceTier === 'vip') priceType = 'VIP'
    }

    // Build shipping address from first address if available
    let shippingAddress: string | null | undefined = undefined
    let billingAddress: string | null | undefined = undefined
    
    if (body.addresses && body.addresses.length > 0) {
      const shippingAddr = body.addresses.find((a: { type: string }) => a.type === 'shipping' || a.type === 'both')
      const billingAddr = body.addresses.find((a: { type: string }) => a.type === 'billing' || a.type === 'both')
      
      if (shippingAddr) {
        shippingAddress = `${shippingAddr.street}\n${shippingAddr.postalCode} ${shippingAddr.city}\n${shippingAddr.country}`
      }
      if (billingAddr) {
        billingAddress = `${billingAddr.street}\n${billingAddr.postalCode} ${billingAddr.city}\n${billingAddr.country}`
      }
    } else if (body.shippingAddress !== undefined) {
      shippingAddress = body.shippingAddress
    }

    // Build custom fields object
    const customFields: Record<string, unknown> = {}
    if (body.customFields && Array.isArray(body.customFields)) {
      body.customFields.forEach((field: { label: string; value: string }) => {
        if (field.label) {
          customFields[field.label] = field.value
        }
      })
    }
    if (body.notes) customFields['notes'] = body.notes
    if (body.customDiscount && body.customDiscount > 0) customFields['discount'] = body.customDiscount
    if (body.legalName) customFields['legalName'] = body.legalName
    if (body.addresses && body.addresses.length > 0) customFields['addresses'] = body.addresses

    const updateData: Record<string, unknown> = {
      companyName: body.companyName,
      contactName: body.contactName || null,
      phone: body.phone || null,
      country: body.country || null,
      currency: body.currency || 'EUR',
      priceType,
      priceTierId: priceTierId, // New tier-based pricing
      paymentTerms: body.paymentTerms || undefined,
      vatNumber: body.vatNumber || null,
    }

    if (body.email) updateData.email = body.email
    if (shippingAddress !== undefined) updateData.shippingAddress = shippingAddress
    if (billingAddress !== undefined) updateData.billingAddress = billingAddress
    if (Object.keys(customFields).length > 0) updateData.customFields = customFields

    const customer = await prisma.customer.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ customer })

  } catch (error) {
    console.error('Update customer error:', error)
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 })
  }
}

// PATCH - Partial update (for category changes, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getApiSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!session.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // Verify customer exists and belongs to company
    const existing = await prisma.customer.findFirst({
      where: { id, companyId: session.companyId }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Build update data from provided fields
    const updateData: Record<string, unknown> = {}
    
    if (body.categoryId !== undefined) {
      updateData.categoryId = body.categoryId || null
    }
    if (body.companyName !== undefined) {
      updateData.companyName = body.companyName
    }
    if (body.contactName !== undefined) {
      updateData.contactName = body.contactName || null
    }
    if (body.email !== undefined) {
      updateData.email = body.email
    }
    if (body.phone !== undefined) {
      updateData.phone = body.phone || null
    }
    if (body.country !== undefined) {
      updateData.country = body.country || null
    }
    if (body.currency !== undefined) {
      updateData.currency = body.currency
    }
    if (body.priceTierId !== undefined) {
      updateData.priceTierId = body.priceTierId || null
    }
    if (body.isActive !== undefined) {
      updateData.isActive = body.isActive
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: updateData,
    })

    const oldData = {
      companyName: existing.companyName,
      email: existing.email,
      priceTierId: existing.priceTierId,
      creditLimit: (existing as { creditLimit?: unknown }).creditLimit,
      isActive: existing.isActive,
    }
    const newData = {
      companyName: customer.companyName,
      email: customer.email,
      priceTierId: customer.priceTierId,
      creditLimit: (customer as { creditLimit?: unknown }).creditLimit,
      isActive: customer.isActive,
    }
    const changes = computeChanges(oldData, newData, ['companyName', 'email', 'priceTierId', 'creditLimit', 'isActive'])
    await createAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      action: 'UPDATE',
      entityType: 'Customer',
      entityId: id,
      changes: changes ?? undefined,
      metadata: { companyName: customer.companyName },
      request,
    })

    return NextResponse.json({ customer })

  } catch (error) {
    console.error('Patch customer error:', error)
    return NextResponse.json({ error: 'Failed to update customer' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getApiSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!session.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    let reason: string | undefined
    try {
      const body = await request.json()
      reason = body.reason
    } catch {
      // DELETE body is optional
    }

    const customerToDelete = await prisma.customer.findFirst({
      where: { id, companyId: session.companyId, deletedAt: null },
      select: { id: true, companyName: true },
    })

    const deleted = await softDelete('customer', id, session.userId, session.companyId, reason)
    if (!deleted) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    await createAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      action: 'DELETE',
      entityType: 'Customer',
      entityId: id,
      metadata: { companyName: customerToDelete?.companyName },
      request,
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Delete customer error:', error)
    return NextResponse.json({ error: 'Failed to delete customer' }, { status: 500 })
  }
}