import { NextRequest, NextResponse } from 'next/server'
import { getApiSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getApiSession()
    if (!session || !session.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only ADMIN can view audit logs
    const role = session.role ?? 'ADMIN'
    if (role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '50'), 100)
    const entityType = searchParams.get('entityType') || undefined
    const action = searchParams.get('action') || undefined
    const userId = searchParams.get('userId') || undefined
    const dateFrom = searchParams.get('dateFrom') || undefined
    const dateTo = searchParams.get('dateTo') || undefined
    const search = searchParams.get('search') || undefined
    const exportCsv = searchParams.get('export') === 'csv'

    const where: Record<string, unknown> = {
      companyId: session.companyId,
    }

    if (entityType) where.entityType = entityType
    if (action) where.action = action
    if (userId) where.userId = userId

    if (dateFrom || dateTo) {
      where.timestamp = {
        ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
        ...(dateTo ? { lte: new Date(dateTo + 'T23:59:59Z') } : {}),
      }
    }

    if (search) {
      where.OR = [
        { entityId: { contains: search, mode: 'insensitive' } },
        { userEmail: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (exportCsv) {
      const logs = await prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: 10000,
      })

      const header = 'timestamp,action,entityType,entityId,userId,userEmail,userRole,ipAddress\n'
      const rows = logs.map(log =>
        [
          log.timestamp.toISOString(),
          log.action,
          log.entityType,
          log.entityId || '',
          log.userId || '',
          log.userEmail || '',
          log.userRole || '',
          log.ipAddress || '',
        ]
          .map(v => `"${String(v).replace(/"/g, '""')}"`)
          .join(',')
      )

      return new NextResponse(header + rows.join('\n'), {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      })
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.auditLog.count({ where }),
    ])

    // Fetch distinct users for filter dropdown
    const distinctUsers = await prisma.auditLog.findMany({
      where: { companyId: session.companyId },
      select: { userId: true, userEmail: true },
      distinct: ['userId'],
      take: 100,
    })

    return NextResponse.json({
      logs,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
      users: distinctUsers.filter(u => u.userId),
    })
  } catch (error) {
    console.error('Get audit logs error:', error)
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 })
  }
}
