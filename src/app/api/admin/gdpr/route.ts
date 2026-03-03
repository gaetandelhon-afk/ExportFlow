import { NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

async function requireSuperadmin() {
  const { userId } = await auth()
  if (!userId) return null

  const client = await clerkClient()
  const user = await client.users.getUser(userId)
  const role = user.publicMetadata?.role as string | undefined

  if (role !== 'superadmin') return null
  return { userId }
}

export async function GET() {
  const admin = await requireSuperadmin()
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const companies = await prisma.company.findMany({
    where: {
      deletionScheduledAt: { not: null },
      isActive: false,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      deletionScheduledAt: true,
      subscriptionStatus: true,
      createdAt: true,
      _count: {
        select: {
          users: true,
          orders: true,
          products: true,
          customers: true,
        },
      },
    },
    orderBy: { deletionScheduledAt: 'asc' },
  })

  const now = new Date()
  const enriched = companies.map((c) => ({
    ...c,
    canDelete: c.deletionScheduledAt ? c.deletionScheduledAt <= now : false,
    daysUntilDeletion: c.deletionScheduledAt
      ? Math.ceil((c.deletionScheduledAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null,
  }))

  return NextResponse.json({ companies: enriched })
}

export async function DELETE(req: Request) {
  const admin = await requireSuperadmin()
  if (!admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('companyId')

  if (!companyId) {
    return NextResponse.json({ error: 'companyId required' }, { status: 400 })
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      name: true,
      slug: true,
      isActive: true,
      deletionScheduledAt: true,
    },
  })

  if (!company) {
    return NextResponse.json({ error: 'Company not found' }, { status: 404 })
  }

  if (company.isActive) {
    return NextResponse.json({ error: 'Cannot delete active company' }, { status: 400 })
  }

  if (company.deletionScheduledAt && company.deletionScheduledAt > new Date()) {
    return NextResponse.json(
      { error: 'Deletion date not yet reached' },
      { status: 400 }
    )
  }

  // Cascade delete all company data in correct order
  await prisma.$transaction(async (tx) => {
    // Delete payment records via order payments
    const orderPayments = await tx.orderPayment.findMany({
      where: { order: { companyId } },
      select: { id: true },
    })
    if (orderPayments.length > 0) {
      await tx.paymentRecord.deleteMany({
        where: { orderPaymentId: { in: orderPayments.map((op) => op.id) } },
      })
      await tx.orderPayment.deleteMany({
        where: { id: { in: orderPayments.map((op) => op.id) } },
      })
    }

    // Delete child records
    await tx.orderHistory.deleteMany({ where: { order: { companyId } } })
    await tx.orderCharge.deleteMany({ where: { order: { companyId } } })
    await tx.orderDiscount.deleteMany({ where: { order: { companyId } } })
    await tx.orderLine.deleteMany({ where: { order: { companyId } } })
    await tx.substitutionRequest.deleteMany({ where: { order: { companyId } } })
    await tx.shipmentOrder.deleteMany({ where: { order: { companyId } } })
    await tx.invoice.deleteMany({ where: { order: { companyId } } })
    await tx.order.deleteMany({ where: { companyId } })

    // Delete packing lists
    await tx.packingListLine.deleteMany({ where: { packingList: { companyId } } })
    await tx.packingList.deleteMany({ where: { companyId } })

    // Delete shipments
    await tx.shipment.deleteMany({ where: { companyId } })

    // Delete grouped invoices
    await tx.groupedInvoiceOrder.deleteMany({ where: { groupedInvoice: { companyId } } })
    await tx.groupedInvoice.deleteMany({ where: { companyId } })

    // Delete customer data
    await tx.customerLedgerEntry.deleteMany({ where: { companyId } })
    await tx.shippingAgent.deleteMany({ where: { customer: { companyId } } })
    await tx.customerEmail.deleteMany({ where: { customer: { companyId } } })
    await tx.customer.deleteMany({ where: { companyId } })

    // Delete customer categories
    await tx.customerCategory.deleteMany({ where: { companyId } })

    // Delete product data
    await tx.productPricingRule.deleteMany({ where: { product: { companyId } } })
    await tx.product.deleteMany({ where: { companyId } })
    await tx.category.deleteMany({ where: { companyId } })

    // Delete pricing
    await tx.pricingRuleBreak.deleteMany({ where: { pricingRule: { companyId } } })
    await tx.pricingRule.deleteMany({ where: { companyId } })
    await tx.priceTier.deleteMany({ where: { companyId } })

    // Delete branding, templates, glossary
    await tx.companyBranding.deleteMany({ where: { companyId } })
    await tx.documentTemplate.deleteMany({ where: { companyId } })
    await tx.translationGlossary.deleteMany({ where: { companyId } })

    // Delete users
    await tx.user.deleteMany({ where: { companyId } })

    // Delete audit logs for this company
    await tx.auditLog.deleteMany({ where: { companyId } })

    // Finally delete the company
    await tx.company.delete({ where: { id: companyId } })
  })

  // Log the deletion
  await prisma.auditLog.create({
    data: {
      userId: admin.userId,
      userRole: 'superadmin',
      companyId: company.id,
      action: 'company_permanently_deleted',
      entityType: 'User',
      metadata: {
        companyName: company.name,
        companySlug: company.slug,
        deletedCompanyId: company.id,
      },
    },
  })

  return NextResponse.json({ success: true, deletedCompanyId: companyId })
}
