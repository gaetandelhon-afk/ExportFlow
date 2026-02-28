import { NextRequest, NextResponse } from 'next/server'
import { getApiSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ customerId: string; entryId: string }> }
) {
  try {
    const session = await getApiSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!session.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { customerId, entryId } = await params
    const companyId = session.companyId

    try {
      // Verify the entry exists and belongs to this customer/company
      const entry = await prisma.customerLedgerEntry.findFirst({
        where: {
          id: entryId,
          customerId,
          companyId,
        },
      })

      if (!entry) {
        return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
      }

      // Delete the entry
      await prisma.customerLedgerEntry.delete({
        where: { id: entryId },
      })

      return NextResponse.json({ success: true })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
        return NextResponse.json({ error: 'Ledger table not found' }, { status: 500 })
      }
      throw error
    }
  } catch (error) {
    console.error('Error deleting ledger entry:', error)
    return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ customerId: string; entryId: string }> }
) {
  try {
    const session = await getApiSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!session.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { customerId, entryId } = await params
    const companyId = session.companyId

    const body = await request.json()
    const { date, description, reference, amount, notes } = body

    try {
      // Verify the entry exists and belongs to this customer/company
      const entry = await prisma.customerLedgerEntry.findFirst({
        where: {
          id: entryId,
          customerId,
          companyId,
        },
      })

      if (!entry) {
        return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
      }

      // Update the entry
      const updatedEntry = await prisma.customerLedgerEntry.update({
        where: { id: entryId },
        data: {
          ...(date !== undefined && { date: new Date(date) }),
          ...(description !== undefined && { description }),
          ...(reference !== undefined && { reference }),
          ...(amount !== undefined && { amount: parseFloat(amount) }),
          ...(notes !== undefined && { notes }),
        },
      })

      return NextResponse.json({ entry: updatedEntry })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
        return NextResponse.json({ error: 'Ledger table not found' }, { status: 500 })
      }
      throw error
    }
  } catch (error) {
    console.error('Error updating ledger entry:', error)
    return NextResponse.json({ error: 'Failed to update entry' }, { status: 500 })
  }
}
