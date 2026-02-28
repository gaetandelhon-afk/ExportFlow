import { NextRequest, NextResponse } from 'next/server'
import { cleanupExpiredTrashItems } from '@/lib/trash'
import { applyRateLimit } from '@/lib/rateLimit'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rateLimited = applyRateLimit('cron:cleanup-trash', { maxRequests: 2, windowMs: 300_000 })
  if (rateLimited) return rateLimited

  try {
    const result = await cleanupExpiredTrashItems()

    console.log(
      `[Trash Cleanup] Permanently deleted ${result.totalDeleted} expired items across ${result.details.length} companies`
    )

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[Cron Trash Cleanup Error]', error)
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 })
  }
}
