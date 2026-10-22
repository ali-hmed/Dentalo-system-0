import React from 'react';
import { prisma } from '@/lib/db';
import { requireSuperAdmin } from '@/lib/auth/guards';
import { Topbar } from '@/components/layouts/topbar';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/utils';

export const dynamic = 'force-dynamic';

interface ActivityPageProps {
  searchParams?: Promise<{
    severity?: string;
    action?: string;
  }>;
}

export default async function AdminActivityPage({ searchParams }: ActivityPageProps) {
  const admin = await requireSuperAdmin();
  const sp = (await searchParams) || {};
  const severityFilter = sp.severity;

  const whereClause: any = {};
  if (severityFilter && severityFilter !== 'ALL') {
    whereClause.severity = severityFilter;
  }

  const logs = await prisma.auditLog.findMany({
    where: whereClause,
    take: 50,
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { name: true, email: true } },
      company: { select: { name: true, slug: true } },
    },
  });

  return (
    <div>
      <Topbar
        title="Platform Activity & Audit Log"
        userName={admin.name}
        userEmail={admin.email}
      />

      <div className="p-4 lg:p-6 space-y-4 max-w-7xl">
        {/* Severity Filter */}
        <div className="flex items-center gap-2">
          {['ALL', 'INFO', 'WARNING', 'CRITICAL'].map((sev) => {
            const isSelected = (severityFilter || 'ALL') === sev;
            const href =
              sev === 'ALL' ? '/admin/activity' : `/admin/activity?severity=${sev}`;

            return (
              <a
                key={sev}
                href={href}
                className={`px-3 py-1 text-label rounded transition-colors ${
                  isSelected
                    ? 'bg-accent text-white font-medium'
                    : 'bg-surface border border-border text-muted hover:text-foreground'
                }`}
              >
                {sev === 'ALL' ? 'All Severities' : sev}
              </a>
            );
          })}
        </div>

        {/* Logs Table */}
        <div className="bg-surface border border-border rounded overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-body">
              <thead>
                <tr className="bg-surface-secondary border-b border-border text-label text-muted uppercase">
                  <th className="py-2.5 px-4 font-medium">Timestamp</th>
                  <th className="py-2.5 px-4 font-medium">Action</th>
                  <th className="py-2.5 px-4 font-medium">Actor</th>
                  <th className="py-2.5 px-4 font-medium">Target Company</th>
                  <th className="py-2.5 px-4 font-medium">IP Address</th>
                  <th className="py-2.5 px-4 font-medium">Severity</th>
                  <th className="py-2.5 px-4 font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted">
                      No audit events recorded matching criteria.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-surface-secondary/40">
                      <td className="py-2.5 px-4 text-label text-muted whitespace-nowrap">
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-foreground whitespace-nowrap">
                        {log.action}
                      </td>
                      <td className="py-2.5 px-4 text-muted">
                        <span className="text-foreground">{log.user.name}</span>
                        <span className="block text-label text-muted">{log.user.email}</span>
                      </td>
                      <td className="py-2.5 px-4 text-muted">
                        {log.company ? log.company.name : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-label text-muted font-mono">
                        {log.ipAddress || '—'}
                      </td>
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
                      <td className="py-2.5 px-4">
                        {log.details ? (
                          <pre className="text-[11px] font-mono bg-surface-secondary p-1.5 rounded max-w-xs truncate text-muted overflow-hidden">
                            {JSON.stringify(log.details)}
                          </pre>
                        ) : (
                          <span className="text-muted text-label">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
