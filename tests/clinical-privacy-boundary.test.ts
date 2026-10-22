import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Clinical Privacy Boundary & Super Admin Zero-Access', () => {
  interface SupportSessionMock {
    id: string;
    superAdminId: string;
    companyId: string;
    isActive: boolean;
    expiresAt: Date;
    reason: string;
  }

  function evaluateClinicalAccess(
    user: { id: string; role: string; companyMemberships: string[] },
    targetCompanyId: string,
    activeSupportSession?: SupportSessionMock | null
  ): { allowed: boolean; reason?: string; isSupportOverride?: boolean } {
    // 1. If user is a member of the clinic, access is granted directly
    if (user.companyMemberships.includes(targetCompanyId)) {
      return { allowed: true, isSupportOverride: false };
    }

    // 2. If user is Super Admin, default access is strictly DENIED
    if (user.role === 'SUPER_ADMIN') {
      if (
        activeSupportSession &&
        activeSupportSession.superAdminId === user.id &&
        activeSupportSession.companyId === targetCompanyId &&
        activeSupportSession.isActive &&
        activeSupportSession.expiresAt.getTime() > Date.now()
      ) {
        return {
          allowed: true,
          isSupportOverride: true,
          reason: activeSupportSession.reason,
        };
      }

      return {
        allowed: false,
        reason:
          'Super Admins have zero default access to clinical tables (patients, visits, treatments). An active, audited Break-Glass Support Session is required.',
      };
    }

    return { allowed: false, reason: 'Unauthorized tenant access.' };
  }

  it('denies Super Admin access to clinical data by default', () => {
    const superAdmin = {
      id: 'admin_1',
      role: 'SUPER_ADMIN',
      companyMemberships: [],
    };

    const access = evaluateClinicalAccess(superAdmin, 'company_mogadishu_1');
    assert.strictEqual(access.allowed, false);
    assert.match(access.reason || '', /zero default access/);
  });

  it('grants Super Admin access when an active break-glass session exists and tags it as support override', () => {
    const superAdmin = {
      id: 'admin_1',
      role: 'SUPER_ADMIN',
      companyMemberships: [],
    };

    const activeSession: SupportSessionMock = {
      id: 'support_sess_1',
      superAdminId: 'admin_1',
      companyId: 'company_mogadishu_1',
      isActive: true,
      expiresAt: new Date(Date.now() + 20 * 60 * 1000), // 20 mins remaining
      reason: 'Investigating tooth numbering error reported by clinic owner',
    };

    const access = evaluateClinicalAccess(superAdmin, 'company_mogadishu_1', activeSession);
    assert.strictEqual(access.allowed, true);
    assert.strictEqual(access.isSupportOverride, true);
    assert.strictEqual(access.reason, 'Investigating tooth numbering error reported by clinic owner');
  });

  it('denies Super Admin access when the support session has expired', () => {
    const superAdmin = {
      id: 'admin_1',
      role: 'SUPER_ADMIN',
      companyMemberships: [],
    };

    const expiredSession: SupportSessionMock = {
      id: 'support_sess_1',
      superAdminId: 'admin_1',
      companyId: 'company_mogadishu_1',
      isActive: true,
      expiresAt: new Date(Date.now() - 5 * 60 * 1000), // Expired 5 mins ago
      reason: 'Prior support task completed',
    };

    const access = evaluateClinicalAccess(superAdmin, 'company_mogadishu_1', expiredSession);
    assert.strictEqual(access.allowed, false);
  });
});
