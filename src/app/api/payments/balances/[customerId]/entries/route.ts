import { NextRequest, NextResponse } from 'next/server'
import { getApiSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { LedgerEntryType, Prisma } from '@prisma/client'

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

    // Verify customer belongs to company
    const customer = await prisma.customer.findFirst({
      where: { 
        id: customerId,
        companyId,
      },
      select: {
        id: true,
        currency: true,
      },
    })

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const body = await request.json()
    const { type, date, description, reference, amount, notes, invoiceId } = body

    // Validate required fields
    if (!type || !date || !description || amount === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate entry type
    const validTypes: LedgerEntryType[] = ['OPENING_BALANCE', 'INVOICE', 'PAYMENT', 'CREDIT_NOTE', 'ADJUSTMENT']
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid entry type' }, { status: 400 })
    }

    try {
      const entry = await prisma.customerLedgerEntry.create({
        data: {
          type: type as LedgerEntryType,
          date: new Date(date),
          description,
          reference: reference || null,
          amount: parseFloat(amount),
          currency: customer.currency,
          notes: notes || null,
          invoiceId: invoiceId || null,
          customerId,
          companyId,
          createdBy: session.userId,
        },
      })

      return NextResponse.json({ entry })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
        return NextResponse.json({ 
          error: 'Ledger table not yet created. Please run database migration.' 
        }, { status: 500 })
      }
      throw error
    }
  } catch (error) {
    console.error('Error creating ledger entry:', error)
    return NextResponse.json({ error: 'Failed to create entry' }, { status: 500 })
  }
}
