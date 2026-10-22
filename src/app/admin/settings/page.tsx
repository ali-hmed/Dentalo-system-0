import React from 'react';
import { requireSuperAdmin } from '@/lib/auth/guards';
import { Topbar } from '@/components/layouts/topbar';
import { APP_NAME, APP_TIMEZONE } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const admin = await requireSuperAdmin();

  return (
    <div>
      <Topbar
        title="Platform Settings"
        userName={admin.name}
        userEmail={admin.email}
      />

      <div className="p-4 lg:p-6 space-y-6 max-w-4xl">
        {/* Core Configuration */}
        <div className="bg-surface border border-border rounded p-5 space-y-4">
          <div className="border-b border-border pb-3">
            <h3 className="text-body font-medium text-foreground">Platform Defaults</h3>
            <p className="text-label text-muted">
              Global system defaults applied across all dental companies
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-body">
            <div>
              <span className="text-label text-muted block">Platform Name</span>
              <span className="font-medium text-foreground">{APP_NAME}</span>
            </div>
            <div>
              <span className="text-label text-muted block">Primary Timezone</span>
              <span className="font-mono text-label text-foreground">{APP_TIMEZONE} (UTC+3)</span>
            </div>
            <div>
              <span className="text-label text-muted block">Session Duration</span>
              <span className="text-foreground">30 days (sliding expiration)</span>
            </div>
            <div>
              <span className="text-label text-muted block">Invitation Token Lifespan</span>
              <span className="text-foreground">72 hours (single-use)</span>
            </div>
            <div>
              <span className="text-label text-muted block">Break-Glass Support Window</span>
              <span className="text-foreground">30 minutes maximum per session</span>
            </div>
            <div>
              <span className="text-label text-muted block">Double Booking Prevention</span>
              <span className="text-foreground">PostgreSQL btree_gist Exclusion Constraint</span>
            </div>
          </div>
        </div>

        {/* Security Policies */}
        <div className="bg-surface border border-border rounded p-5 space-y-3">
          <h3 className="text-body font-medium text-foreground">Security Policies</h3>
          <p className="text-body text-muted leading-relaxed">
            All tenant database queries are enforced by the Prisma Tenant Extension. Super Administrator accounts have zero default access to clinical charts, patient demographics, diagnoses, and treatments. Emergency support access must be granted via the break-glass mechanism and is recorded as a CRITICAL audit log entry.
          </p>
        </div>
      </div>
    </div>
  );
}
