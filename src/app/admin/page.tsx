import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireSuperAdmin } from '@/lib/auth/guards';
import { Topbar } from '@/components/layouts/topbar';
import { StatisticsBar } from '@/components/ui/statistics-bar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate, formatDateTime } from '@/lib/utils';
import { PlusIcon, AlertIcon } from '@/components/icons';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const admin = await requireSuperAdmin();

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Fetch real statistics in parallel
  const [
    totalCompanies,
    activeCompanies,
    suspendedCompanies,
    pendingCompanies,
    archivedCompanies,
    totalUsers,
    recentAppointmentsCount,
    recentAuditLogs,
    needsAttentionCompanies,
    recentCompanies,
  ] = await Promise.all([
    prisma.company.count(),
    prisma.company.count({ where: { status: 'ACTIVE' } }),
    prisma.company.count({ where: { status: 'SUSPENDED' } }),
    prisma.company.count({ where: { status: 'PENDING_SETUP' } }),
    prisma.company.count({ where: { status: 'ARCHIVED' } }),
    prisma.user.count(),
    prisma.appointment.count({
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
    }),
    prisma.auditLog.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
        company: { select: { name: true } },
      },
    }),
    prisma.company.findMany({
      where: {
        status: { in: ['PENDING_SETUP', 'SUSPENDED'] },
      },
      take: 5,
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { memberships: true } },
      },
    }),
    // Last 6 months companies for trend
    prisma.company.findMany({
      take: 100,
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true },
    }),
  ]);

  // Joined statistics bar items
  const stats = [
    { label: 'Total Companies', value: totalCompanies },
    { label: 'Active Clinics', value: activeCompanies },
    { label: 'Pending Setup', value: pendingCompanies },
    { label: 'Suspended', value: suspendedCompanies },
    { label: 'Platform Users', value: totalUsers },
    { label: 'Appointments (30d)', value: recentAppointmentsCount },
  ];

  // Calculate monthly registrations for the last 6 months
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthCounts: Record<string, number> = {};
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${months[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
    monthCounts[key] = 0;
  }
  for (const c of recentCompanies) {
    const d = new Date(c.createdAt);
    const key = `${months[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
    if (key in monthCounts) {
      monthCounts[key] += 1;
    }
  }

  const maxMonthCount = Math.max(1, ...Object.values(monthCounts));

  return (
    <div>
      <Topbar
        title="Platform Overview"
        userName={admin.name}
        userEmail={admin.email}
        actions={
          <Link href="/admin/companies">
            <Button variant="primary" size="sm">
              <PlusIcon size={16} />
              <span>New company</span>
            </Button>
          </Link>
        }
      />

      <div className="p-4 lg:p-6 space-y-6 max-w-7xl">
        {/* Section 1: Single joined statistics bar */}
        <div>
          <h2 className="text-label text-muted uppercase tracking-wider mb-2 font-medium">
            Platform Metrics
          </h2>
          <StatisticsBar items={stats} />
        </div>

        {/* Section 2: Charts and Status Breakdown Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* New companies per month bar chart */}
          <div className="lg:col-span-2 bg-surface border border-border rounded p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-body font-medium text-foreground">
                  New Companies Registered
                </h3>
                <p className="text-label text-muted">Last 6 months trend</p>
              </div>
            </div>

            {/* Accessible pure SVG / CSS bar chart */}
            <div className="h-48 flex items-end gap-3 pt-6 pb-2 border-b border-border">
              {Object.entries(monthCounts).map(([month, count]) => {
                const heightPercent = Math.round((count / maxMonthCount) * 100);
                return (
                  <div key={month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <span className="text-label text-muted font-medium">
                      {count}
                    </span>
                    <div
                      className="w-full bg-accent/20 hover:bg-accent/30 rounded-t transition-colors"
                      style={{ height: `${Math.max(6, heightPercent)}%` }}
                    />
                    <span className="text-label text-muted truncate w-full text-center">
                      {month}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="sr-only">
              Monthly registrations table:{' '}
              {Object.entries(monthCounts)
                .map(([m, c]) => `${m}: ${c}`)
                .join(', ')}
            </p>
          </div>

          {/* Companies-by-status breakdown */}
          <div className="bg-surface border border-border rounded p-5 flex flex-col justify-between">
            <div>
              <h3 className="text-body font-medium text-foreground mb-1">
                Company Status Breakdown
              </h3>
              <p className="text-label text-muted mb-4">Current platform distribution</p>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 rounded bg-surface-secondary">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-status-success" />
                    <span className="text-body text-foreground">Active</span>
                  </div>
                  <span className="text-body font-medium text-foreground">
                    {activeCompanies}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded bg-surface-secondary">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-status-warning" />
                    <span className="text-body text-foreground">Pending Setup</span>
                  </div>
                  <span className="text-body font-medium text-foreground">
                    {pendingCompanies}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded bg-surface-secondary">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-status-error" />
                    <span className="text-body text-foreground">Suspended</span>
                  </div>
                  <span className="text-body font-medium text-foreground">
                    {suspendedCompanies}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2 rounded bg-surface-secondary">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-muted" />
                    <span className="text-body text-foreground">Archived</span>
                  </div>
                  <span className="text-body font-medium text-foreground">
                    {archivedCompanies}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border mt-4">
              <Link
                href="/admin/companies"
                className="text-label text-accent hover:underline font-medium"
              >
                View all companies &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* Section 3: Needs Attention List and Recent Activity Table */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Needs attention list */}
          <div className="bg-surface border border-border rounded p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertIcon className="text-status-warning" size={18} />
              <h3 className="text-body font-medium text-foreground">
                Needs Attention
              </h3>
            </div>
            <p className="text-label text-muted mb-4">
              Incomplete clinic setups and suspended accounts
            </p>

            {needsAttentionCompanies.length === 0 ? (
              <p className="text-body text-muted py-6 text-center">
                All companies are operating normally.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {needsAttentionCompanies.map((c) => (
                  <div key={c.id} className="py-3 flex items-center justify-between">
                    <div>
                      <Link
                        href={`/admin/companies/${c.id}`}
                        className="text-body font-medium text-foreground hover:text-accent truncate block max-w-[180px]"
                      >
                        {c.name}
                      </Link>
                      <p className="text-label text-muted">
                        {c.city} &bull; {c._count.memberships} members
                      </p>
                    </div>
                    <Badge
                      variant={c.status === 'PENDING_SETUP' ? 'warning' : 'error'}
                    >
                      {c.status === 'PENDING_SETUP' ? 'Pending Setup' : 'Suspended'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Platform Activity */}
          <div className="lg:col-span-2 bg-surface border border-border rounded p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-body font-medium text-foreground">
                  Recent Audit Activity
                </h3>
                <p className="text-label text-muted">Platform events and security logs</p>
              </div>
              <Link
                href="/admin/activity"
                className="text-label text-accent hover:underline font-medium"
              >
                Full audit log &rarr;
              </Link>
            </div>

            {recentAuditLogs.length === 0 ? (
              <p className="text-body text-muted py-8 text-center">
                No recent activity logged.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-body">
                  <thead>
                    <tr className="border-b border-border text-label text-muted uppercase">
                      <th className="py-2 pr-4 font-medium">Time</th>
                      <th className="py-2 px-4 font-medium">Action</th>
                      <th className="py-2 px-4 font-medium">User</th>
                      <th className="py-2 px-4 font-medium">Target</th>
                      <th className="py-2 pl-4 font-medium">Severity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recentAuditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-surface-secondary/50">
                        <td className="py-2.5 pr-4 text-label text-muted whitespace-nowrap">
                          {formatDateTime(log.createdAt)}
                        </td>
                        <td className="py-2.5 px-4 font-medium whitespace-nowrap">
                          {log.action}
                        </td>
                        <td className="py-2.5 px-4 text-muted truncate max-w-[140px]">
                          {log.user.name}
                        </td>
                        <td className="py-2.5 px-4 text-muted truncate max-w-[140px]">
                          {log.company?.name || log.entityType}
                        </td>
                        <td className="py-2.5 pl-4">
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
    </div>
  );
}
