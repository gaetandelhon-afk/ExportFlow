import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getApiSession } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getApiSession()
    if (!session?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const productRules = await prisma.productPricingRule.findMany({
      where: { productId: id },
      include: {
        pricingRule: {
          include: {
            breaks: { orderBy: { minQuantity: 'asc' } }
          }
        }
      }
    })

    return NextResponse.json({
      rules: productRules.map(pr => pr.pricingRule)
    })
  } catch (error) {
    console.error('Error fetching product pricing rules:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getApiSession()
    if (!session?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { ruleIds } = body

    if (!Array.isArray(ruleIds)) {
      return NextResponse.json({ error: 'ruleIds array is required' }, { status: 400 })
    }

    // Delete existing assignments
    await prisma.productPricingRule.deleteMany({
      where: { productId: id }
    })

    // Create new assignments
    if (ruleIds.length > 0) {
      await prisma.productPricingRule.createMany({
        data: ruleIds.map((ruleId: string) => ({
          productId: id,
          pricingRuleId: ruleId
        }))
      })
    }

    // Fetch updated rules
    const productRules = await prisma.productPricingRule.findMany({
      where: { productId: id },
      include: {
        pricingRule: {
          include: {
            breaks: { orderBy: { minQuantity: 'asc' } }
          }
        }
      }
    })

    return NextResponse.json({
      rules: productRules.map(pr => pr.pricingRule)
    })
  } catch (error) {
    console.error('Error updating product pricing rules:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
