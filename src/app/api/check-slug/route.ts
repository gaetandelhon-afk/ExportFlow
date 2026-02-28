import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isReservedSubdomain } from '@/lib/tenantFromSubdomain'

const SLUG_REGEX = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const slug = searchParams.get('slug')?.toLowerCase().trim()

  if (!slug) {
    return NextResponse.json(
      { available: false, reason: 'Slug is required' },
      { status: 400 }
    )
  }

  if (slug.length < 3 || slug.length > 30) {
    return NextResponse.json({
      available: false,
      reason: 'Must be between 3 and 30 characters',
    })
  }

  if (!SLUG_REGEX.test(slug)) {
    return NextResponse.json({
      available: false,
      reason: 'Only lowercase letters, numbers, and hyphens allowed',
    })
  }

  if (isReservedSubdomain(slug)) {
    return NextResponse.json({
      available: false,
      reason: 'This URL is reserved',
    })
  }

  const existing = await prisma.company.findUnique({
    where: { slug },
    select: { id: true },
  })

  if (existing) {
    return NextResponse.json({
      available: false,
      reason: 'This URL is already taken',
    })
  }

  return NextResponse.json({ available: true })
}
