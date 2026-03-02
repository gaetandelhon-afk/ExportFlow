import { clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { isValidPriceId } from '@/lib/plans'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rateLimit'
import { validateBody, isValidationError, checkoutSchema } from '@/lib/validation'
import { getApiSession } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    const authSession = await getApiSession()
    if (!authSession) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const rateLimited = applyRateLimit(`checkout:${authSession.userId}`, RATE_LIMITS.checkout)
    if (rateLimited) return rateLimited

    const validated = await validateBody(req, checkoutSchema)
    if (isValidationError(validated)) return validated
    const { priceId, skipTrial } = validated

    if (!isValidPriceId(priceId)) {
      return NextResponse.json(
        { error: 'Invalid price ID' },
        { status: 400 }
      )
    }

    const client = await clerkClient()
    const user = await client.users.getUser(authSession.userId)
    const email = user.emailAddresses[0]?.emailAddress

    if (!email) {
      return NextResponse.json(
        { error: 'User email not found' },
        { status: 400 }
      )
    }

    const existingCustomerId = user.publicMetadata?.stripeCustomerId as string | undefined

    let customerId = existingCustomerId

    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: {
          clerkUserId: authSession.userId,
        },
      })
      customerId = customer.id

      await client.users.updateUserMetadata(authSession.userId, {
        publicMetadata: {
          ...user.publicMetadata,
          stripeCustomerId: customerId,
        },
      })
    }

    const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData = {
      metadata: {
        clerkUserId: authSession.userId,
      },
      ...(!skipTrial ? { trial_period_days: 14 } : {}),
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        ...subscriptionData,
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/subscription?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/subscription`,
      metadata: {
        clerkUserId: authSession.userId,
      },
    })

    return NextResponse.json({ url: checkoutSession.url })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
