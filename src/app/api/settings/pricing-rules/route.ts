import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getApiSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getApiSession()
    if (!session?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rules = await prisma.pricingRule.findMany({
      where: { companyId: session.companyId },
      include: {
        breaks: {
          orderBy: { minQuantity: 'asc' }
        },
        products: {
          include: {
            product: {
              select: { id: true, ref: true, nameEn: true }
            }
          }
        }
      },
      orderBy: { sortOrder: 'asc' }
    })

    return NextResponse.json({ rules })
  } catch (error) {
    console.error('Error fetching pricing rules:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getApiSession()
    if (!session?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, code, description, type, breaks } = body

    if (!name || !code) {
      return NextResponse.json({ error: 'Name and code are required' }, { status: 400 })
    }

    const rule = await prisma.pricingRule.create({
      data: {
        name,
        code: code.toLowerCase().replace(/\s+/g, '_'),
        description,
        type: type || 'PERCENTAGE',
        companyId: session.companyId,
        breaks: {
          create: (breaks || []).map((b: { minQuantity: number; maxQuantity?: number; value: number }) => ({
            minQuantity: b.minQuantity,
            maxQuantity: b.maxQuantity || null,
            value: b.value
          }))
        }
      },
      include: {
        breaks: { orderBy: { minQuantity: 'asc' } }
      }
    })

    return NextResponse.json({ rule })
  } catch (error) {
    console.error('Error creating pricing rule:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getApiSession()
    if (!session?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { rules } = body

    if (!rules || !Array.isArray(rules)) {
      return NextResponse.json({ error: 'Rules array is required' }, { status: 400 })
    }

    // Get existing rules to find which ones to delete
    const existingRules = await prisma.pricingRule.findMany({
      where: { companyId: session.companyId },
      select: { id: true }
    })
    const existingIds = new Set(existingRules.map(r => r.id))
    const newIds = new Set(rules.filter(r => r.id && !r.id.startsWith('new-')).map(r => r.id))

    // Delete rules that are no longer in the list
    const toDelete = [...existingIds].filter(id => !newIds.has(id))
    if (toDelete.length > 0) {
      // Delete product associations first
      await prisma.productPricingRule.deleteMany({
        where: { pricingRuleId: { in: toDelete } }
      })
      // Delete breaks
      await prisma.pricingRuleBreak.deleteMany({
        where: { pricingRuleId: { in: toDelete } }
      })
      // Delete the rules
      await prisma.pricingRule.deleteMany({
        where: { id: { in: toDelete } }
      })
    }

    const updatedRules = []

    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i]
      
      if (rule.id && !rule.id.startsWith('new-')) {
        // Update existing rule
        await prisma.pricingRuleBreak.deleteMany({
          where: { pricingRuleId: rule.id }
        })

        const updated = await prisma.pricingRule.update({
          where: { id: rule.id },
          data: {
            name: rule.name,
            code: rule.code.toLowerCase().replace(/\s+/g, '_'),
            description: rule.description,
            type: rule.type,
            isActive: rule.isActive ?? true,
            sortOrder: i,
            breaks: {
              create: (rule.breaks || []).map((b: { minQuantity: number; maxQuantity?: number; value: number }) => ({
                minQuantity: b.minQuantity,
                maxQuantity: b.maxQuantity || null,
                value: b.value
              }))
            }
          },
          include: {
            breaks: { orderBy: { minQuantity: 'asc' } }
          }
        })
        updatedRules.push(updated)
      } else {
        // Create new rule
        const created = await prisma.pricingRule.create({
          data: {
            name: rule.name,
            code: rule.code.toLowerCase().replace(/\s+/g, '_'),
            description: rule.description,
            type: rule.type || 'PERCENTAGE',
            isActive: rule.isActive ?? true,
            sortOrder: i,
            companyId: session.companyId,
            breaks: {
              create: (rule.breaks || []).map((b: { minQuantity: number; maxQuantity?: number; value: number }) => ({
                minQuantity: b.minQuantity,
                maxQuantity: b.maxQuantity || null,
                value: b.value
              }))
            }
          },
          include: {
            breaks: { orderBy: { minQuantity: 'asc' } }
          }
        })
        updatedRules.push(created)
      }
    }

    return NextResponse.json({ rules: updatedRules })
  } catch (error) {
    console.error('Error updating pricing rules:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getApiSession()
    if (!session?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Rule ID is required' }, { status: 400 })
    }

    await prisma.pricingRule.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting pricing rule:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
