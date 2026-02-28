import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/resend'
import { TrialExpiredEmail } from '@/lib/emails/TrialExpiredEmail'

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const threeYearsFromNow = new Date()
  threeYearsFromNow.setFullYear(threeYearsFromNow.getFullYear() + 3)

  try {
    // Expire trials that have passed their end date
    const expiredTrials = await prisma.company.findMany({
      where: {
        subscriptionStatus: 'trialing',
        trialEndsAt: { lt: new Date() },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        users: {
          where: { role: 'ADMIN' },
          select: { email: true },
          take: 1,
        },
      },
    })

    for (const company of expiredTrials) {
      await prisma.company.update({
        where: { id: company.id },
        data: { subscriptionStatus: 'expired' },
      })

      if (company.users[0]) {
        await sendEmail({
          to: company.users[0].email,
          subject: 'Your ExportFlow trial has ended',
          react: TrialExpiredEmail({
            companyName: company.name,
            pricingUrl: `https://${company.slug}.exportflow.io/pricing`,
          }),
        })
      }
    }

    // Deactivate canceled subscriptions past their access date
    const expiredCanceled = await prisma.company.findMany({
      where: {
        subscriptionStatus: 'canceled',
        accessUntil: { lt: new Date() },
        isActive: true,
      },
      select: { id: true },
    })

    for (const company of expiredCanceled) {
      await prisma.company.update({
        where: { id: company.id },
        data: {
          isActive: false,
          deletionScheduledAt: threeYearsFromNow,
        },
      })
    }

    return NextResponse.json({
      success: true,
      expiredTrials: expiredTrials.length,
      deactivatedCanceled: expiredCanceled.length,
    })
  } catch (error) {
    console.error('[Cron] expire-access error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
