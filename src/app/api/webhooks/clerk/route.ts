import { NextResponse } from 'next/server'
import { Webhook } from 'svix'
import { prisma } from '@/lib/prisma'
import { clerkClient } from '@clerk/nextjs/server'

interface WebhookEvent {
  type: string
  data: {
    id: string
    email_addresses?: Array<{ email_address: string }>
    public_metadata?: Record<string, unknown>
    [key: string]: unknown
  }
}

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    console.error('Missing CLERK_WEBHOOK_SECRET')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const svixId = req.headers.get('svix-id')
  const svixTimestamp = req.headers.get('svix-timestamp')
  const svixSignature = req.headers.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: 'Missing svix headers' }, { status: 400 })
  }

  const body = await req.text()

  let event: WebhookEvent

  try {
    const wh = new Webhook(WEBHOOK_SECRET)
    event = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Clerk webhook verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    if (event.type === 'user.created') {
      await handleUserCreated(event.data)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[Clerk Webhook] Error handling event:', error)
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 })
  }
}

async function handleUserCreated(data: WebhookEvent['data']) {
  const userId = data.id
  const email = data.email_addresses?.[0]?.email_address
  const existingMeta = data.public_metadata || {}

  if (!email) return

  // If metadata already has companyId (set via invitation), skip
  if (existingMeta.companyId) return

  // Check if this email matches a CustomerEmail entry (distributor)
  const customerEmail = await prisma.customerEmail.findUnique({
    where: { email },
    include: {
      customer: {
        select: {
          id: true,
          companyId: true,
          companyName: true,
          company: { select: { slug: true } },
        },
      },
    },
  })

  if (customerEmail) {
    const client = await clerkClient()
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        ...existingMeta,
        companyId: customerEmail.customer.companyId,
        companySlug: customerEmail.customer.company.slug,
        customerId: customerEmail.customer.id,
        role: 'distributor',
        onboardingComplete: true,
      },
    })
    console.log(`[Clerk Webhook] Auto-provisioned distributor: ${email} → company ${customerEmail.customer.companyId}`)
    return
  }

  // If not a customer email, the invitation flow will handle metadata
  console.log(`[Clerk Webhook] New user ${email} - no auto-provisioning matched`)
}
