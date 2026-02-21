# ExportFlow - Système de Corbeille (Soft Delete)

## PROMPT CURSOR - COPIER EN ENTIER

```
Implémente un système de corbeille complet (soft delete) pour ExportFlow.

## 📋 CONCEPT

Quand un utilisateur supprime un élément:
1. L'élément n'est PAS supprimé de la base
2. Il est marqué deletedAt = now()
3. Il disparaît des listes normales
4. Il reste dans la corbeille pendant X jours (configurable: 15, 30, ou 60)
5. L'utilisateur peut restaurer ou supprimer définitivement
6. Après expiration → suppression automatique par cron job

## 📊 MODÈLES PRISMA

### 1. Settings de la corbeille (dans CompanySettings ou Company)

Ajoute ce champ au modèle Company:

```prisma
model Company {
  // ... champs existants
  
  // Trash settings
  trashRetentionDays  Int  @default(30)  // 15, 30, ou 60
}
```

### 2. Champs soft delete sur les entités

Ajoute ces champs aux modèles: Product, Customer, Invoice, Order

```prisma
model Product {
  // ... champs existants
  
  // Soft delete
  deletedAt     DateTime?
  deletedBy     String?      // userId
  deletedByUser User?        @relation("ProductDeletedBy", fields: [deletedBy], references: [id])
  deleteReason  String?      // Optionnel: raison de suppression
}

model Customer {
  // ... champs existants
  
  deletedAt     DateTime?
  deletedBy     String?
  deletedByUser User?        @relation("CustomerDeletedBy", fields: [deletedBy], references: [id])
  deleteReason  String?
}

model Invoice {
  // ... champs existants
  
  deletedAt     DateTime?
  deletedBy     String?
  deletedByUser User?        @relation("InvoiceDeletedBy", fields: [deletedBy], references: [id])
  deleteReason  String?
}

model Order {
  // ... champs existants
  
  deletedAt     DateTime?
  deletedBy     String?
  deletedByUser User?        @relation("OrderDeletedBy", fields: [deletedBy], references: [id])
  deleteReason  String?
}
```

Ajoute les relations inverses dans User:

```prisma
model User {
  // ... champs existants
  
  // Soft delete relations
  productsDeleted   Product[]   @relation("ProductDeletedBy")
  customersDeleted  Customer[]  @relation("CustomerDeletedBy")
  invoicesDeleted   Invoice[]   @relation("InvoiceDeletedBy")
  ordersDeleted     Order[]     @relation("OrderDeletedBy")
}
```

## 📁 FICHIERS À CRÉER

### 1. Lib: src/lib/trash.ts

```typescript
import { prisma } from './prisma'
import { createAuditLog } from './auditLog'

// Types
export type TrashableEntity = 'product' | 'customer' | 'invoice' | 'order'

export interface TrashItem {
  id: string
  type: TrashableEntity
  name: string
  description?: string
  deletedAt: Date
  deletedBy?: {
    id: string
    name: string
    email: string
  }
  deleteReason?: string
  daysRemaining: number
  expiresAt: Date
}

export interface TrashStats {
  total: number
  products: number
  customers: number
  invoices: number
  orders: number
  expiringIn7Days: number
}

// ============================================
// SOFT DELETE
// ============================================

export async function softDelete(
  entityType: TrashableEntity,
  entityId: string,
  userId: string,
  companyId: string,
  reason?: string
): Promise<void> {
  const model = getModel(entityType)
  
  // Vérifier que l'entité appartient à la company
  const entity = await model.findFirst({
    where: { id: entityId, companyId }
  })
  
  if (!entity) {
    throw new Error(`${entityType} not found`)
  }
  
  if (entity.deletedAt) {
    throw new Error(`${entityType} is already in trash`)
  }
  
  // Soft delete
  await model.update({
    where: { id: entityId },
    data: {
      deletedAt: new Date(),
      deletedBy: userId,
      deleteReason: reason || null,
      isActive: false
    }
  })
  
  // Audit log
  await createAuditLog({
    companyId,
    userId,
    action: 'DELETE',
    entityType: capitalize(entityType),
    entityId,
    metadata: { reason, movedToTrash: true }
  })
}

