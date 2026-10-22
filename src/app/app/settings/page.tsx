import React from 'react';
import { prisma, getTenantClient } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { getCompanyForUser } from '@/lib/auth/company';
import { Topbar } from '@/components/layouts/topbar';
import { Badge } from '@/components/ui/badge';
import { APP_TIMEZONE } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export default async function CompanySettingsPage() {
  const session = await getSession();
  if (!session) return null;

  const companyContext = await getCompanyForUser(session.user.id);
  if (!companyContext) return null;

  const company = await prisma.company.findUnique({
    where: { id: companyContext.companyId },
  });

  if (!company) return null;

  return (
    <div>
      <Topbar
        title="Clinic Settings"
        userName={session.user.name}
        userEmail={session.user.email}
      />

      <div className="p-4 lg:p-6 space-y-6 max-w-4xl">
        <div className="bg-surface border border-border rounded p-5 space-y-4">
          <div className="border-b border-border pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-body font-medium text-foreground">Clinic Profile</h3>
              <p className="text-label text-muted">
                Official registration details for {company.name}
              </p>
            </div>
            <Badge variant="success">Active Workspace</Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-body">
            <div>
              <span className="text-label text-muted block">Clinic Name</span>
              <span className="font-medium text-foreground">{company.name}</span>
            </div>
            <div>
              <span className="text-label text-muted block">Clinic Slug</span>
              <span className="font-mono text-label text-foreground">{company.slug}</span>
            </div>
            <div>
              <span className="text-label text-muted block">Primary Email</span>
              <span className="text-foreground">{company.email}</span>
            </div>
            <div>
              <span className="text-label text-muted block">Phone</span>
              <span className="text-foreground">{company.phone}</span>
            </div>
            <div>
              <span className="text-label text-muted block">Address</span>
              <span className="text-foreground">{company.address}</span>
            </div>
            <div>
              <span className="text-label text-muted block">City</span>
              <span className="text-foreground">{company.city}</span>
            </div>
          </div>
        </div>

        <div className="bg-surface border border-border rounded p-5 space-y-4">
          <div className="border-b border-border pb-3">
            <h3 className="text-body font-medium text-foreground">Operational Preferences</h3>
            <p className="text-label text-muted">Timezone and clinical scheduling configurations</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-body">
            <div>
              <span className="text-label text-muted block">Operating Timezone</span>
              <span className="font-medium text-foreground">{APP_TIMEZONE} (UTC+3)</span>
            </div>
            <div>
              <span className="text-label text-muted block">Operating Hours</span>
              <span className="text-foreground">08:00 &ndash; 18:00 (Saturday &ndash; Thursday)</span>
            </div>
            <div>
              <span className="text-label text-muted block">Default Appointment Slot</span>
              <span className="text-foreground">30 minutes</span>
            </div>
            <div>
              <span className="text-label text-muted block">Double Booking Guard</span>
              <span className="text-foreground">Active (PostgreSQL btree_gist)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
