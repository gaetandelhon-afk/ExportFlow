import { NextRequest, NextResponse } from 'next/server'
import { clerkClient } from '@clerk/nextjs/server'
import { getApiSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog } from '@/lib/auditLog'

// POST - Record a payment
export async function POST(
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

    const client = await clerkClient()
    const user = await client.users.getUser(session.userId)
    const metadata = user.publicMetadata as Record<string, unknown>
    const role = (metadata.role as string | undefined) ?? 'ADMIN'

    if (role !== 'ADMIN' && role !== 'COMMERCIAL') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { type, amount, currency, reference, method, notes, paidAt } = body

    if (!type || !amount) {
      return NextResponse.json(
        { error: 'Payment type and amount are required' },
        { status: 400 }
      )
    }

    // Find order payment
    const orderPayment = await prisma.orderPayment.findFirst({
      where: {
        id,
        order: { companyId: session.companyId }
      }
    })

    if (!orderPayment) {
      return NextResponse.json({ error: 'Payment tracking not found' }, { status: 404 })
    }

    // Create payment record
    const record = await prisma.paymentRecord.create({
      data: {
        orderPaymentId: id,
        type: type.toUpperCase(),
        amount,
        currency: currency || orderPayment.currency,
        reference: reference || null,
        method: method || null,
        notes: notes || null,
        paidAt: paidAt ? new Date(paidAt) : new Date()
      }
    })

    // Update order payment totals
    let depositPaid = Number(orderPayment.depositPaid)
    let balancePaid = Number(orderPayment.balancePaid)

    if (type.toUpperCase() === 'DEPOSIT') {
      depositPaid += Number(amount)
    } else if (type.toUpperCase() === 'BALANCE') {
      balancePaid += Number(amount)
    } else {
      // OTHER - apply to whatever is outstanding
      const depositRemaining = Number(orderPayment.depositRequired || 0) - depositPaid
      if (depositRemaining > 0 && Number(amount) <= depositRemaining) {
        depositPaid += Number(amount)
      } else {
        balancePaid += Number(amount)
      }
    }

    // Determine new status
    const totalPaid = depositPaid + balancePaid
    const totalAmount = Number(orderPayment.totalAmount)
    let status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED' = 'PENDING'
    
    if (totalPaid >= totalAmount) {
      status = 'PAID'
    } else if (totalPaid > 0) {
      status = 'PARTIAL'
    }

    // Check for overdue
    const now = new Date()
    if (status !== 'PAID') {
      const depositOverdue = orderPayment.depositDueDate && 
        new Date(orderPayment.depositDueDate) < now && 
        depositPaid < Number(orderPayment.depositRequired || 0)
      const balanceOverdue = orderPayment.balanceDueDate && 
        new Date(orderPayment.balanceDueDate) < now && 
        balancePaid < Number(orderPayment.balanceRequired || 0)
      
      if (depositOverdue || balanceOverdue) {
        status = 'OVERDUE'
      }
    }

    await prisma.orderPayment.update({
      where: { id },
      data: {
        depositPaid,
        balancePaid,
        status
      }
    })

    await createAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      action: 'CREATE',
      entityType: 'PaymentRecord',
      entityId: record.id,
      metadata: {
        orderPaymentId: id,
        type: type.toUpperCase(),
        amount,
        currency: currency || orderPayment.currency,
        reference: reference || null,
        method: method || null,
        newStatus: status,
        totalPaid: depositPaid + balancePaid,
        totalAmount: Number(orderPayment.totalAmount),
      },
      request,
    })

    return NextResponse.json({ record }, { status: 201 })

  } catch (error) {
    console.error('Record payment error:', error)
    return NextResponse.json(
      { error: 'Failed to record payment' },
      { status: 500 }
    )
  }
}