// ============================================
// RESTAURER
// ============================================

export async function restore(
  entityType: TrashableEntity,
  entityId: string,
  userId: string,
  companyId: string
): Promise<void> {
  const model = getModel(entityType)
  
  const entity = await model.findFirst({
    where: { id: entityId, companyId, deletedAt: { not: null } }
  })
  
  if (!entity) {
    throw new Error(`${entityType} not found in trash`)
  }
  
  await model.update({
    where: { id: entityId },
    data: {
      deletedAt: null,
      deletedBy: null,
      deleteReason: null,
      isActive: true
    }
  })
  
  await createAuditLog({
    companyId,
    userId,
    action: 'RESTORE',
    entityType: capitalize(entityType),
    entityId
  })
}

// ============================================
// RESTAURER TOUT
// ============================================

export async function restoreAll(
  companyId: string,
  userId: string,
  entityType?: TrashableEntity
): Promise<{ restored: number }> {
  const types: TrashableEntity[] = entityType 
    ? [entityType] 
    : ['product', 'customer', 'invoice', 'order']
  
  let totalRestored = 0
  
  for (const type of types) {
    const model = getModel(type)
    
    const result = await model.updateMany({
      where: { companyId, deletedAt: { not: null } },
      data: {
        deletedAt: null,
        deletedBy: null,
        deleteReason: null,
        isActive: true
      }
    })
    
    totalRestored += result.count
  }
  
  await createAuditLog({
    companyId,
    userId,
    action: 'RESTORE',
    entityType: entityType ? capitalize(entityType) : 'All',
    metadata: { restoredCount: totalRestored, restoreAll: true }
  })
  
  return { restored: totalRestored }
}

// ============================================
// SUPPRESSION DÉFINITIVE
// ============================================

export async function permanentDelete(
  entityType: TrashableEntity,
  entityId: string,
  userId: string,
  companyId: string
): Promise<void> {
  const model = getModel(entityType)
  
  const entity = await model.findFirst({
    where: { id: entityId, companyId, deletedAt: { not: null } }
  })
  
  if (!entity) {
    throw new Error(`${entityType} not found in trash`)
  }
  
  // Vérifier les dépendances avant suppression définitive
  await checkDependencies(entityType, entityId)
  
  await model.delete({
    where: { id: entityId }
  })
  
  await createAuditLog({
    companyId,
    userId,
    action: 'PERMANENT_DELETE',
    entityType: capitalize(entityType),
    entityId,
    metadata: { permanent: true }
  })
}

// ============================================
// VIDER LA CORBEILLE
// ============================================

export async function emptyTrash(
  companyId: string,
  userId: string,
  entityType?: TrashableEntity
): Promise<{ deleted: number }> {
  const types: TrashableEntity[] = entityType 
    ? [entityType] 
    : ['product', 'customer', 'invoice', 'order']
  
  let totalDeleted = 0
  
  // Ordre important pour les dépendances: orders d'abord, puis invoices, etc.
  const orderedTypes: TrashableEntity[] = ['order', 'invoice', 'customer', 'product']
  const typesToDelete = orderedTypes.filter(t => types.includes(t))
  
  for (const type of typesToDelete) {
    const model = getModel(type)
    
    const result = await model.deleteMany({
      where: { companyId, deletedAt: { not: null } }
    })
    
    totalDeleted += result.count
  }
  
  await createAuditLog({
    companyId,
    userId,
    action: 'EMPTY_TRASH',
    entityType: entityType ? capitalize(entityType) : 'All',
    metadata: { deletedCount: totalDeleted }
  })
  
  return { deleted: totalDeleted }
}

// ============================================
// RÉCUPÉRER LES ÉLÉMENTS DE LA CORBEILLE
// ============================================

