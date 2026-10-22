import { getSession } from './session';
import { verifyUserCompanyMembership } from './company';
import { prisma } from '@/lib/db';
import { logAuditEvent } from '@/lib/audit/logger';
import type { SessionUser, StaffType } from '@/lib/types';

export class AuthorizationError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 403) {
    super(message);
    this.name = 'AuthorizationError';
    this.statusCode = statusCode;
  }
}

/**
 * Enforces authenticated user on server operations.
 */
export async function requireAuth(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    throw new AuthorizationError('Authentication required. Please sign in.', 401);
  }
  return session.user;
}

/**
 * Enforces Super Admin access.
 */
export async function requireSuperAdmin(): Promise<SessionUser> {
  const user = await requireAuth();
  if (user.role !== 'SUPER_ADMIN') {
    throw new AuthorizationError('Super Administrator access required.', 403);
  }
  return user;
}

/**
 * Enforces company membership and returns the user's membership in that company.
 */
export async function requireCompanyStaff(
  companyId: string,
  allowedRoles?: StaffType[]
): Promise<{ user: SessionUser; membershipId: string; staffType: StaffType }> {
  const user = await requireAuth();

  const membership = await verifyUserCompanyMembership(user.id, companyId);
  if (!membership) {
    throw new AuthorizationError('You do not have access to this company workspace.', 403);
  }

  if (allowedRoles && !allowedRoles.includes(membership.staffType)) {
    throw new AuthorizationError(
      `Permission denied. Required role: ${allowedRoles.join(' or ')}.`,
      403
    );
  }

  return {
    user,
    membershipId: membership.id,
    staffType: membership.staffType,
  };
}

/**
 * Enforces clinical data boundary:
 * 1. Company staff can access their own company's clinical data.
 * 2. Super Admins CANNOT access clinical data by default.
 *    Access requires an active, time-limited Break-Glass Support Session
 *    and will be explicitly logged with CRITICAL audit severity.
 */
export async function requireClinicalAccess(
  companyId: string,
  actionDescription = 'Access clinical records'
): Promise<{ user: SessionUser; isSupportAccess: boolean; supportSessionId?: string }> {
  const user = await requireAuth();

  // If user is a member of the company, grant direct clinical access
  const membership = await verifyUserCompanyMembership(user.id, companyId);
  if (membership) {
    return { user, isSupportAccess: false };
  }

  // If user is Super Admin, check for active Break-Glass Support Session
  if (user.role === 'SUPER_ADMIN') {
    const activeSession = await prisma.supportSession.findFirst({
      where: {
        superAdminId: user.id,
        companyId,
        isActive: true,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!activeSession) {
      throw new AuthorizationError(
        'Super Admins have zero default access to clinical tables (patients, visits, treatments). ' +
          'An active, audited Break-Glass Support Session is required to access sensitive records.',
        403
      );
    }

    // Explicitly audit the support override access
    await logAuditEvent({
      userId: user.id,
      companyId,
      action: 'AUDIT_SUPPORT_OVERRIDE',
      entityType: 'ClinicalData',
      entityId: companyId,
      details: {
        action: actionDescription,
        supportSessionId: activeSession.id,
        reason: activeSession.reason,
        ticketReference: activeSession.ticketReference,
      },
      severity: 'CRITICAL',
    });

    return {
      user,
      isSupportAccess: true,
      supportSessionId: activeSession.id,
    };
  }

  // Otherwise, deny
  throw new AuthorizationError('You do not have access to this clinic data.', 403);
}
