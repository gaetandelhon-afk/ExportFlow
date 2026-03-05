import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { softDelete } from '@/lib/trash'
import { getApiSession } from '@/lib/auth'
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

    const { id } = await params

    const product = await prisma.product.findFirst({
      where: {
        id,
        companyId: session.companyId,
      },
      include: {
        category: true,
      },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json({ product })

  } catch (error) {
    console.error('Get product error:', error)
    return NextResponse.json({ error: 'Failed to get product' }, { status: 500 })
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

    const { id } = await params
    const body = await request.json()

    // Verify product belongs to company
    const existing = await prisma.product.findFirst({
      where: { id, companyId: session.companyId }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Build update data
    const updateData: Record<string, unknown> = {}

    // Basic fields
    if (body.ref !== undefined) updateData.ref = body.ref
    if (body.nameEn !== undefined) updateData.nameEn = body.nameEn
    if (body.nameCn !== undefined) updateData.nameCn = body.nameCn || null
    if (body.description !== undefined) updateData.description = body.description || null
    if (body.material !== undefined) updateData.material = body.material || null
    if (body.hsCode !== undefined) updateData.hsCode = body.hsCode || null
    // Category
    if (body.categoryId !== undefined) {
      updateData.categoryId = body.categoryId || null
    }

    // Weight (stored as weightKg in DB)
    if (body.weight !== undefined) {
      updateData.weightKg = body.weight ? parseFloat(body.weight) : null
    }

    // Pricing - handle individual price fields
    if (body.priceDistributor !== undefined) {
      updateData.priceDistributor = body.priceDistributor ? parseFloat(body.priceDistributor) : null
    }
    if (body.priceRmb !== undefined) {
      updateData.priceRmb = body.priceRmb ? parseFloat(body.priceRmb) : null
    }
    if (body.priceDirect !== undefined) {
      updateData.priceDirect = body.priceDirect ? parseFloat(body.priceDirect) : null
    }

    // Handle prices object - save to JSON column for tier-based pricing
    if (body.prices && typeof body.prices === 'object') {
      const parsedPrices: Record<string, number> = {}
      for (const [key, val] of Object.entries(body.prices)) {
        const num = parseFloat(val as string)
        if (!isNaN(num) && num > 0) parsedPrices[key] = num
      }
      updateData.prices = Object.keys(parsedPrices).length > 0 ? parsedPrices : null

      // Legacy column mapping for backward compatibility
      if (parsedPrices.base) updateData.priceRmb = parsedPrices.base
      if (parsedPrices.distributor) updateData.priceDistributor = parsedPrices.distributor
      if (parsedPrices.wholesale || parsedPrices.direct) {
        updateData.priceDirect = parsedPrices.wholesale || parsedPrices.direct
      }
      if ('DISTRIBUTOR' in parsedPrices) updateData.priceDistributor = parsedPrices.DISTRIBUTOR
      if ('DIRECT' in parsedPrices) updateData.priceDirect = parsedPrices.DIRECT

      // Use first available price as priceDistributor fallback for display
      if (!updateData.priceDistributor && Object.keys(parsedPrices).length > 0) {
        updateData.priceDistributor = Object.values(parsedPrices)[0]
      }
    }

    // Custom fields - store as JSON
    if (body.customFields !== undefined) {
      updateData.customFields = body.customFields
    }

    // Serial numbers
    if (body.requiresSerial !== undefined) updateData.requiresSerial = Boolean(body.requiresSerial)
    if (body.serialPrefix !== undefined) updateData.serialPrefix = body.serialPrefix || null

    // Main image URL
    if (body.photoUrl !== undefined) {
      updateData.photoUrl = body.photoUrl || null
    }

    // If images array is provided, set the main image as photoUrl
    if (body.images && Array.isArray(body.images)) {
      const mainImage = body.images.find((img: { isMain?: boolean }) => img.isMain)
      if (mainImage && mainImage.url) {
        updateData.photoUrl = mainImage.url
      } else if (body.images.length > 0 && body.images[0].url) {
        updateData.photoUrl = body.images[0].url
      }
    }

    // Photos gallery array — save all image URLs
    if (body.photos && Array.isArray(body.photos)) {
      updateData.photos = body.photos.filter((u: unknown) => typeof u === 'string' && u.length > 0)
    } else if (body.images && Array.isArray(body.images)) {
      // Derive from images array if photos not explicitly sent
      const allUrls = body.images
        .map((img: { url?: string }) => img.url)
        .filter((u: unknown) => typeof u === 'string' && (u as string).length > 0)
      if (allUrls.length > 0) {
        updateData.photos = allUrls
      }
    }

    let product: Awaited<ReturnType<typeof prisma.product.update>>
    try {
      product = await prisma.product.update({
        where: { id },
        data: updateData,
        include: { category: true },
      })
    } catch (prismaError: unknown) {
      // If photos column doesn't exist yet, retry without it
      const msg = prismaError instanceof Error ? prismaError.message : ''
      if (msg.includes('photos') || msg.includes('Unknown argument')) {
        delete updateData.photos
        product = await prisma.product.update({
          where: { id },
          data: updateData,
          include: { category: true },
        })
      } else {
        throw prismaError
      }
    }

    const oldData = {
      nameEn: existing.nameEn,
      nameCn: existing.nameCn,
      priceDistributor: existing.priceDistributor,
      priceRmb: existing.priceRmb,
      categoryId: existing.categoryId,
      isActive: existing.isActive,
    }
    const newData = {
      nameEn: product.nameEn,
      nameCn: product.nameCn,
      priceDistributor: product.priceDistributor,
      priceRmb: product.priceRmb,
      categoryId: product.categoryId,
      isActive: product.isActive,
    }
    const changes = computeChanges(oldData, newData, ['nameEn', 'nameCn', 'priceDistributor', 'priceRmb', 'categoryId', 'isActive'])
    await createAuditLog({
      companyId: session.companyId!,
      userId: session.userId,
      action: 'UPDATE',
      entityType: 'Product',
      entityId: id,
      changes: changes ?? undefined,
      metadata: { ref: product.ref, nameEn: product.nameEn },
      request,
    })

    return NextResponse.json({ product })

  } catch (error) {
    console.error('Update product error:', error)
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 })
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

    const { id } = await params

    let reason: string | undefined
    try {
      const body = await request.json()
      reason = body.reason
    } catch {
      // DELETE body is optional
    }

    const productToDelete = await prisma.product.findFirst({
      where: { id, companyId: session.companyId!, deletedAt: null },
      select: { id: true, ref: true, nameEn: true },
    })

    const deleted = await softDelete('product', id, session.userId, session.companyId!, reason)
    if (!deleted) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    await createAuditLog({
      companyId: session.companyId!,
      userId: session.userId,
      action: 'DELETE',
      entityType: 'Product',
      entityId: id,
      metadata: { ref: productToDelete?.ref, nameEn: productToDelete?.nameEn },
      request,
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Delete product error:', error)
    return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 })
  }
}