export async function getTrashItems(
  companyId: string,
  options?: {
    entityType?: TrashableEntity
    search?: string
    sortBy?: 'deletedAt' | 'name' | 'expiresAt'
    sortOrder?: 'asc' | 'desc'
    page?: number
    limit?: number
  }
): Promise<{ items: TrashItem[]; total: number; stats: TrashStats }> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { trashRetentionDays: true }
  })
  
  const retentionDays = company?.trashRetentionDays || 30
  
  const types: TrashableEntity[] = options?.entityType 
    ? [options.entityType] 
    : ['product', 'customer', 'invoice', 'order']
  
  const items: TrashItem[] = []
  const stats: TrashStats = {
    total: 0,
    products: 0,
    customers: 0,
    invoices: 0,
    orders: 0,
    expiringIn7Days: 0
  }
  
  for (const type of types) {
    const model = getModel(type)
    
    const entities = await model.findMany({
      where: {
        companyId,
        deletedAt: { not: null },
        ...(options?.search && {
          OR: getSearchConditions(type, options.search)
        })
      },
      include: {
        deletedByUser: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: {
        [options?.sortBy || 'deletedAt']: options?.sortOrder || 'desc'
      }
    })
    
    for (const entity of entities) {
      const expiresAt = new Date(entity.deletedAt!)
      expiresAt.setDate(expiresAt.getDate() + retentionDays)
      
      const daysRemaining = Math.ceil(
        (expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
      
      items.push({
        id: entity.id,
        type,
        name: getEntityName(type, entity),
        description: getEntityDescription(type, entity),
        deletedAt: entity.deletedAt!,
        deletedBy: entity.deletedByUser || undefined,
        deleteReason: entity.deleteReason || undefined,
        daysRemaining: Math.max(0, daysRemaining),
        expiresAt
      })
      
      // Stats
      stats[`${type}s` as keyof TrashStats] = (stats[`${type}s` as keyof TrashStats] as number) + 1
      stats.total++
      
      if (daysRemaining <= 7 && daysRemaining > 0) {
        stats.expiringIn7Days++
      }
    }
  }
  
  // Sort all items together
  items.sort((a, b) => {
    const sortBy = options?.sortBy || 'deletedAt'
    const sortOrder = options?.sortOrder || 'desc'
    
    let comparison = 0
    if (sortBy === 'deletedAt' || sortBy === 'expiresAt') {
      comparison = new Date(a[sortBy]).getTime() - new Date(b[sortBy]).getTime()
    } else if (sortBy === 'name') {
      comparison = a.name.localeCompare(b.name)
    }
    
    return sortOrder === 'desc' ? -comparison : comparison
  })
  
  // Pagination
  const page = options?.page || 1
  const limit = options?.limit || 50
  const start = (page - 1) * limit
  const paginatedItems = items.slice(start, start + limit)
  
  return {
    items: paginatedItems,
    total: items.length,
    stats
  }
}

// ============================================
// NETTOYER LES ÉLÉMENTS EXPIRÉS (Cron)
// ============================================

export async function cleanupExpiredTrashItems(): Promise<{
  deleted: { products: number; customers: number; invoices: number; orders: number }
}> {
  const companies = await prisma.company.findMany({
    select: { id: true, trashRetentionDays: true }
  })
  
  const deleted = {
    products: 0,
    customers: 0,
    invoices: 0,
    orders: 0
  }
  
  for (const company of companies) {
    const retentionDays = company.trashRetentionDays || 30
    const expirationDate = new Date()
    expirationDate.setDate(expirationDate.getDate() - retentionDays)
    
    // Supprimer dans l'ordre des dépendances
    const ordersDeleted = await prisma.order.deleteMany({
      where: {
        companyId: company.id,
        deletedAt: { lt: expirationDate }
      }
    })
    deleted.orders += ordersDeleted.count
    
    const invoicesDeleted = await prisma.invoice.deleteMany({
      where: {
        companyId: company.id,
        deletedAt: { lt: expirationDate }
      }
    })
    deleted.invoices += invoicesDeleted.count
    
    const customersDeleted = await prisma.customer.deleteMany({
      where: {
        companyId: company.id,
        deletedAt: { lt: expirationDate }
      }
    })
    deleted.customers += customersDeleted.count
    
    const productsDeleted = await prisma.product.deleteMany({
      where: {
        companyId: company.id,
        deletedAt: { lt: expirationDate }
      }
    })
    deleted.products += productsDeleted.count
  }
  
  console.log('[Trash Cleanup]', deleted)
  
  return { deleted }
}

// ============================================
// HELPERS
// ============================================

function getModel(entityType: TrashableEntity) {
  switch (entityType) {
    case 'product': return prisma.product
    case 'customer': return prisma.customer
    case 'invoice': return prisma.invoice
    case 'order': return prisma.order
    default: throw new Error(`Unknown entity type: ${entityType}`)
  }
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function getEntityName(type: TrashableEntity, entity: any): string {
  switch (type) {
    case 'product': return entity.name || entity.ref
    case 'customer': return entity.name
    case 'invoice': return entity.invoiceNumber
    case 'order': return entity.orderNumber
    default: return entity.id
  }
}

function getEntityDescription(type: TrashableEntity, entity: any): string | undefined {
  switch (type) {
    case 'product': return `SKU: ${entity.ref}`
    case 'customer': return entity.email
    case 'invoice': return `${entity.total / 100} ${entity.currency}`
    case 'order': return `${entity.total / 100} ${entity.currency} - ${entity.status}`
    default: return undefined
  }
}

function getSearchConditions(type: TrashableEntity, search: string) {
  const searchLower = search.toLowerCase()
  
  switch (type) {
    case 'product':
      return [
        { name: { contains: searchLower, mode: 'insensitive' } },
        { ref: { contains: searchLower, mode: 'insensitive' } }
      ]
    case 'customer':
      return [
        { name: { contains: searchLower, mode: 'insensitive' } },
        { email: { contains: searchLower, mode: 'insensitive' } }
      ]
    case 'invoice':
      return [
        { invoiceNumber: { contains: searchLower, mode: 'insensitive' } }
      ]
    case 'order':
      return [
        { orderNumber: { contains: searchLower, mode: 'insensitive' } }
      ]
    default:
      return []
  }
}

async function checkDependencies(type: TrashableEntity, entityId: string): Promise<void> {
  // Vérifier si l'entité a des dépendances actives
  // Si oui, empêcher la suppression définitive
  
  if (type === 'customer') {
    const activeOrders = await prisma.order.count({
      where: { customerId: entityId, deletedAt: null }
    })
    if (activeOrders > 0) {
      throw new Error(`Cannot permanently delete: customer has ${activeOrders} active orders`)
    }
  }
  
  if (type === 'product') {
    // Les produits peuvent avoir des order lines, mais on peut les supprimer
    // car les order lines ont un snapshot des infos produit
  }
}
```

### 2. API Routes

#### src/app/api/trash/route.ts (GET list, POST restore all, DELETE empty)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getTrashItems, restoreAll, emptyTrash, TrashableEntity } from '@/lib/trash'
import { getCurrentUser } from '@/lib/auth'

// GET - Liste des éléments dans la corbeille
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const { searchParams } = new URL(request.url)
    
    const result = await getTrashItems(user.companyId, {
      entityType: searchParams.get('type') as TrashableEntity | undefined,
      search: searchParams.get('search') || undefined,
      sortBy: searchParams.get('sortBy') as any || 'deletedAt',
      sortOrder: searchParams.get('sortOrder') as any || 'desc',
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '50')
    })
    
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST - Restaurer tout
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    
    const body = await request.json()
    const { entityType } = body
    
    const result = await restoreAll(user.companyId, user.id, entityType)
    
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE - Vider la corbeille
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    
    const { searchParams } = new URL(request.url)
    const entityType = searchParams.get('type') as TrashableEntity | undefined
    
    const result = await emptyTrash(user.companyId, user.id, entityType)
    
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

#### src/app/api/trash/[entityType]/[id]/route.ts (restore, permanent delete)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { restore, permanentDelete, TrashableEntity } from '@/lib/trash'
import { getCurrentUser } from '@/lib/auth'

// POST - Restaurer un élément
export async function POST(
  request: NextRequest,
  { params }: { params: { entityType: TrashableEntity; id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    await restore(params.entityType, params.id, user.id, user.companyId)
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}

// DELETE - Supprimer définitivement
export async function DELETE(
  request: NextRequest,
  { params }: { params: { entityType: TrashableEntity; id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    
    await permanentDelete(params.entityType, params.id, user.id, user.companyId)
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
```

#### src/app/api/trash/settings/route.ts (GET/PUT retention settings)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { createAuditLog } from '@/lib/auditLog'

const ALLOWED_RETENTION_DAYS = [15, 30, 60]

// GET - Récupérer les settings
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    const company = await prisma.company.findUnique({
      where: { id: user.companyId },
      select: { trashRetentionDays: true }
    })
    
    return NextResponse.json({
      retentionDays: company?.trashRetentionDays || 30,
      allowedValues: ALLOWED_RETENTION_DAYS
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// PUT - Modifier les settings
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    
    const { retentionDays } = await request.json()
    
    if (!ALLOWED_RETENTION_DAYS.includes(retentionDays)) {
      return NextResponse.json(
        { error: `Retention days must be one of: ${ALLOWED_RETENTION_DAYS.join(', ')}` },
        { status: 400 }
      )
    }
    
    const oldCompany = await prisma.company.findUnique({
      where: { id: user.companyId },
      select: { trashRetentionDays: true }
    })
    
    await prisma.company.update({
      where: { id: user.companyId },
      data: { trashRetentionDays: retentionDays }
    })
    
    await createAuditLog({
      companyId: user.companyId,
      userId: user.id,
      action: 'UPDATE',
      entityType: 'Settings',
      changes: {
        trashRetentionDays: {
          old: oldCompany?.trashRetentionDays || 30,
          new: retentionDays
        }
      }
    })
    
    return NextResponse.json({ success: true, retentionDays })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

#### src/app/api/cron/cleanup-trash/route.ts (Cron job)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { cleanupExpiredTrashItems } from '@/lib/trash'

export async function GET(request: NextRequest) {
  // Vérifier le secret pour sécuriser le cron
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  try {
    const result = await cleanupExpiredTrashItems()
    
    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('[Cron Trash Cleanup Error]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

### 3. Page Corbeille: src/app/(tenant)/(dashboard)/settings/trash/page.tsx

```tsx
'use client'

import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { fr } from 'date-fns/locale'

interface TrashItem {
  id: string
  type: 'product' | 'customer' | 'invoice' | 'order'
  name: string
  description?: string
  deletedAt: string
  deletedBy?: { name: string; email: string }
  deleteReason?: string
  daysRemaining: number
  expiresAt: string
}

interface TrashStats {
  total: number
  products: number
  customers: number
  invoices: number
  orders: number
  expiringIn7Days: number
}

const TYPE_LABELS: Record<string, string> = {
  product: 'Produit',
  customer: 'Client',
  invoice: 'Facture',
  order: 'Commande'
}

const TYPE_ICONS: Record<string, string> = {
  product: '📦',
  customer: '👤',
  invoice: '📄',
  order: '🛒'
}

export default function TrashPage() {
  const [items, setItems] = useState<TrashItem[]>([])
  const [stats, setStats] = useState<TrashStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [retentionDays, setRetentionDays] = useState(30)
  const [selectedType, setSelectedType] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    loadTrash()
    loadSettings()
  }, [selectedType, search])

  async function loadTrash() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedType !== 'all') params.set('type', selectedType)
      if (search) params.set('search', search)
      
      const res = await fetch(`/api/trash?${params}`)
      const data = await res.json()
      
      setItems(data.items)
      setStats(data.stats)
    } catch (error) {
      console.error('Error loading trash:', error)
    } finally {
      setLoading(false)
    }
  }

  async function loadSettings() {
    try {
      const res = await fetch('/api/trash/settings')
      const data = await res.json()
      setRetentionDays(data.retentionDays)
    } catch (error) {
      console.error('Error loading settings:', error)
    }
  }

  async function updateRetentionDays(days: number) {
    try {
      await fetch('/api/trash/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ retentionDays: days })
      })
      setRetentionDays(days)
    } catch (error) {
      console.error('Error updating settings:', error)
    }
  }

  async function restoreItem(type: string, id: string) {
    setActionLoading(true)
    try {
      await fetch(`/api/trash/${type}/${id}`, { method: 'POST' })
      await loadTrash()
    } catch (error) {
      console.error('Error restoring:', error)
    } finally {
      setActionLoading(false)
    }
  }

  async function deleteItem(type: string, id: string) {
    if (!confirm('Supprimer définitivement ? Cette action est irréversible.')) return
    
    setActionLoading(true)
    try {
      await fetch(`/api/trash/${type}/${id}`, { method: 'DELETE' })
      await loadTrash()
    } catch (error) {
      console.error('Error deleting:', error)
    } finally {
      setActionLoading(false)
    }
  }

  async function restoreAll() {
    if (!confirm(`Restaurer tous les ${stats?.total || 0} éléments ?`)) return
    
    setActionLoading(true)
    try {
      await fetch('/api/trash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          entityType: selectedType !== 'all' ? selectedType : undefined 
        })
      })
      await loadTrash()
    } catch (error) {
      console.error('Error restoring all:', error)
    } finally {
      setActionLoading(false)
    }
  }

  async function emptyTrash() {
    if (!confirm('Vider la corbeille ? Tous les éléments seront supprimés définitivement.')) return
    
    setActionLoading(true)
    try {
      const params = selectedType !== 'all' ? `?type=${selectedType}` : ''
      await fetch(`/api/trash${params}`, { method: 'DELETE' })
      await loadTrash()
    } catch (error) {
      console.error('Error emptying trash:', error)
    } finally {
      setActionLoading(false)
    }
  }

  async function restoreSelected() {
    if (selectedItems.size === 0) return
    
    setActionLoading(true)
    try {
      for (const key of selectedItems) {
        const [type, id] = key.split(':')
        await fetch(`/api/trash/${type}/${id}`, { method: 'POST' })
      }
      setSelectedItems(new Set())
      await loadTrash()
    } catch (error) {
      console.error('Error restoring selected:', error)
    } finally {
      setActionLoading(false)
    }
  }

  function toggleSelect(type: string, id: string) {
    const key = `${type}:${id}`
    const newSelected = new Set(selectedItems)
    if (newSelected.has(key)) {
      newSelected.delete(key)
    } else {
      newSelected.add(key)
    }
    setSelectedItems(newSelected)
  }

  function selectAll() {
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(items.map(i => `${i.type}:${i.id}`)))
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">🗑️ Corbeille</h1>
          <p className="text-gray-500 mt-1">
            Les éléments supprimés sont conservés {retentionDays} jours avant suppression définitive.
          </p>
        </div>
        
        {/* Retention settings */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Conservation :</span>
          <select
            value={retentionDays}
            onChange={(e) => updateRetentionDays(parseInt(e.target.value))}
            className="border rounded px-3 py-1.5 text-sm"
          >
            <option value={15}>15 jours</option>
            <option value={30}>30 jours</option>
            <option value={60}>60 jours</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      {stats && stats.total > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-gray-500">Total</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold">{stats.products}</div>
            <div className="text-sm text-gray-500">📦 Produits</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold">{stats.customers}</div>
            <div className="text-sm text-gray-500">👤 Clients</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold">{stats.invoices}</div>
            <div className="text-sm text-gray-500">📄 Factures</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold">{stats.orders}</div>
            <div className="text-sm text-gray-500">🛒 Commandes</div>
          </div>
          {stats.expiringIn7Days > 0 && (
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
              <div className="text-2xl font-bold text-orange-600">{stats.expiringIn7Days}</div>
              <div className="text-sm text-orange-600">⚠️ Expire bientôt</div>
            </div>
          )}
        </div>
      )}

      {/* Filters and Actions */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="all">Tous les types</option>
            <option value="product">📦 Produits</option>
            <option value="customer">👤 Clients</option>
            <option value="invoice">📄 Factures</option>
            <option value="order">🛒 Commandes</option>
          </select>
          
          <input
            type="search"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border rounded px-3 py-2 w-64"
          />
        </div>
        
        <div className="flex-1" />
        
        <div className="flex items-center gap-2">
          {selectedItems.size > 0 && (
            <button
              onClick={restoreSelected}
              disabled={actionLoading}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              Restaurer ({selectedItems.size})
            </button>
          )}
          
          {stats && stats.total > 0 && (
            <>
              <button
                onClick={restoreAll}
                disabled={actionLoading}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
              >
                Tout restaurer
              </button>
              
              <button
                onClick={emptyTrash}
                disabled={actionLoading}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
              >
                Vider la corbeille
              </button>
            </>
          )}
        </div>
      </div>

      {/* Items list */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Chargement...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🗑️</div>
          <div className="text-gray-500">La corbeille est vide</div>
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-4 px-4 py-3 bg-gray-50 border-b text-sm font-medium text-gray-500">
            <input
              type="checkbox"
              checked={selectedItems.size === items.length}
              onChange={selectAll}
              className="w-4 h-4"
            />
            <div className="w-8">Type</div>
            <div className="flex-1">Élément</div>
            <div className="w-40">Supprimé</div>
            <div className="w-32">Expire dans</div>
            <div className="w-40 text-right">Actions</div>
          </div>
          
          {/* Items */}
          {items.map((item) => (
            <div
              key={`${item.type}-${item.id}`}
              className={`flex items-center gap-4 px-4 py-3 border-b last:border-b-0 hover:bg-gray-50 ${
                item.daysRemaining <= 7 ? 'bg-orange-50' : ''
              }`}
            >
              <input
                type="checkbox"
                checked={selectedItems.has(`${item.type}:${item.id}`)}
                onChange={() => toggleSelect(item.type, item.id)}
                className="w-4 h-4"
              />
              
              <div className="w-8 text-xl" title={TYPE_LABELS[item.type]}>
                {TYPE_ICONS[item.type]}
              </div>
              
              <div className="flex-1">
                <div className="font-medium">{item.name}</div>
                {item.description && (
                  <div className="text-sm text-gray-500">{item.description}</div>
                )}
                {item.deleteReason && (
                  <div className="text-sm text-gray-400 italic">
                    Raison: {item.deleteReason}
                  </div>
                )}
              </div>
              
              <div className="w-40 text-sm text-gray-500">
                <div>
                  {formatDistanceToNow(new Date(item.deletedAt), { 
                    addSuffix: true,
                    locale: fr 
                  })}
                </div>
                {item.deletedBy && (
                  <div className="text-xs text-gray-400">
                    par {item.deletedBy.name}
                  </div>
                )}
              </div>
              
              <div className={`w-32 text-sm ${
                item.daysRemaining <= 7 
                  ? 'text-orange-600 font-medium' 
                  : 'text-gray-500'
              }`}>
                {item.daysRemaining <= 0 
                  ? '⚠️ Expiré' 
                  : `${item.daysRemaining} jours`}
              </div>
              
              <div className="w-40 flex items-center justify-end gap-2">
                <button
                  onClick={() => restoreItem(item.type, item.id)}
                  disabled={actionLoading}
                  className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50"
                >
                  Restaurer
                </button>
                <button
                  onClick={() => deleteItem(item.type, item.id)}
                  disabled={actionLoading}
                  className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 disabled:opacity-50"
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

### 4. Modifier les routes de suppression existantes

Pour chaque entité (Product, Customer, Invoice, Order), modifie la route DELETE:

```typescript
// Exemple: api/products/[id]/route.ts

import { softDelete } from '@/lib/trash'

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    
    // Récupérer la raison optionnelle
    let reason: string | undefined
    try {
      const body = await request.json()
      reason = body.reason
    } catch {}
    
    // Soft delete au lieu de vraie suppression
    await softDelete('product', params.id, user.id, user.companyId, reason)
    
    return NextResponse.json({ success: true, movedToTrash: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
```

### 5. Modifier les queries pour exclure les éléments supprimés

Partout où tu listes des entités, ajoute le filtre:

```typescript
// AVANT
const products = await prisma.product.findMany({
  where: { companyId }
})

// APRÈS
const products = await prisma.product.findMany({
  where: { 
    companyId,
    deletedAt: null  // ← Exclure les supprimés
  }
})
```

### 6. Navigation - Ajouter le lien vers la corbeille

Dans le menu Settings:

```tsx
// components/SettingsNav.tsx

const settingsLinks = [
  { href: '/dashboard/settings/company', label: 'Entreprise', icon: '🏢' },
  { href: '/dashboard/settings/branding', label: 'Branding', icon: '🎨' },
  { href: '/dashboard/settings/domain', label: 'Domaine', icon: '🌐' },
  { href: '/dashboard/settings/trash', label: 'Corbeille', icon: '🗑️', badge: trashCount },
]
```

### 7. Composant de confirmation de suppression

Crée un composant réutilisable:

```tsx
// components/DeleteConfirmModal.tsx

interface DeleteConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (reason?: string) => void
  entityType: string
  entityName: string
  loading?: boolean
}

export function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  entityType,
  entityName,
  loading
}: DeleteConfirmModalProps) {
  const [reason, setReason] = useState('')
  const [showReason, setShowReason] = useState(false)
  
  if (!isOpen) return null
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-2">
          Supprimer {entityType.toLowerCase()} ?
        </h3>
        
        <p className="text-gray-600 mb-4">
          <strong>{entityName}</strong> sera déplacé dans la corbeille.
          Vous pourrez le restaurer pendant 30 jours.
        </p>
        
        {!showReason ? (
          <button
            onClick={() => setShowReason(true)}
            className="text-sm text-blue-500 hover:underline mb-4"
          >
            + Ajouter une raison (optionnel)
          </button>
        ) : (
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Raison de la suppression..."
            className="w-full border rounded p-2 mb-4 text-sm"
            rows={2}
          />
        )}
        
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
          >
            Annuler
          </button>
          <button
            onClick={() => onConfirm(reason || undefined)}
            disabled={loading}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
          >
            {loading ? 'Suppression...' : 'Supprimer'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

### 8. Cron Job Vercel

Dans `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-trash",
      "schedule": "0 3 * * *"
    }
  ]
}
```

Variable d'environnement: `CRON_SECRET` pour sécuriser.

## ✅ RÉSUMÉ DES FONCTIONNALITÉS

- [x] Soft delete (deletedAt au lieu de vraie suppression)
- [x] Rétention configurable (15, 30, 60 jours)
- [x] Page corbeille avec liste, filtres, recherche
- [x] Stats par type d'entité
- [x] Restaurer un élément
- [x] Restaurer tout (par type ou global)
- [x] Sélection multiple + restauration batch
- [x] Suppression définitive manuelle
- [x] Vider la corbeille
- [x] Indicateur "expire bientôt"
- [x] Qui a supprimé + raison
- [x] Cron job nettoyage automatique
- [x] Audit logs intégrés
- [x] Modal de confirmation avec raison optionnelle
```
