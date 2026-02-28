import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/resend'
import { TrialEmail, getTrialEmailSubject } from '@/lib/emails/TrialEmail'
import { TrialExpiredEmail } from '@/lib/emails/TrialExpiredEmail'

const TRIAL_EMAIL_DAYS = [0, 1, 3, 8, 12, 14] as const

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const companies = await prisma.company.findMany({
      where: { subscriptionStatus: 'trialing', trialStartedAt: { not: null } },
      select: {
        id: true,
        name: true,
        slug: true,
        trialStartedAt: true,
        trialEndsAt: true,
        trialEmailsSent: true,
        users: {
          where: { role: 'ADMIN' },
          select: { email: true },
          take: 1,
        },
      },
    })

    let sentCount = 0

    for (const company of companies) {
      if (!company.trialStartedAt || !company.users[0]) continue

      const daysSinceStart = Math.floor(
        (Date.now() - company.trialStartedAt.getTime()) / (1000 * 60 * 60 * 24)
      )

      const sentEmails = (company.trialEmailsSent as number[] | null) || []
      const ownerEmail = company.users[0].email

      for (const day of TRIAL_EMAIL_DAYS) {
        if (daysSinceStart !== day) continue
        if (sentEmails.includes(day)) continue

        const daysRemaining = 14 - day
        const pricingUrl = `https://${company.slug}.exportflow.io/pricing`

        if (day === 14) {
          await sendEmail({
            to: ownerEmail,
            subject: 'Your ExportFlow trial has ended',
            react: TrialExpiredEmail({
              companyName: company.name,
              pricingUrl,
            }),
          })
        } else {
          await sendEmail({
            to: ownerEmail,
            subject: getTrialEmailSubject(day),
            react: TrialEmail({
              companyName: company.name,
              dayNumber: day,
              daysRemaining,
              pricingUrl,
            }),
          })
        }

        await prisma.company.update({
          where: { id: company.id },
          data: {
            trialEmailsSent: [...sentEmails, day],
          },
        })

        sentCount++
      }
    }

    return NextResponse.json({ success: true, sentCount })
  } catch (error) {
    console.error('[Cron] trial-emails error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
