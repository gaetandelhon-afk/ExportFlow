import { clerkClient } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { getPlanFromPriceId } from '@/lib/plans'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rateLimit'
import { getApiSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const authSession = await getApiSession()
    if (!authSession) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rateLimited = applyRateLimit(`checkout-verify:${authSession.userId}`, RATE_LIMITS.api)
    if (rateLimited) return rateLimited

    const { sessionId } = await req.json() as { sessionId?: string }
    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
    }

    const stripeSession = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    })

    if (stripeSession.payment_status !== 'paid' && stripeSession.status !== 'complete') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 })
    }

    const sessionClerkUserId = stripeSession.metadata?.clerkUserId
    if (sessionClerkUserId !== authSession.userId) {
      return NextResponse.json({ error: 'Session does not belong to user' }, { status: 403 })
    }

    const subscription = stripeSession.subscription as import('stripe').Stripe.Subscription
    if (!subscription) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 400 })
    }

    const priceId = subscription.items.data[0]?.price.id
    if (!priceId) {
      return NextResponse.json({ error: 'No price found' }, { status: 400 })
    }

    const planInfo = getPlanFromPriceId(priceId)
    if (!planInfo) {
      return NextResponse.json({ error: 'Unknown plan' }, { status: 400 })
    }

    const client = await clerkClient()
    const user = await client.users.getUser(authSession.userId)

    const currentPlan = user.publicMetadata?.plan
    if (currentPlan === planInfo.name) {
      return NextResponse.json({
        plan: planInfo.name,
        billingPeriod: planInfo.period,
        alreadyUpdated: true,
      })
    }

    await client.users.updateUserMetadata(authSession.userId, {
      publicMetadata: {
        ...user.publicMetadata,
        plan: planInfo.name,
        billingPeriod: planInfo.period,
        stripeCustomerId: stripeSession.customer as string,
        stripeSubscriptionId: subscription.id,
      },
    })

    await supabaseAdmin
      .from('users')
      .update({
        plan: planInfo.name,
        stripe_customer_id: stripeSession.customer as string,
        stripe_subscription_id: subscription.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', authSession.userId)

    return NextResponse.json({
      plan: planInfo.name,
      billingPeriod: planInfo.period,
      updated: true,
    })
  } catch (error) {
    console.error('Checkout verify error:', error)
    return NextResponse.json(
      { error: 'Failed to verify checkout' },
      { status: 500 }
    )
  }
}
