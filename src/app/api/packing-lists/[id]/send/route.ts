import { NextRequest, NextResponse } from 'next/server'
import { getApiSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendFactoryPackingListEmail } from '@/lib/email'

// POST /api/packing-lists/[id]/send - Send packing list to factory email
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getApiSession()
  if (!session || !session.companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const body = await request.json()
    const { to, cc = [], subject, body: emailBody, email } = body

    // Support both old format (email) and new format (to)
    const toEmails = to || (email ? [email] : [])
    
    if ((!toEmails || toEmails.length === 0) && !email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Normalize to array
    const toArray = Array.isArray(toEmails) ? toEmails : [toEmails]
    const ccArray = Array.isArray(cc) ? cc : cc ? [cc] : []

    // Check ownership - wrap in try/catch in case table doesn't exist
    let packingList
    try {
      packingList = await prisma.packingList.findFirst({
        where: { id, companyId: session.companyId }
      })
    } catch (dbError: any) {
      if (dbError?.code === 'P2021') {
        return NextResponse.json({ 
          error: 'Packing lists feature not available. Database migration required.' 
        }, { status: 503 })
      }
      throw dbError
    }

    if (!packingList) {
      return NextResponse.json({ error: 'Packing list not found' }, { status: 404 })
    }

    // Send email via Resend
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pl = packingList as any
    await sendFactoryPackingListEmail({
      to: toArray.join(', '),
      factoryName: pl.factoryName || 'Factory',
      packingListNumber: pl.plNumber || pl.id,
      orderReference: pl.orderReference || undefined,
      totalItems: pl.totalItems || 0,
      productionDate: pl.productionDate ? new Date(pl.productionDate).toLocaleDateString() : undefined
    })
    
    const updated = await prisma.packingList.update({
      where: { id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        sentTo: toArray.join(', ')
      }
    })

    return NextResponse.json({ 
      success: true,
      packingList: updated 
    })
  } catch (error: any) {
    console.error('Failed to send packing list:', error)
    if (error?.code === 'P2021') {
      return NextResponse.json({ 
        error: 'Packing lists feature not available. Database migration required.' 
      }, { status: 503 })
    }
    return NextResponse.json({ error: 'Failed to send packing list' }, { status: 500 })
  }
}
