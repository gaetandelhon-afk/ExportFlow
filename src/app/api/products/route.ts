import { NextRequest, NextResponse } from 'next/server'
import { getApiSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkLimitNotReached, handlePlanError, PlanError, LimitError } from '@/lib/check-plan-session'
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

    // Check product limit before creation
    const productCount = await prisma.product.count({
      where: { companyId: session.companyId }
    })
    await checkLimitNotReached('products', productCount)

    const body = await request.json()

    // Validate required fields
    if (!body.ref || !body.nameEn) {
      return NextResponse.json(
        { error: 'Reference and name are required' },
        { status: 400 }
      )
    }

    // Check if product with same ref already exists
    const existing = await prisma.product.findFirst({
      where: {
        companyId: session.companyId,
        ref: body.ref,
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'A product with this reference already exists' },
        { status: 400 }
      )
    }

    // Build product data
    const productData: Record<string, unknown> = {
      companyId: session.companyId,
      ref: body.ref,
      nameEn: body.nameEn,
      nameCn: body.nameCn || null,
      description: body.description || null,
      material: body.material || null,
      hsCode: body.hsCode || null,
      isActive: body.isActive !== false,
    }

    // Photo URL
    if (body.photoUrl) {
      productData.photoUrl = body.photoUrl
    }

    // Category
    if (body.category || body.categoryId) {
      productData.categoryId = body.categoryId || body.category || null
    }

    // Weight
    if (body.weight) {
      productData.weightKg = parseFloat(body.weight)
    }

    // Pricing - save the full prices JSON for tier-based pricing
    if (body.prices && typeof body.prices === 'object') {
      const parsedPrices: Record<string, number> = {}
      for (const [key, val] of Object.entries(body.prices)) {
        const num = parseFloat(val as string)
        if (!isNaN(num) && num > 0) parsedPrices[key] = num
      }
      if (Object.keys(parsedPrices).length > 0) {
        productData.prices = parsedPrices
      }

      // Legacy column mapping for backward compatibility
      if (parsedPrices.base) productData.priceRmb = parsedPrices.base
      if (parsedPrices.distributor) productData.priceDistributor = parsedPrices.distributor
      if (parsedPrices.wholesale || parsedPrices.direct) {
        productData.priceDirect = parsedPrices.wholesale || parsedPrices.direct
      }

      // Use first available price as priceDistributor fallback for display
      if (!productData.priceDistributor) {
        const firstPrice = Object.values(parsedPrices)[0]
        if (firstPrice) productData.priceDistributor = firstPrice
      }
    }

    // Individual price fields (direct API calls)
    if (body.priceRmb) productData.priceRmb = parseFloat(body.priceRmb)
    if (body.priceDistributor) productData.priceDistributor = parseFloat(body.priceDistributor)
    if (body.priceDirect) productData.priceDirect = parseFloat(body.priceDirect)

    // Custom fields
    if (body.customFields) {
      productData.customFields = body.customFields
    }

    // Serial numbers
    if (body.requiresSerial !== undefined) productData.requiresSerial = Boolean(body.requiresSerial)
    if (body.serialPrefix !== undefined) productData.serialPrefix = body.serialPrefix || null

    const product = await prisma.product.create({
      data: productData as Parameters<typeof prisma.product.create>[0]['data'],
      include: {
        category: true,
      },
    })

    await createAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      action: 'CREATE',
      entityType: 'Product',
      entityId: product.id,
      metadata: { ref: product.ref, nameEn: product.nameEn, categoryId: product.categoryId },
      request,
    })

    return NextResponse.json({ product }, { status: 201 })

  } catch (error) {
    if (error instanceof PlanError || error instanceof LimitError) {
      return handlePlanError(error)
    }
    console.error('Create product error:', error)
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 })
  }
}
