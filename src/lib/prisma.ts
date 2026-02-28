import { PrismaClient } from '@prisma/client'

const SOFT_DELETE_MODELS = new Set([
  'Product', 'Category', 'Customer', 'CustomerCategory',
  'Invoice', 'Order', 'Shipment', 'PackingList', 'DocumentTemplate',
])

const TENANT_SCOPED_MODELS = new Set([
  'Product', 'Category', 'Customer', 'CustomerCategory',
  'Invoice', 'Order', 'Shipment', 'PackingList', 'DocumentTemplate',
  'PriceTier', 'PricingRule', 'User', 'CompanyBranding',
])

function createPrismaClient() {
  const client = new PrismaClient({
    log: ['error'],
  })

  // Middleware: block queries with undefined companyId on tenant-scoped models
  client.$use(async (params, next) => {
    if (!params.model || !TENANT_SCOPED_MODELS.has(params.model)) {
      return next(params)
    }

    const readActions = ['findMany', 'findFirst', 'count', 'groupBy', 'aggregate']
    if (readActions.includes(params.action) && params.args?.where) {
      const where = params.args.where
      if ('companyId' in where && where.companyId === undefined) {
        console.error(
          `[SECURITY] Blocked ${params.action} on ${params.model}: companyId is undefined`
        )
        if (params.action === 'count') return 0
        if (params.action === 'findFirst') return null
        if (params.action === 'groupBy' || params.action === 'aggregate') return []
        return []
      }
    }

    return next(params)
  })

  // Middleware: auto-filter soft-deleted records on read operations
  client.$use(async (params, next) => {
    if (!params.model || !SOFT_DELETE_MODELS.has(params.model)) {
      return next(params)
    }

    // findMany / findFirst / count: inject deletedAt: null
    if (['findMany', 'findFirst', 'count'].includes(params.action)) {
      if (!params.args) params.args = {}
      if (!params.args.where) params.args.where = {}

      // Allow explicit deletedAt queries (e.g. trash listing)
      if (params.args.where.deletedAt === undefined) {
        params.args.where.deletedAt = null
      }
    }

    // findUnique: convert to findFirst to support deletedAt filter
    if (params.action === 'findUnique') {
      if (!params.args) params.args = {}
      if (!params.args.where) params.args.where = {}

      if (params.args.where.deletedAt === undefined) {
        params.action = 'findFirst'
        params.args.where.deletedAt = null
      }
    }

    return next(params)
  })

  return client
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma