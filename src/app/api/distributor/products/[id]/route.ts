import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { getApiSession } from '@/lib/auth'

// GET - Get single product for distributor
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getApiSession()
    if (!session?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const client = await clerkClient()
    const user = await client.users.getUser(session.userId)
    const metadata = user.publicMetadata as Record<string, unknown>
    const customerIdFromMeta = metadata.customerId as string | undefined

    const { id } = await params

    const product = await prisma.product.findFirst({
      where: {
        id,
        companyId: session.companyId,
        isActive: true,
      },
      include: {
        category: true,
      },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Get customer info for pricing
    const customer = customerIdFromMeta ? await prisma.customer.findUnique({
      where: { id: customerIdFromMeta },
    }) : null

    const priceType = customer?.priceType || 'DISTRIBUTOR'

    // Determine price based on customer type
    const basePrice = Number(product.priceRmb || 0)
    const distributorPrice = Number(product.priceDistributor || 0)
    const directPrice = Number(product.priceDirect || 0)

    // Calculate prices in different currencies
    const EUR_RATE = 0.13
    const USD_RATE = 0.14

    const priceRMB = priceType === 'DIRECT' ? (directPrice || distributorPrice || basePrice) : (distributorPrice || basePrice)

    const transformedProduct = {
      id: product.id,
      ref: product.ref,
      nameEn: product.nameEn,
      nameCn: product.nameCn || undefined,
      descriptionEn: product.description || undefined,
      prices: {
        RMB: priceRMB,
        EUR: Math.round(priceRMB * EUR_RATE * 100) / 100,
        USD: Math.round(priceRMB * USD_RATE * 100) / 100,
      },
      category: product.category?.nameEn || 'Uncategorized',
      categoryId: product.categoryId,
      stock: 100, // TODO: implement real stock tracking
      moq: 1,
      material: product.material || undefined,
      hsCode: product.hsCode || undefined,
      weight: product.weightKg ? Number(product.weightKg) : undefined,
      imageUrl: product.photoUrl || undefined,
      customFields: product.customFields, // Include options
    }

    // Get related products (same category)
    const relatedProducts = await prisma.product.findMany({
      where: {
        companyId: session.companyId,
        categoryId: product.categoryId,
        id: { not: product.id },
        isActive: true,
      },
      take: 4,
      include: {
        category: true,
      },
    })

    const transformedRelated = relatedProducts.map(p => ({
      id: p.id,
      ref: p.ref,
      nameEn: p.nameEn,
      nameCn: p.nameCn || undefined,
      prices: {
        RMB: priceType === 'DIRECT' 
          ? (Number(p.priceDirect || p.priceDistributor || p.priceRmb || 0))
          : (Number(p.priceDistributor || p.priceRmb || 0)),
        EUR: 0,
        USD: 0,
      },
      category: p.category?.nameEn || 'Uncategorized',
      stock: 100,
      moq: 1,
      imageUrl: p.photoUrl || undefined,
      customFields: p.customFields,
    }))

    return NextResponse.json({
      product: transformedProduct,
      relatedProducts: transformedRelated,
    })

  } catch (error) {
    console.error('Get distributor product error:', error)
    return NextResponse.json(
      { error: 'Failed to load product' },
      { status: 500 }
    )
  }
}
