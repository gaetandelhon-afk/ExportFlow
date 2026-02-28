import { NextRequest, NextResponse } from 'next/server'
import { getApiSession } from '@/lib/auth'
import { exportData } from '@/lib/dataExport'
import { ExportFormat, ExportType, AnalyticsFilters } from '@/types/analytics'

export async function POST(request: NextRequest) {
  try {
    const session = await getApiSession()
    if (!session || !session.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, format, filters, columns } = body as {
      type: ExportType
      format: ExportFormat
      filters?: AnalyticsFilters
      columns?: string[]
    }

    const validTypes: ExportType[] = ['orders', 'orderLines', 'customers', 'products', 'payments', 'invoices', 'analytics']
    const validFormats: ExportFormat[] = ['csv', 'xlsx', 'json']

    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid export type' }, { status: 400 })
    }

    if (!validFormats.includes(format)) {
      return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
    }

    const result = await exportData(session.companyId, {
      type,
      format,
      filters: filters || { period: 'last30days' },
      columns
    })

    const headers = new Headers()
    headers.set('Content-Type', result.mimeType)
    headers.set('Content-Disposition', `attachment; filename="${result.filename}"`)

    return new Response(result.data as unknown as BodyInit, { headers })
  } catch (error) {
    console.error('[Export Error]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Export failed' },
      { status: 500 }
    )
  }
}
