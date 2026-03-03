import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth, isErrorResponse } from '@/lib/tenantGuard'
import { prisma } from '@/lib/prisma'

async function hasCurrencyColumn(): Promise<boolean> {
  try {
    const result = await (prisma as any).$queryRaw`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'price_tiers' AND column_name = 'currency'
      LIMIT 1
    `
    return Array.isArray(result) && result.length > 0
  } catch {
    return false
  }
}

// GET - Retrieve all price tiers for the company
export async function GET() {
  const session = await requireTenantAuth()
  if (isErrorResponse(session)) return session

  try {
    const supportsCurrency = await hasCurrencyColumn()
    let tiers
    if (supportsCurrency) {
      tiers = await (prisma as any).$queryRaw`
        SELECT id, name, code, description, type, modifier, "baseTierCode", currency,
               "sortOrder", "isDefault", "isActive", "companyId", "createdAt", "updatedAt"
        FROM price_tiers
        WHERE "companyId" = ${session.companyId}
        ORDER BY "sortOrder" ASC
      `
    } else {
      tiers = await (prisma as any).$queryRaw`
        SELECT id, name, code, description, type, modifier, "baseTierCode",
               "sortOrder", "isDefault", "isActive", "companyId", "createdAt", "updatedAt"
        FROM price_tiers
        WHERE "companyId" = ${session.companyId}
        ORDER BY "sortOrder" ASC
      `
    }
    return NextResponse.json({ tiers: tiers || [] })
  } catch (error) {
    console.error('Failed to fetch price tiers:', error)
    return NextResponse.json({ error: 'Failed to fetch price tiers' }, { status: 500 })
  }
}

