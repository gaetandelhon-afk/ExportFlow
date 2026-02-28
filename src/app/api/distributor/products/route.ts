import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { getApiSession } from '@/lib/auth'

// GET - List products for distributor
export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession()
    if (!session?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const client = await clerkClient()
    const user = await client.users.getUser(session.userId)
    const metadata = user.publicMetadata as Record<string, unknown>
    const role = (metadata.role as string | undefined) ?? 'ADMIN'
    const customerIdFromMeta = metadata.customerId as string | undefined

    // Get query params for filtering
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const categoryId = searchParams.get('categoryId') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '500')
    const previewCustomerId = searchParams.get('previewCustomerId') || ''

    // Build where clause
    const where: Record<string, unknown> = {
      companyId: session.companyId,
      isActive: true,
    }

    // Search filter
    if (search) {
      where.OR = [
        { nameEn: { contains: search, mode: 'insensitive' } },
        { nameCn: { contains: search, mode: 'insensitive' } },
        { ref: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Category filter - include subcategories if a parent category is selected
    if (categoryId) {
      // Get all subcategories of this category
      const subcategories = await prisma.category.findMany({
        where: { 
          companyId: session.companyId,
          parentId: categoryId 
        },
        select: { id: true }
      })
      
      const categoryIds = [categoryId, ...subcategories.map(c => c.id)]
      where.categoryId = { in: categoryIds }
    }

    // Get products with pagination and pricing rules
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          category: true,
          pricingRules: {
            include: {
              pricingRule: {
                include: {
                  breaks: {
                    orderBy: { minQuantity: 'asc' }
                  }
                }
              }
            }
          }
        },
        orderBy: [
          { sortOrder: 'asc' },
          { nameEn: 'asc' },
        ],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.product.count({ where }),
    ])

    // Get customer info for pricing (including their price tier)
    // In preview mode, admins can specify a customer to simulate
    let customer = null
    if (previewCustomerId && (role === 'ADMIN' || role === 'COMMERCIAL')) {
      customer = await prisma.customer.findFirst({
        where: { 
          id: previewCustomerId,
          companyId: session.companyId,
        },
        include: {
          priceTier: true
        }
      })
    } else if (customerIdFromMeta) {
      customer = await prisma.customer.findUnique({
        where: { id: customerIdFromMeta },
        include: {
          priceTier: true
        }
      })
    }

    // Get the customer's price tier info
    const priceTierCode = customer?.priceTier?.code || customer?.priceType?.toLowerCase() || 'distributor'
    const priceTierType = customer?.priceTier?.type || 'FIXED_PRICE'
    const priceTierModifier = customer?.priceTier?.modifier ? Number(customer.priceTier.modifier) : 0
    const baseTierCode = customer?.priceTier?.baseTierCode || null

    // Transform products for distributor frontend
    const transformedProducts = products.map(product => {
      // Get product prices JSON (tier-specific prices)
      const productPrices = product.prices as Record<string, number> | null
      
      // Determine price based on customer's tier type
      let price: number
      
      if (priceTierType === 'PERCENTAGE' && baseTierCode) {
        // PERCENTAGE type: Get base tier price and apply modifier %
        let baseTierPrice = 0
        
        // Try to get the base tier price from the product's prices
        if (productPrices && productPrices[baseTierCode] !== undefined && productPrices[baseTierCode] > 0) {
          baseTierPrice = Number(productPrices[baseTierCode])
        } else {
          // Fall back to product's base price or legacy fields
          baseTierPrice = Number(product.priceBase || product.priceDistributor || product.priceDirect || product.priceRmb || 0)
        }
        
        if (baseTierPrice > 0) {
          price = baseTierPrice * (1 + priceTierModifier / 100)
          price = Math.round(price * 100) / 100 // Round to 2 decimals
        } else {
          // Fallback to legacy prices
          price = Number(product.priceDistributor || product.priceDirect || 0)
        }
      } else {
        // FIXED_PRICE type: Use tier-specific price from product
        if (productPrices && productPrices[priceTierCode] !== undefined && productPrices[priceTierCode] > 0) {
          price = Number(productPrices[priceTierCode])
        } else if (productPrices && Object.keys(productPrices).length > 0) {
          // Fall back to first available price in the prices object
          const firstPrice = Object.values(productPrices)[0]
          price = Number(firstPrice)
        } else {
          // Fall back to legacy pricing fields
          const basePrice = Number(product.priceBase || product.priceDistributor || product.priceDirect || product.priceRmb || 0)
          price = Number(product.priceDistributor || product.priceDirect || basePrice)
        }
      }
      
      // Extract pricing rules for quantity breaks
      const pricingRules = product.pricingRules?.map(pr => ({
        id: pr.pricingRule.id,
        name: pr.pricingRule.name,
        code: pr.pricingRule.code,
        type: pr.pricingRule.type,
        breaks: pr.pricingRule.breaks.map(b => ({
          minQuantity: b.minQuantity,
          maxQuantity: b.maxQuantity,
          value: Number(b.value)
        }))
      })) || []

      return {
        id: product.id,
        ref: product.ref,
        nameEn: product.nameEn,
        nameCn: product.nameCn || undefined,
        descriptionEn: product.description || undefined,
        price, // Single price for the customer's tier
        prices: {
          [priceTierCode]: price, // Include which tier price this is
        },
        allPrices: productPrices || {}, // Include all tier prices for reference
        category: product.category?.nameEn || 'Uncategorized',
        categoryId: product.categoryId,
        stock: 100, // TODO: implement real stock tracking
        moq: 1,
        material: product.material || undefined,
        hsCode: product.hsCode || undefined,
        weight: product.weightKg ? Number(product.weightKg) : undefined,
        imageUrl: product.photoUrl || undefined,
        customFields: product.customFields,
        pricingRules, // Include quantity-based pricing rules
        priceTier: priceTierCode, // Which tier the price is from
      }
    })

    // Get categories for filter with hierarchy info
    const categories = await prisma.category.findMany({
      where: { companyId: session.companyId },
      include: {
        children: {
          select: { id: true, nameEn: true }
        },
        _count: {
          select: { products: true }
        }
      },
      orderBy: [{ sortOrder: 'asc' }, { nameEn: 'asc' }],
    })

    return NextResponse.json({
      products: transformedProducts,
      categories: categories.map(c => ({
        id: c.id,
        name: c.nameEn,
        parentId: c.parentId,
        isParent: !c.parentId,
        hasChildren: c.children.length > 0,
        children: c.children,
        productCount: c._count.products,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })

  } catch (error) {
    console.error('Get distributor products error:', error)
    return NextResponse.json(
      { error: 'Failed to load products' },
      { status: 500 }
    )
  }
}
