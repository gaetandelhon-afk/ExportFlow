import { NextRequest, NextResponse } from 'next/server'
import { getApiSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createAuditLog, computeChanges } from '@/lib/auditLog'

async function getSessionWithRole(): Promise<{ userId: string; companyId: string; role: string } | null> {
  const session = await getApiSession()
  if (!session?.companyId) return null
  // role is already normalized (owner→ADMIN, member→COMMERCIAL) by getApiSession()
  return {
    userId: session.userId,
    companyId: session.companyId,
    role: session.role ?? 'ADMIN',
  }
}

// Default branding values
const DEFAULT_BRANDING = {
  primaryColor: '#0071e3',
  secondaryColor: '#34c759',
  accentColor: '#ff9500',
  logoUrl: null,
  logoWidth: 150,
  faviconUrl: null,
  loginBannerUrl: null,
  companyLegalName: null,
  tagline: null,
  invoiceHeader: null,
  invoiceFooter: null,
  emailSignature: null,
  customCss: null
}

// GET - Get company branding
export async function GET() {
  try {
    const session = await getApiSession()
    if (!session?.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get company name first
    let companyName = ''
    let companyLogo: string | null = null
    try {
      const company = await prisma.company.findUnique({
        where: { id: session.companyId },
        select: { name: true, logo: true }
      })
      companyName = company?.name || ''
      companyLogo = company?.logo || null
    } catch {
      // Company table might not exist or other error
    }

    // Try to get branding - table might not exist yet
    let branding = null
    try {
      branding = await prisma.companyBranding.findUnique({
        where: { companyId: session.companyId }
      })
    } catch {
      // CompanyBranding table doesn't exist yet - return defaults
      console.log('CompanyBranding table not found, using defaults')
    }

    if (!branding) {
      return NextResponse.json({
        branding: {
          ...DEFAULT_BRANDING,
          companyName,
          logoUrl: companyLogo
        }
      })
    }

    return NextResponse.json({
      branding: {
        ...branding,
        companyName
      }
    })

  } catch (error) {
    console.error('Get branding error:', error)
    // Return defaults on any error
    return NextResponse.json({
      branding: {
        ...DEFAULT_BRANDING,
        companyName: ''
      }
    })
  }
}

// PUT - Update company branding
export async function PUT(request: NextRequest) {
  try {
    const session = await getSessionWithRole()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admin can update branding
    if (session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()

    // Validate colors (hex format)
    const colorRegex = /^#[0-9A-Fa-f]{6}$/
    if (body.primaryColor && !colorRegex.test(body.primaryColor)) {
      return NextResponse.json({ error: 'Invalid primary color format' }, { status: 400 })
    }
    if (body.secondaryColor && !colorRegex.test(body.secondaryColor)) {
      return NextResponse.json({ error: 'Invalid secondary color format' }, { status: 400 })
    }
    if (body.accentColor && !colorRegex.test(body.accentColor)) {
      return NextResponse.json({ error: 'Invalid accent color format' }, { status: 400 })
    }

    // Build update data
    const updateData: Record<string, unknown> = {}
    
    if (body.primaryColor !== undefined) updateData.primaryColor = body.primaryColor
    if (body.secondaryColor !== undefined) updateData.secondaryColor = body.secondaryColor
    if (body.accentColor !== undefined) updateData.accentColor = body.accentColor
    if (body.logoUrl !== undefined) updateData.logoUrl = body.logoUrl
    if (body.logoWidth !== undefined) updateData.logoWidth = body.logoWidth
    if (body.faviconUrl !== undefined) updateData.faviconUrl = body.faviconUrl
    if (body.loginBannerUrl !== undefined) updateData.loginBannerUrl = body.loginBannerUrl
    if (body.companyLegalName !== undefined) updateData.companyLegalName = body.companyLegalName
    if (body.tagline !== undefined) updateData.tagline = body.tagline
    if (body.invoiceHeader !== undefined) updateData.invoiceHeader = body.invoiceHeader
    if (body.invoiceFooter !== undefined) updateData.invoiceFooter = body.invoiceFooter
    if (body.emailSignature !== undefined) updateData.emailSignature = body.emailSignature
    if (body.customCss !== undefined) updateData.customCss = body.customCss

    // Fetch existing branding for change tracking
    const existing = await prisma.companyBranding.findUnique({
      where: { companyId: session.companyId }
    })

    // Upsert branding
    const companyId = session.companyId
    const branding = await prisma.companyBranding.upsert({
      where: { companyId },
      update: updateData,
      create: {
        ...DEFAULT_BRANDING,
        ...updateData,
        companyId
      }
    })

    // Also update company logo if provided
    if (body.logoUrl !== undefined) {
      await prisma.company.update({
        where: { id: session.companyId },
        data: { logo: body.logoUrl }
      })
    }

    const oldData = existing
      ? {
          primaryColor: existing.primaryColor,
          logoUrl: existing.logoUrl,
          companyLegalName: existing.companyLegalName,
        }
      : {}
    const newData = {
      primaryColor: branding.primaryColor,
      logoUrl: branding.logoUrl,
      companyLegalName: branding.companyLegalName,
    }
    const changes = computeChanges(
      oldData as Record<string, unknown>,
      newData as Record<string, unknown>,
      ['primaryColor', 'logoUrl', 'companyLegalName']
    )
    await createAuditLog({
      companyId: session.companyId,
      userId: session.userId,
      action: 'UPDATE',
      entityType: 'Branding',
      entityId: branding.id,
      changes: changes ?? undefined,
      metadata: { companyId },
      request,
    })

    return NextResponse.json({ branding })

  } catch (error) {
    console.error('Update branding error:', error)
    return NextResponse.json(
      { error: 'Failed to update branding' },
      { status: 500 }
    )
  }
}
