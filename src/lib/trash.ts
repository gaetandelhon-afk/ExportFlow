import { prisma } from './prisma'

export type TrashableModel =
  | 'product'
  | 'category'
  | 'customer'
  | 'customerCategory'
  | 'invoice'
  | 'order'
  | 'shipment'
  | 'packingList'
  | 'documentTemplate'

export interface TrashItem {
  id: string
  type: TrashableModel
  name: string
  description?: string
  deletedAt: string
  deletedBy?: { name: string; email: string }
  deleteReason?: string
  daysRemaining: number
  expiresAt: string
}

export interface TrashStats {
  total: number
  products: number
  customers: number
  invoices: number
  orders: number
  categories: number
  shipments: number
  packingLists: number
  documentTemplates: number
  customerCategories: number
  expiringIn7Days: number
}

const MODEL_CONFIG: Record<TrashableModel, {
  nameField: string
  label: string
  statsKey: keyof TrashStats
}> = {
  product:          { nameField: 'nameEn',             label: 'Product',           statsKey: 'products' },
  category:         { nameField: 'nameEn',             label: 'Category',          statsKey: 'categories' },
  customer:         { nameField: 'companyName',        label: 'Customer',          statsKey: 'customers' },
  customerCategory: { nameField: 'nameEn',             label: 'Customer Category', statsKey: 'customerCategories' },
  invoice:          { nameField: 'invoiceNumber',      label: 'Invoice',           statsKey: 'invoices' },
  order:            { nameField: 'orderNumber',        label: 'Order',             statsKey: 'orders' },
  shipment:         { nameField: 'shipmentNumber',     label: 'Shipment',          statsKey: 'shipments' },
  packingList:      { nameField: 'packingListNumber',  label: 'Packing List',      statsKey: 'packingLists' },
  documentTemplate: { nameField: 'name',               label: 'Template',          statsKey: 'documentTemplates' },
}

// --- Core operations ---

export async function softDelete(
  model: TrashableModel,
  id: string,
  userId: string,
  companyId: string,
  reason?: string
): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaModel = (prisma as any)[model]

  const whereClause = hasDirectCompanyId(model)
    ? { id, companyId, deletedAt: null }
    : getIndirectWhere(model, id, companyId)

  const record = await prismaModel.findFirst({ where: whereClause, select: { id: true } })
  if (!record) return false

  await prismaModel.update({
    where: { id: record.id },
    data: {
      deletedAt: new Date(),
      deletedBy: userId,
      deleteReason: reason || null,
    },
  })

  return true
}

export async function restore(
  model: TrashableModel,
  id: string,
  userId: string,
  companyId: string
): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaModel = (prisma as any)[model]

  const whereClause = hasDirectCompanyId(model)
    ? { id, companyId, deletedAt: { not: null } }
    : getIndirectWhereDeleted(model, id, companyId)

  const record = await prismaModel.findFirst({ where: whereClause, select: { id: true } })
  if (!record) return false

  await prismaModel.update({
    where: { id: record.id },
    data: { deletedAt: null, deletedBy: null, deleteReason: null },
  })

  void userId // reserved for audit log
  return true
}

export async function permanentDelete(
  model: TrashableModel,
  id: string,
  userId: string,
  companyId: string
): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prismaModel = (prisma as any)[model]

  const whereClause = hasDirectCompanyId(model)
    ? { id, companyId, deletedAt: { not: null } }
    : getIndirectWhereDeleted(model, id, companyId)

  const record = await prismaModel.findFirst({ where: whereClause, select: { id: true } })
  if (!record) return false

  await prismaModel.delete({ where: { id: record.id } })
  void userId // reserved for audit log
  return true
}

// --- Listing ---

export async function getTrashItems(
  companyId: string,
  options?: {
    entityType?: TrashableModel
    search?: string
    sortBy?: 'deletedAt' | 'name' | 'type'
    sortOrder?: 'asc' | 'desc'
    page?: number
    limit?: number
  }
): Promise<{ items: TrashItem[]; stats: TrashStats }> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { trashRetentionDays: true },
  })
  const retentionDays = company?.trashRetentionDays ?? 30

  const allItems: TrashItem[] = []
  const stats: TrashStats = {
    total: 0, products: 0, customers: 0, invoices: 0, orders: 0,
    categories: 0, shipments: 0, packingLists: 0, documentTemplates: 0,
    customerCategories: 0, expiringIn7Days: 0,
  }

  const modelsToQuery = options?.entityType
    ? [options.entityType]
    : (Object.keys(MODEL_CONFIG) as TrashableModel[])

  for (const model of modelsToQuery) {
    const config = MODEL_CONFIG[model]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prismaModel = (prisma as any)[model]

    try {
      const whereClause = hasDirectCompanyId(model)
        ? { companyId, deletedAt: { not: null } }
        : getCompanyWhereDeleted(model, companyId)

      const records = await prismaModel.findMany({
        where: whereClause,
        select: {
          id: true,
          [config.nameField]: true,
          deletedAt: true,
          deletedBy: true,
          deleteReason: true,
          deletedByUser: { select: { name: true, email: true } },
        },
        orderBy: { deletedAt: 'desc' },
      })

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const record of records as any[]) {
        const deletedAt = new Date(record.deletedAt)
        const expiresAt = new Date(deletedAt.getTime() + retentionDays * 24 * 60 * 60 * 1000)
        const daysRemaining = Math.ceil((expiresAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000))

        stats[config.statsKey]++
        stats.total++
        if (daysRemaining <= 7) stats.expiringIn7Days++

        allItems.push({
          id: record.id,
          type: model,
          name: String(record[config.nameField] || record.id),
          deletedAt: deletedAt.toISOString(),
          deletedBy: record.deletedByUser || undefined,
          deleteReason: record.deleteReason || undefined,
          daysRemaining: Math.max(0, daysRemaining),
          expiresAt: expiresAt.toISOString(),
        })
      }
    } catch {
      // Table might not exist yet
    }
  }

  // Filter by search
  let filtered = allItems
  if (options?.search) {
    const q = options.search.toLowerCase()
    filtered = filtered.filter(item => item.name.toLowerCase().includes(q))
  }

  // Sort
  const sortBy = options?.sortBy || 'deletedAt'
  const sortOrder = options?.sortOrder || 'desc'
  filtered.sort((a, b) => {
    let cmp = 0
    if (sortBy === 'deletedAt') cmp = new Date(a.deletedAt).getTime() - new Date(b.deletedAt).getTime()
    else if (sortBy === 'name') cmp = a.name.localeCompare(b.name)
    else if (sortBy === 'type') cmp = a.type.localeCompare(b.type)
    return sortOrder === 'desc' ? -cmp : cmp
  })

  // Paginate
  const page = options?.page || 1
  const limit = options?.limit || 50
  const start = (page - 1) * limit
  const items = filtered.slice(start, start + limit)

  return { items, stats }
}

