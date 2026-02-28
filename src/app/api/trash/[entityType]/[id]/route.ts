import { NextRequest, NextResponse } from 'next/server'
import { restore, permanentDelete, TrashableModel, MODEL_CONFIG } from '@/lib/trash'
import { requireTenantAuth, isErrorResponse } from '@/lib/tenantGuard'
import { trashEntityTypeSchema, idSchema } from '@/lib/validation'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rateLimit'

type RouteParams = { params: Promise<{ entityType: string; id: string }> }

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireTenantAuth()
    if (isErrorResponse(session)) return session

    const rateLimited = applyRateLimit(`trash-restore:${session.userId}`, RATE_LIMITS.api)
    if (rateLimited) return rateLimited

    const { entityType, id } = await params

    const parsedType = trashEntityTypeSchema.safeParse(entityType)
    if (!parsedType.success) {
      return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 })
    }

    const parsedId = idSchema.safeParse(id)
    if (!parsedId.success) {
      return NextResponse.json({ error: 'Invalid id format' }, { status: 400 })
    }

    const restored = await restore(parsedType.data as TrashableModel, parsedId.data, session.userId, session.companyId)
    if (!restored) {
      return NextResponse.json({ error: 'Item not found in trash' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Restore error:', error)
    return NextResponse.json({ error: 'Failed to restore item' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireTenantAuth()
    if (isErrorResponse(session)) return session

    if (session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const rateLimited = applyRateLimit(`trash-perm-delete:${session.userId}`, { maxRequests: 30, windowMs: 60_000 })
    if (rateLimited) return rateLimited

    const { entityType, id } = await params

    const parsedType = trashEntityTypeSchema.safeParse(entityType)
    if (!parsedType.success) {
      return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 })
    }

    const parsedId = idSchema.safeParse(id)
    if (!parsedId.success) {
      return NextResponse.json({ error: 'Invalid id format' }, { status: 400 })
    }

    const deleted = await permanentDelete(parsedType.data as TrashableModel, parsedId.data, session.userId, session.companyId)
    if (!deleted) {
      return NextResponse.json({ error: 'Item not found in trash' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Permanent delete error:', error)
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 })
  }
}
