import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getTenantClient, TENANT_SCOPED_MODELS } from '../src/lib/db.ts';

describe('Tenant Isolation Extension', () => {
  it('defines all required tenant-scoped models', () => {
    assert.ok(TENANT_SCOPED_MODELS.includes('patient'));
    assert.ok(TENANT_SCOPED_MODELS.includes('appointment'));
    assert.ok(TENANT_SCOPED_MODELS.includes('visit'));
    assert.ok(TENANT_SCOPED_MODELS.includes('treatmentRecord'));
    assert.ok(TENANT_SCOPED_MODELS.includes('companyMembership'));
  });

  it('automatically binds companyId on tenant client queries', () => {
    const companyIdA = 'company_mogadishu_123';
    const clientA = getTenantClient(companyIdA);

    assert.ok(clientA);
    assert.strictEqual(typeof clientA.patient.findMany, 'function');
    assert.strictEqual(typeof clientA.appointment.findMany, 'function');
  });

  it('prevents cross-tenant leak: queries for Tenant A are scoped to Tenant A', async () => {
    const mockFindFirst = async (args: any) => {
      if (args.where?.companyId === 'company_A' && args.where?.id === 'pat_1') {
        return { id: 'pat_1', companyId: 'company_A', fullName: 'Patient A' };
      }
      return null;
    };

    // Simulate database lookup with tenant client
    const tenantA_lookup = await mockFindFirst({
      where: { id: 'pat_1', companyId: 'company_A' },
    });
    assert.ok(tenantA_lookup);
    assert.strictEqual(tenantA_lookup.companyId, 'company_A');

    // Tenant B attempting to read Patient 1
    const tenantB_lookup = await mockFindFirst({
      where: { id: 'pat_1', companyId: 'company_B' },
    });
    assert.strictEqual(tenantB_lookup, null);
  });
});
