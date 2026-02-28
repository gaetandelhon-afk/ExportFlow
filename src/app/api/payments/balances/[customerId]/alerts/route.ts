import { NextRequest, NextResponse } from 'next/server'
import { getApiSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Toggle payment alerts for a customer
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ customerId: string }> }
) {
  try {
    const session = await getApiSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!session.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { customerId } = await params
    const companyId = session.companyId
    const body = await request.json()
    const { muted } = body

    // Verify customer belongs to company
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, companyId },
      select: { id: true, paymentAlertsMuted: true },
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Update alert status
    const updated = await prisma.customer.update({
      where: { id: customerId },
      data: { paymentAlertsMuted: muted === true },
      select: { id: true, paymentAlertsMuted: true },
    })

    return NextResponse.json({ 
      success: true, 
      alertsMuted: updated.paymentAlertsMuted 
    })
  } catch (error) {
    console.error('Error updating payment alerts:', error)
    return NextResponse.json({ error: 'Failed to update alerts' }, { status: 500 })
  }
}
