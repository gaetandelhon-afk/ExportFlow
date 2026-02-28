import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth, isErrorResponse } from '@/lib/tenantGuard'
import { getTrashItems, restoreAll, emptyTrash, TrashableModel, MODEL_CONFIG } from '@/lib/trash'
import { validateBody, isValidationError, trashRestoreAllSchema, trashEntityTypeSchema } from '@/lib/validation'
import { applyRateLimit, RATE_LIMITS } from '@/lib/rateLimit'

const VALID_MODELS = new Set(Object.keys(MODEL_CONFIG))

export async function GET(request: NextRequest) {
  try {
    const session = await requireTenantAuth()
    if (isErrorResponse(session)) return session

    const rateLimited = applyRateLimit(`trash-list:${session.userId}`, RATE_LIMITS.api)
    if (rateLimited) return rateLimited

    const { searchParams } = new URL(request.url)
    const rawType = searchParams.get('type')

    let entityType: TrashableModel | undefined
    if (rawType) {
      const parsed = trashEntityTypeSchema.safeParse(rawType)
      if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 })
      }
      entityType = parsed.data
    }

    const page = Math.max(1, parseInt(searchParams.get('page') || '1') || 1)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50') || 50))
    const sortBy = (['deletedAt', 'name', 'type'].includes(searchParams.get('sortBy') || '')
      ? searchParams.get('sortBy') as 'deletedAt' | 'name' | 'type'
      : 'deletedAt')
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc'
    const search = searchParams.get('search')?.slice(0, 200) || undefined

    const result = await getTrashItems(session.companyId, {
      entityType,
      search,
      sortBy,
      sortOrder,
      page,
      limit,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('List trash error:', error)
    return NextResponse.json({ error: 'Failed to list trash' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireTenantAuth()
    if (isErrorResponse(session)) return session

    if (session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const rateLimited = applyRateLimit(`trash-restore:${session.userId}`, RATE_LIMITS.api)
    if (rateLimited) return rateLimited

    const validated = await validateBody(request, trashRestoreAllSchema)
    if (isValidationError(validated)) return validated

    if (validated.entityType && !VALID_MODELS.has(validated.entityType)) {
      return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 })
    }

    const result = await restoreAll(
      session.companyId,
      session.userId,
      validated.entityType as TrashableModel | undefined
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Restore all error:', error)
    return NextResponse.json({ error: 'Failed to restore items' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireTenantAuth()
    if (isErrorResponse(session)) return session

    if (session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const rateLimited = applyRateLimit(`trash-empty:${session.userId}`, { maxRequests: 5, windowMs: 60_000 })
    if (rateLimited) return rateLimited

    const { searchParams } = new URL(request.url)
    const rawType = searchParams.get('type')

    let entityType: TrashableModel | undefined
    if (rawType) {
      const parsed = trashEntityTypeSchema.safeParse(rawType)
      if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 })
      }
      entityType = parsed.data
    }

    const result = await emptyTrash(
      session.companyId,
      session.userId,
      entityType
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Empty trash error:', error)
    return NextResponse.json({ error: 'Failed to empty trash' }, { status: 500 })
  }
}
