import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { getPlanFromPriceId } from '@/lib/plans'
import { clerkClient } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { prisma } from '@/lib/prisma'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rateLimit'
import { sendCompanyEmail } from '@/lib/resend'
import { CancellationEmail } from '@/lib/emails/CancellationEmail'

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') ?? 'stripe'
  const rateLimited = applyRateLimit(`webhook:stripe:${ip}`, RATE_LIMITS.webhooks)
  if (rateLimited) return rateLimited

  const body = await req.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error('Missing STRIPE_WEBHOOK_SECRET')
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    )
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const clerkUserId = session.metadata?.clerkUserId
  const subscriptionId = session.subscription as string
  const customerId = session.customer as string

  if (!clerkUserId) {
    console.error('No clerkUserId in session metadata')
    return
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const priceId = subscription.items.data[0]?.price.id

  if (!priceId) {
    console.error('No price ID found in subscription')
    return
  }

  const planInfo = getPlanFromPriceId(priceId)

  if (!planInfo) {
    console.error('Unknown price ID:', priceId)
    return
  }

  const client = await clerkClient()
  const user = await client.users.getUser(clerkUserId)

  await client.users.updateUserMetadata(clerkUserId, {
    publicMetadata: {
      ...user.publicMetadata,
      plan: planInfo.name,
      billingPeriod: planInfo.period,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscriptionId,
      subscriptionStatus: 'active',
    },
  })

  await supabaseAdmin
    .from('users')
    .update({
      plan: planInfo.name,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      updated_at: new Date().toISOString(),
    })
    .eq('id', clerkUserId)

  // Update company subscription status in DB
  const companyId = user.publicMetadata?.companyId as string | undefined
  if (companyId) {
    await prisma.company.update({
      where: { id: companyId },
      data: { subscriptionStatus: 'active' },
    })
  }

  console.log(`User ${clerkUserId} upgraded to ${planInfo.name} (${planInfo.period})`)
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const clerkUserId = subscription.metadata?.clerkUserId

  if (!clerkUserId) {
    const customerId = subscription.customer as string
    const customer = await stripe.customers.retrieve(customerId)
    
    if (customer.deleted) {
      console.error('Customer has been deleted')
      return
    }

    const userId = customer.metadata?.clerkUserId
    if (!userId) {
      console.error('No clerkUserId found in customer metadata')
      return
    }

    await updateUserPlan(userId, subscription)
    return
  }

  await updateUserPlan(clerkUserId, subscription)
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  let clerkUserId = subscription.metadata?.clerkUserId

  if (!clerkUserId) {
    const customerId = subscription.customer as string
    const customer = await stripe.customers.retrieve(customerId)
    
    if (!customer.deleted) {
      clerkUserId = customer.metadata?.clerkUserId
    }
  }

  if (!clerkUserId) {
    console.error('No clerkUserId found for deleted subscription')
    return
  }

  const client = await clerkClient()
  const user = await client.users.getUser(clerkUserId)

  const periodEnd = (subscription as unknown as { current_period_end?: number }).current_period_end
  const accessUntilDate = periodEnd
    ? new Date(periodEnd * 1000)
    : new Date()

  await client.users.updateUserMetadata(clerkUserId, {
    publicMetadata: {
      ...user.publicMetadata,
      plan: 'starter',
      billingPeriod: null,
      stripeSubscriptionId: null,
      subscriptionStatus: 'canceled',
      accessUntil: accessUntilDate.toISOString(),
    },
  })

  await supabaseAdmin
    .from('users')
    .update({
      plan: 'starter',
      stripe_subscription_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', clerkUserId)

  // Update company in DB
  const companyId = user.publicMetadata?.companyId as string | undefined
  if (companyId) {
    const company = await prisma.company.update({
      where: { id: companyId },
      data: {
        subscriptionStatus: 'canceled',
        accessUntil: accessUntilDate,
      },
    })

    // Send cancellation email
    const ownerEmail = user.emailAddresses?.[0]?.emailAddress
    if (ownerEmail && company.slug) {
      await sendCompanyEmail(
        companyId,
        ownerEmail,
        'Your ExportFlow subscription has been canceled',
        CancellationEmail({
          companyName: company.name,
          accessUntilDate: accessUntilDate.toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric',
          }),
          pricingUrl: `https://${company.slug}.exportflow.io/pricing`,
        })
      )
    }
  }

  console.log(`User ${clerkUserId} subscription cancelled, reset to starter`)
}

async function updateUserPlan(clerkUserId: string, subscription: Stripe.Subscription) {
  const priceId = subscription.items.data[0]?.price.id

  if (!priceId) {
    console.error('No price ID in subscription')
    return
  }

  const planInfo = getPlanFromPriceId(priceId)

  if (!planInfo) {
    console.error('Unknown price ID:', priceId)
    return
  }

  const client = await clerkClient()
  const user = await client.users.getUser(clerkUserId)

  await client.users.updateUserMetadata(clerkUserId, {
    publicMetadata: {
      ...user.publicMetadata,
      plan: planInfo.name,
      billingPeriod: planInfo.period,
    },
  })

  await supabaseAdmin
    .from('users')
    .update({
      plan: planInfo.name,
      updated_at: new Date().toISOString(),
    })
    .eq('id', clerkUserId)

  console.log(`User ${clerkUserId} plan updated to ${planInfo.name}`)
}
