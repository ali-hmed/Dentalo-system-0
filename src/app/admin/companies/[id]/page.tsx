import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireSuperAdmin } from '@/lib/auth/guards';
import { Topbar } from '@/components/layouts/topbar';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatDateTime } from '@/lib/utils';
import { CompanyActions } from './company-actions';

export const dynamic = 'force-dynamic';

interface CompanyDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CompanyDetailPage({ params }: CompanyDetailPageProps) {
  const admin = await requireSuperAdmin();
  const { id } = await params;

  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      memberships: {
        include: {
          user: {
            select: { id: true, name: true, email: true, status: true },
          },
          staffProfile: true,
        },
        orderBy: { createdAt: 'asc' },
      },
      invitations: {
        where: { status: 'PENDING' },
        orderBy: { createdAt: 'desc' },
      },
      _count: {
        select: {
          patients: true,
          appointments: true,
          visits: true,
        },
      },
    },
  });

  if (!company) {
    notFound();
  }

  // Check if there is an active support session for this company & admin
  const activeSupportSession = await prisma.supportSession.findFirst({
    where: {
      superAdminId: admin.id,
      companyId: company.id,
      isActive: true,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Recent audit logs for this company
  const companyAuditLogs = await prisma.auditLog.findMany({
    where: { companyId: company.id },
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { name: true, email: true } },
    },
  });

  const pendingOwnerInvite = company.invitations.find((i) => i.staffType === 'OWNER');

  return (
    <div>
      <Topbar
        title={company.name}
        userName={admin.name}
        userEmail={admin.email}
        actions={
          <Link
            href="/admin/companies"
            className="text-label text-muted hover:text-foreground font-medium"
          >
            &larr; Back to companies
          </Link>
        }
      />

      <div className="p-4 lg:p-6 space-y-6 max-w-7xl">
        {/* Actions, Support, and Banner component */}
        <CompanyActions
          company={{
            id: company.id,
            name: company.name,
            slug: company.slug,
            email: company.email || '',
            phone: company.phone || '',
            address: company.address || '',
            city: company.city || '',
            status: company.status,
          }}
          activeSupportSession={
            activeSupportSession
              ? {
                  id: activeSupportSession.id,
                  reason: activeSupportSession.reason,
                  expiresAt: activeSupportSession.expiresAt,
                }
              : null
          }
          pendingOwnerInvitation={
            pendingOwnerInvite
              ? {
                  id: pendingOwnerInvite.id,
                  email: pendingOwnerInvite.email,
                  token: pendingOwnerInvite.token,
                }
              : null
          }
        />

        {/* Company Info & Metrics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Clinic Details */}
          <div className="lg:col-span-2 bg-surface border border-border rounded p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-body font-medium text-foreground">Clinic Profile</h3>
                <p className="text-label text-muted">Primary contact and location</p>
              </div>
              <Badge
                variant={
                  company.status === 'ACTIVE'
                    ? 'success'
                    : company.status === 'PENDING_SETUP'
                    ? 'warning'
                    : company.status === 'SUSPENDED'
                    ? 'error'
                    : 'neutral'
                }
              >
                {company.status === 'PENDING_SETUP' ? 'Pending Setup' : company.status}
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-body">
              <div>
                <span className="text-label text-muted block">Company Name</span>
                <span className="font-medium text-foreground">{company.name}</span>
              </div>
              <div>
                <span className="text-label text-muted block">Identifier (Slug)</span>
                <span className="font-mono text-label text-foreground">{company.slug}</span>
              </div>
              <div>
                <span className="text-label text-muted block">Email</span>
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
              <div>
                <span className="text-label text-muted block">Created Date</span>
                <span className="text-foreground">{formatDate(company.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Clinical Records Count (Read-only summary, no clinical payload) */}
          <div className="bg-surface border border-border rounded p-5 flex flex-col justify-between">
            <div>
              <h3 className="text-body font-medium text-foreground mb-1">
                Database Records
              </h3>
              <p className="text-label text-muted mb-4">Volume summary for this tenant</p>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 rounded bg-surface-secondary">
                  <span className="text-body text-muted">Registered Patients</span>
                  <span className="text-body font-medium text-foreground">
                    {company._count.patients}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-surface-secondary">
                  <span className="text-body text-muted">Total Appointments</span>
                  <span className="text-body font-medium text-foreground">
                    {company._count.appointments}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-surface-secondary">
                  <span className="text-body text-muted">Clinical Visits</span>
                  <span className="text-body font-medium text-foreground">
                    {company._count.visits}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-surface-secondary">
                  <span className="text-body text-muted">Staff Members</span>
                  <span className="text-body font-medium text-foreground">
                    {company.memberships.length}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-label text-muted pt-4 border-t border-border mt-4">
              Individual patient charts and diagnoses are encrypted and hidden from platform view.
            </p>
          </div>
        </div>

        {/* Staff Members Table */}
        <div className="bg-surface border border-border rounded p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-body font-medium text-foreground">Staff Members</h3>
              <p className="text-label text-muted">
                Users with authorized access to this clinic workspace
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-body">
              <thead>
                <tr className="border-b border-border text-label text-muted uppercase">
                  <th className="py-2.5 px-4 font-medium">Name</th>
                  <th className="py-2.5 px-4 font-medium">Email</th>
                  <th className="py-2.5 px-4 font-medium">Role</th>
                  <th className="py-2.5 px-4 font-medium">Account Status</th>
                  <th className="py-2.5 px-4 font-medium">Joined Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {company.memberships.map((m) => (
                  <tr key={m.id} className="hover:bg-surface-secondary/40">
                    <td className="py-2.5 px-4 font-medium text-foreground">
                      {m.user.name}
                    </td>
                    <td className="py-2.5 px-4 text-muted">{m.user.email}</td>
                    <td className="py-2.5 px-4">
                      <span className="text-label font-medium px-2 py-0.5 rounded bg-surface-secondary border border-border">
                        {m.staffType}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <Badge variant={m.user.status === 'ACTIVE' ? 'success' : 'error'}>
                        {m.user.status}
                      </Badge>
                    </td>
                    <td className="py-2.5 px-4 text-label text-muted whitespace-nowrap">
                      {formatDate(m.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Audit Log for this Company */}
        <div className="bg-surface border border-border rounded p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-body font-medium text-foreground">
                Company Audit History
              </h3>
              <p className="text-label text-muted">
                Administrative and security events for {company.name}
              </p>
            </div>
          </div>

          {companyAuditLogs.length === 0 ? (
            <p className="text-body text-muted py-6 text-center">
              No audit logs recorded for this company yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-body">
                <thead>
                  <tr className="border-b border-border text-label text-muted uppercase">
                    <th className="py-2 px-4 font-medium">Timestamp</th>
                    <th className="py-2 px-4 font-medium">Action</th>
                    <th className="py-2 px-4 font-medium">Actor</th>
                    <th className="py-2 px-4 font-medium">Severity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {companyAuditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-surface-secondary/40">
                      <td className="py-2.5 px-4 text-label text-muted whitespace-nowrap">
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-foreground">
                        {log.action}
                      </td>
                      <td className="py-2.5 px-4 text-muted">{log.user.name}</td>
                      <td className="py-2.5 px-4">
                        <Badge
                          variant={
                            log.severity === 'CRITICAL'
                              ? 'error'
                              : log.severity === 'WARNING'
                              ? 'warning'
                              : 'neutral'
                          }
                        >
                          {log.severity}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
