import { prisma } from './prisma'

/**
 * Generates a serial number: {prefix}{timestamp}{random4chars}
 * Example with prefix "EF-":   EF-1703123456-A3X2
 * Example without prefix:      1703123456-A3X2
 */
function generateSerial(prefix?: string | null): string {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I to avoid confusion
  const random = Array.from({ length: 4 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('')
  const base = `${timestamp}-${random}`
  return prefix ? `${prefix}${base}` : base
}

/**
 * Generates a unique serial for a given company.
 * Retries up to maxAttempts times if a collision is detected.
 */
export async function generateUniqueSerial(
  companyId: string,
  prefix?: string | null,
  maxAttempts = 5
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const serial = generateSerial(prefix)

    const existing = await prisma.serialNumber.findUnique({
      where: { companyId_serial: { companyId, serial } },
      select: { id: true },
    })

    if (!existing) return serial
  }

  throw new Error(`Failed to generate unique serial after ${maxAttempts} attempts`)
}

/**
 * Checks which serials in a list already exist for this company.
 * Returns a map: serial → orderNumber (if already used).
 */
export async function checkSerialConflicts(
  companyId: string,
  serials: string[]
): Promise<Map<string, string>> {
  const conflicts = new Map<string, string>()
  if (serials.length === 0) return conflicts

  const existing = await prisma.serialNumber.findMany({
    where: {
      companyId,
      serial: { in: serials },
    },
    include: {
      order: { select: { orderNumber: true } },
    },
  })

  for (const sn of existing) {
    conflicts.set(sn.serial, sn.order.orderNumber)
  }

  return conflicts
}
