import { prisma } from '@/lib/db';
import type { AuditSeverity } from '@/lib/types';

export interface AuditEventParams {
  userId: string;
  companyId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: Record<string, any> | null;
  ipAddress?: string | null;
  severity?: AuditSeverity;
}

/**
 * Centralized audit logging helper.
 * Records security-relevant actions, admin operations, and clinical overrides.
 */
export async function logAuditEvent(params: AuditEventParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        companyId: params.companyId ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        details: params.details ?? undefined,
        ipAddress: params.ipAddress ?? null,
        severity: params.severity ?? 'INFO',
      },
    });
  } catch (error) {
    // Audit logging failure should not crash the core action, but must be logged to stderr
    console.error('FAILED TO WRITE AUDIT LOG:', error, params);
  }
}
