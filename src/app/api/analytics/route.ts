import { NextRequest, NextResponse } from 'next/server'
import { getApiSession } from '@/lib/auth'
import { getDashboardKPIs, getTimeSeries, getByDimension } from '@/lib/analytics'
import { AnalyticsFilters, AnalyticsResult, TimePeriod } from '@/types/analytics'

export async function GET(request: NextRequest) {
  console.log('[Analytics] GET request received')
  try {
    const session = await getApiSession()
    if (!session) {
      console.log('[Analytics] No session, returning 401')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!session.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.log('[Analytics] Session valid, fetching data...')

    const { searchParams } = new URL(request.url)

    const filters: AnalyticsFilters = {
      period: (searchParams.get('period') || 'last30days') as TimePeriod,
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      customerId: searchParams.get('customerId') || undefined,
      country: searchParams.get('country') || undefined,
      status: searchParams.getAll('status').length > 0 ? searchParams.getAll('status') : undefined
    }

    const [
      kpis,
      ordersTimeSeries,
      revenueTimeSeries,
      customersTimeSeries,
      byCountry,
      byCustomer,
      byProduct,
      byCategory,
      byStatus,
      byPriceTier
    ] = await Promise.all([
      getDashboardKPIs(session.companyId, filters),
      getTimeSeries(session.companyId, filters, 'orders'),
      getTimeSeries(session.companyId, filters, 'revenue'),
      getTimeSeries(session.companyId, filters, 'customers'),
      getByDimension(session.companyId, filters, 'country'),
      getByDimension(session.companyId, filters, 'customer'),
      getByDimension(session.companyId, filters, 'product'),
      getByDimension(session.companyId, filters, 'category'),
      getByDimension(session.companyId, filters, 'status'),
      getByDimension(session.companyId, filters, 'priceTier')
    ])

    const result: AnalyticsResult = {
      kpis,
      timeSeries: {
        orders: ordersTimeSeries,
        revenue: revenueTimeSeries,
        customers: customersTimeSeries
      },
      byDimension: {
        byCountry,
        byCustomer,
        byProduct,
        byCategory,
        byStatus,
        byPriceTier
      },
      period: {
        start: filters.startDate || '',
        end: filters.endDate || '',
        granularity: 'day'
      }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[Analytics Error]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
