import { NextResponse } from 'next/server'
import { getApiSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getApiSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!session.companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const [products, customers, orders30d, teamMembers] = await Promise.all([
      prisma.product.count({
        where: { companyId: session.companyId }
      }),
      prisma.customer.count({
        where: { companyId: session.companyId }
      }),
      prisma.order.count({
        where: {
          companyId: session.companyId,
          createdAt: { gte: thirtyDaysAgo }
        }
      }),
      prisma.user.count({
        where: { companyId: session.companyId }
      })
    ])

    return NextResponse.json({
      products,
      customers,
      orders30d,
      teamMembers
    })
  } catch (error) {
    console.error('Failed to fetch stats:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
