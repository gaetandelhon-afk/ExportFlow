import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rateLimit'

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') ?? 'unknown'
    const rateLimited = applyRateLimit(`auth:${ip}`, RATE_LIMITS.auth)
    if (rateLimited) return rateLimited

    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' }, 
        { status: 400 }
      )
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (!user) {
      // Don't reveal if email exists or not (security)
      return NextResponse.json({ message: 'If this email exists, a code has been sent' })
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    
    // Code expires in 10 minutes
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    // Save code to database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        otpCode: code,
        otpExpiresAt: expiresAt,
      },
    })

    // For development: show code in terminal
    // In production, this will send an email
    console.log('')
    console.log('╔════════════════════════════════════════╗')
    console.log('║                                        ║')
    console.log(`║   LOGIN CODE: ${code}                   ║`)
    console.log(`║   Email: ${email.padEnd(28)}║`)
    console.log('║                                        ║')
    console.log('╚════════════════════════════════════════╝')
    console.log('')

    return NextResponse.json({ message: 'Code sent' })

  } catch (error) {
    console.error('Send code error:', error)
    return NextResponse.json(
      { error: 'Failed to send code' }, 
      { status: 500 }
    )
  }
}