// --- Bulk operations ---

export async function restoreAll(
  companyId: string,
  userId: string,
  entityType?: TrashableModel
): Promise<{ restoredCount: number }> {
  let restoredCount = 0
  const models = entityType ? [entityType] : (Object.keys(MODEL_CONFIG) as TrashableModel[])

  for (const model of models) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prismaModel = (prisma as any)[model]
    try {
      const whereClause = hasDirectCompanyId(model)
        ? { companyId, deletedAt: { not: null } }
        : getCompanyWhereDeleted(model, companyId)

      const result = await prismaModel.updateMany({
        where: whereClause,
        data: { deletedAt: null, deletedBy: null, deleteReason: null },
      })
      restoredCount += result.count
    } catch {
      // Table might not exist yet
    }
  }

  void userId // reserved for audit log
  return { restoredCount }
}

export async function emptyTrash(
  companyId: string,
  userId: string,
  entityType?: TrashableModel
): Promise<{ deletedCount: number }> {
  let deletedCount = 0
  const models = entityType ? [entityType] : (Object.keys(MODEL_CONFIG) as TrashableModel[])

  for (const model of models) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prismaModel = (prisma as any)[model]
    try {
      const whereClause = hasDirectCompanyId(model)
        ? { companyId, deletedAt: { not: null } }
        : getCompanyWhereDeleted(model, companyId)

      const result = await prismaModel.deleteMany({ where: whereClause })
      deletedCount += result.count
    } catch {
      // Table might not exist yet
    }
  }

  void userId // reserved for audit log
  return { deletedCount }
}

// --- Cron cleanup ---

export async function cleanupExpiredTrashItems(): Promise<{
  totalDeleted: number
  companiesProcessed: number
  details: { companyId: string; companyName: string; deleted: number }[]
}> {
  const companies = await prisma.company.findMany({
    select: { id: true, name: true, trashRetentionDays: true },
  })

  let totalDeleted = 0
  const details: { companyId: string; companyName: string; deleted: number }[] = []

  for (const company of companies) {
    const retentionDays = company.trashRetentionDays ?? 30
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)
    let companyDeleted = 0

    for (const modelKey of Object.keys(MODEL_CONFIG)) {
      const model = modelKey as TrashableModel
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prismaModel = (prisma as any)[model]

      try {
        const whereClause = hasDirectCompanyId(model)
          ? { companyId: company.id, deletedAt: { not: null, lt: cutoffDate } }
          : getCompanyWhereExpired(model, company.id, cutoffDate)

        const result = await prismaModel.deleteMany({ where: whereClause })
        companyDeleted += result.count
      } catch {
        // Table might not exist yet
      }
    }

    totalDeleted += companyDeleted
    if (companyDeleted > 0) {
      details.push({ companyId: company.id, companyName: company.name, deleted: companyDeleted })
    }
  }

  return { totalDeleted, companiesProcessed: companies.length, details }
}

// --- Helpers ---

function hasDirectCompanyId(model: TrashableModel): boolean {
  return model !== 'invoice'
}

function getIndirectWhere(model: TrashableModel, id: string, companyId: string) {
  if (model === 'invoice') {
    return { id, deletedAt: null, order: { companyId } }
  }
  return { id, companyId, deletedAt: null }
}

function getIndirectWhereDeleted(model: TrashableModel, id: string, companyId: string) {
  if (model === 'invoice') {
    return { id, deletedAt: { not: null }, order: { companyId } }
  }
  return { id, companyId, deletedAt: { not: null } }
}

function getCompanyWhereDeleted(model: TrashableModel, companyId: string) {
  if (model === 'invoice') {
    return { deletedAt: { not: null }, order: { companyId } }
  }
  return { companyId, deletedAt: { not: null } }
}

function getCompanyWhereExpired(model: TrashableModel, companyId: string, cutoffDate: Date) {
  if (model === 'invoice') {
    return { deletedAt: { not: null, lt: cutoffDate }, order: { companyId } }
  }
  return { companyId, deletedAt: { not: null, lt: cutoffDate } }
}

export { MODEL_CONFIG }
