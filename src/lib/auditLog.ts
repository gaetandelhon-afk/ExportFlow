import { prisma } from './prisma'

export type AuditAction =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'EXPORT'
  | 'IMPORT'
  | 'VIEW'
  | 'APPROVE'
  | 'REJECT'

export type AuditEntityType =
  | 'Order'
  | 'OrderLine'
  | 'Product'
  | 'Customer'
  | 'Invoice'
  | 'Payment'
  | 'PaymentRecord'
  | 'User'
  | 'Substitution'
  | 'Settings'
  | 'Branding'
  | 'PackingList'
  | 'Shipment'
  | 'Quote'

export interface AuditLogParams {
  companyId: string
  userId?: string
  userEmail?: string
  userRole?: string
  action: AuditAction
  entityType: AuditEntityType
  entityId?: string
  changes?: Record<string, { old: unknown; new: unknown }>
  metadata?: Record<string, unknown>
  request?: Request | { headers: { get: (key: string) => string | null } }
}

/**
 * Records an audit log entry. Never throws — failures are logged to console only
 * so they never break the main request flow.
 */
export async function createAuditLog(params: AuditLogParams): Promise<void> {
  try {
    const { request, ...data } = params

    let ipAddress: string | undefined
    let userAgent: string | undefined

    if (request) {
      ipAddress =
        request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
        request.headers.get('x-real-ip') ||
        undefined
      userAgent = request.headers.get('user-agent') || undefined
    }

    await prisma.auditLog.create({
      data: {
        companyId: data.companyId,
        userId: data.userId ?? null,
        userEmail: data.userEmail ?? null,
        userRole: data.userRole ?? null,
        ipAddress: ipAddress ?? null,
        userAgent: userAgent ?? null,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId ?? null,
        changes: data.changes ?? undefined,
        metadata: data.metadata ?? undefined,
      },
    })
  } catch (err) {
    // Never crash the main flow because of audit logging
    console.error('[AuditLog] Failed to write audit log:', err)
  }
}

/**
 * Computes a diff between two object snapshots.
 * Returns null if no tracked fields changed.
 */
export function computeChanges<T extends Record<string, unknown>>(
  oldData: T,
  newData: T,
  fieldsToTrack: (keyof T)[]
): Record<string, { old: unknown; new: unknown }> | null {
  const changes: Record<string, { old: unknown; new: unknown }> = {}

  for (const field of fieldsToTrack) {
    const oldValue = oldData[field]
    const newValue = newData[field]

    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes[field as string] = { old: oldValue, new: newValue }
    }
  }

  return Object.keys(changes).length > 0 ? changes : null
}

/**
 * Enriches a session with user email from the request context when available.
 * Use when you have already resolved userEmail from Clerk.
 */
export function buildAuditContext(
  session: { userId: string; companyId: string },
  extras?: { userEmail?: string; userRole?: string }
) {
  return {
    companyId: session.companyId,
    userId: session.userId,
    userEmail: extras?.userEmail,
    userRole: extras?.userRole,
  }
}
