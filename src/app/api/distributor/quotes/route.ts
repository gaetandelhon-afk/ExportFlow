import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getApiSession } from '@/lib/auth'
import { clerkClient } from '@clerk/nextjs/server'

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

    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    
    let effectiveCustomerId: string | null = null
    
    if (customerId && (role === 'ADMIN' || role === 'COMMERCIAL')) {
      effectiveCustomerId = customerId
    } else if (customerIdFromMeta) {
      effectiveCustomerId = customerIdFromMeta
    }
    
    if (!effectiveCustomerId) {
      return NextResponse.json({ quotes: [] })
    }

    // Quotes are stored in the Invoice table with type='QUOTE'
    const quotes = await prisma.invoice.findMany({
      where: {
        type: 'QUOTE',
        order: {
          companyId: session.companyId,
          customerId: effectiveCustomerId,
        },
      },
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        subtotal: true,
        totalAmount: true,
        currency: true,
        validUntil: true,
        createdAt: true,
        order: {
          select: {
            id: true,
            orderNumber: true,
            notesEn: true,
            lines: {
              select: {
                id: true,
                productId: true,
                quantity: true,
                unitPrice: true,
                productRef: true,
                productNameEn: true,
                product: {
                  select: {
                    id: true,
                    ref: true,
                    nameEn: true,
                    photoUrl: true,
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const formattedQuotes = quotes.map(quote => ({
      id: quote.id,
      number: quote.invoiceNumber,
      status: quote.status.toLowerCase(),
      subtotalDisplay: Number(quote.subtotal) || 0,
      subtotalInvoice: Number(quote.subtotal) || 0,
      displayCurrency: quote.currency || 'EUR',
      invoiceCurrency: quote.currency || 'EUR',
      shippingMethod: 'Sea Freight',
      shippingAddressId: null,
      billingAddressId: null,
      instructions: quote.order?.notesEn,
      createdAt: quote.createdAt.toISOString(),
      expiresAt: quote.validUntil?.toISOString() || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      items: quote.order?.lines.map(line => ({
        product: {
          id: line.productId || line.id,
          ref: line.product?.ref || line.productRef || '',
          nameEn: line.product?.nameEn || line.productNameEn || 'Unknown Product',
          imageUrl: line.product?.photoUrl,
          prices: { EUR: Number(line.unitPrice), USD: Number(line.unitPrice) * 1.1, RMB: Number(line.unitPrice) * 7.8 },
          category: '',
          stock: 100,
          moq: 1,
        },
        quantity: line.quantity,
      })) || [],
    }))

    return NextResponse.json({ quotes: formattedQuotes })
  } catch (error) {
    console.error('Error fetching quotes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