// PUT - Bulk replace all price tiers
export async function PUT(request: NextRequest) {
  const session = await requireTenantAuth()
  if (isErrorResponse(session)) return session

  try {
    const body = await request.json()
    const { tiers } = body

    if (!Array.isArray(tiers)) {
      return NextResponse.json({ error: 'Tiers must be an array' }, { status: 400 })
    }

    const supportsCurrency = await hasCurrencyColumn()

    await prisma.$transaction(async (tx) => {
      const existingTiersRaw = await tx.$queryRaw`
        SELECT id FROM price_tiers WHERE "companyId" = ${session.companyId}
      `
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const existingTiers = existingTiersRaw as { id: string }[]
      const existingIds = new Set(existingTiers.map(t => t.id))
      const newIds = new Set(tiers.filter(t => t.id).map(t => t.id))

      // Delete tiers removed from the list
      const toDelete = [...existingIds].filter(id => !newIds.has(id))
      if (toDelete.length > 0) {
        for (const idToDelete of toDelete) {
          await tx.$executeRaw`UPDATE customers SET "priceTierId" = NULL WHERE "priceTierId" = ${idToDelete}`
          await tx.$executeRaw`DELETE FROM price_tiers WHERE id = ${idToDelete}`
        }
      }

      // Ensure only one default
      let foundDefault = false
      for (const tier of tiers) {
        if (tier.isDefault) {
          if (foundDefault) tier.isDefault = false
          else foundDefault = true
        }
      }

      // Upsert each tier using raw SQL to avoid column mismatch issues
      for (let i = 0; i < tiers.length; i++) {
        const tier = tiers[i]
        const code = tier.code.toLowerCase().replace(/\s+/g, '_')
        const name = tier.name
        const description = tier.description || null
        const type = tier.type || 'FIXED_PRICE'
        const modifier = tier.modifier || 0
        const baseTierCode = tier.baseTierCode || null
        const isDefault = tier.isDefault || false
        const isActive = tier.isActive !== false
        const sortOrder = i
        const currency = tier.currency || 'CNY'

        if (tier.id && existingIds.has(tier.id)) {
          if (supportsCurrency) {
            await tx.$executeRaw`
              UPDATE price_tiers SET
                name = ${name},
                code = ${code},
                description = ${description},
                type = ${type}::"PriceTierType",
                modifier = ${modifier}::decimal,
                "baseTierCode" = ${baseTierCode},
                currency = ${currency},
                "isDefault" = ${isDefault},
                "sortOrder" = ${sortOrder},
                "isActive" = ${isActive},
                "updatedAt" = NOW()
              WHERE id = ${tier.id}
            `
          } else {
            await tx.$executeRaw`
              UPDATE price_tiers SET
                name = ${name},
                code = ${code},
                description = ${description},
                type = ${type}::"PriceTierType",
                modifier = ${modifier}::decimal,
                "baseTierCode" = ${baseTierCode},
                "isDefault" = ${isDefault},
                "sortOrder" = ${sortOrder},
                "isActive" = ${isActive},
                "updatedAt" = NOW()
              WHERE id = ${tier.id}
            `
          }
        } else {
          const newId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
          if (supportsCurrency) {
            await tx.$executeRaw`
              INSERT INTO price_tiers (id, name, code, description, type, modifier, "baseTierCode", currency, "isDefault", "sortOrder", "isActive", "companyId", "createdAt", "updatedAt")
              VALUES (${newId}, ${name}, ${code}, ${description}, ${type}::"PriceTierType", ${modifier}::decimal, ${baseTierCode}, ${currency}, ${isDefault}, ${sortOrder}, ${isActive}, ${session.companyId}, NOW(), NOW())
            `
          } else {
            await tx.$executeRaw`
              INSERT INTO price_tiers (id, name, code, description, type, modifier, "baseTierCode", "isDefault", "sortOrder", "isActive", "companyId", "createdAt", "updatedAt")
              VALUES (${newId}, ${name}, ${code}, ${description}, ${type}::"PriceTierType", ${modifier}::decimal, ${baseTierCode}, ${isDefault}, ${sortOrder}, ${isActive}, ${session.companyId}, NOW(), NOW())
            `
          }
        }
      }
    })

    // Use raw SQL for the final SELECT to avoid issues if currency column doesn't exist yet
    let updatedTiers
    if (supportsCurrency) {
      updatedTiers = await (prisma as any).$queryRaw`
        SELECT id, name, code, description, type, modifier, "baseTierCode", currency,
               "sortOrder", "isDefault", "isActive", "companyId", "createdAt", "updatedAt"
        FROM price_tiers
        WHERE "companyId" = ${session.companyId}
        ORDER BY "sortOrder" ASC
      `
    } else {
      updatedTiers = await (prisma as any).$queryRaw`
        SELECT id, name, code, description, type, modifier, "baseTierCode",
               "sortOrder", "isDefault", "isActive", "companyId", "createdAt", "updatedAt"
        FROM price_tiers
        WHERE "companyId" = ${session.companyId}
        ORDER BY "sortOrder" ASC
      `
    }

    return NextResponse.json({ tiers: updatedTiers })
  } catch (error) {
    console.error('Failed to update price tiers:', error)
    return NextResponse.json({ error: 'Failed to update price tiers' }, { status: 500 })
  }
}

// POST - Create a single price tier
export async function POST(request: NextRequest) {
  const session = await requireTenantAuth()
  if (isErrorResponse(session)) return session

  try {
    const body = await request.json()
    const { name, code, description, type, modifier, baseTierCode, isDefault, currency } = body

    if (!name || !code) {
      return NextResponse.json({ error: 'Name and code are required' }, { status: 400 })
    }

    if (isDefault) {
      await prisma.priceTier.updateMany({
        where: { companyId: session.companyId, isDefault: true },
        data: { isDefault: false },
      })
    }

    const maxSortOrder = await prisma.priceTier.aggregate({
      where: { companyId: session.companyId },
      _max: { sortOrder: true },
    })

    const supportsCurrency = await hasCurrencyColumn()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: Record<string, any> = {
      name,
      code: code.toLowerCase().replace(/\s+/g, '_'),
      description: description || null,
      type: type || 'FIXED_PRICE',
      modifier: modifier || 0,
      baseTierCode: baseTierCode || null,
      isDefault: isDefault || false,
      sortOrder: (maxSortOrder._max.sortOrder || 0) + 1,
      companyId: session.companyId,
    }
    if (supportsCurrency && currency) data.currency = currency

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tier = await prisma.priceTier.create({ data: data as any })
    return NextResponse.json({ tier })
  } catch (error) {
    console.error('Failed to create price tier:', error)
    return NextResponse.json({ error: 'Failed to create price tier' }, { status: 500 })
  }
}
