import React from 'react';
import Link from 'next/link';
import { getTenantClient } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { getCompanyForUser } from '@/lib/auth/company';
import { Topbar } from '@/components/layouts/topbar';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { ToothIcon } from '@/components/icons';

export const dynamic = 'force-dynamic';

interface TreatmentsPageProps {
  searchParams: { status?: string; q?: string };
}

export default async function TreatmentsPage({ searchParams }: TreatmentsPageProps) {
  const session = await getSession();
  if (!session) return null;

  const companyContext = await getCompanyForUser(session.user.id);
  if (!companyContext) return null;

  const tenantDb = getTenantClient(companyContext.companyId);
  const statusFilter = searchParams.status;
  const query = searchParams.q?.trim().toLowerCase();

  const whereClause: any = {};
  if (statusFilter && statusFilter !== 'ALL') {
    whereClause.status = statusFilter;
  }
  if (query) {
    whereClause.OR = [
      { procedureName: { contains: query, mode: 'insensitive' } },
      { toothNumber: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } },
    ];
  }

  const treatments = await tenantDb.treatmentRecord.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    include: {
      visit: {
        include: {
          patient: { select: { id: true, fullName: true, phone: true } },
          dentist: { include: { user: { select: { name: true } } } },
        },
      },
    },
    take: 100,
  });

  return (
    <div>
      <Topbar
        title="Treatments & Procedures"
        userName={session.user.name}
        userEmail={session.user.email}
      />

      <div className="p-4 lg:p-6 space-y-4 max-w-7xl">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <form method="GET" className="max-w-md flex-1">
            <input
              type="search"
              name="q"
              defaultValue={searchParams.q || ''}
              placeholder="Search by procedure name, tooth #..."
              className="w-full text-body bg-surface border border-border rounded px-3 py-1.5 focus:border-accent"
            />
            {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
          </form>

          <div className="flex items-center gap-1">
            {['ALL', 'COMPLETED', 'IN_PROGRESS', 'PLANNED'].map((st) => {
              const isSelected = (statusFilter || 'ALL') === st;
              const href =
                st === 'ALL'
                  ? `/app/treatments${query ? `?q=${encodeURIComponent(query)}` : ''}`
                  : `/app/treatments?status=${st}${query ? `&q=${encodeURIComponent(query)}` : ''}`;

              return (
                <Link
                  key={st}
                  href={href}
                  className={`px-3 py-1 text-label rounded whitespace-nowrap transition-colors ${
                    isSelected
                      ? 'bg-accent text-white font-medium'
                      : 'bg-surface border border-border text-muted hover:text-foreground'
                  }`}
                >
                  {st === 'ALL' ? 'All Statuses' : st.replace('_', ' ')}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Table */}
        <div className="bg-surface border border-border rounded overflow-hidden">
          {treatments.length === 0 ? (
            <div className="p-12 text-center">
              <ToothIcon className="mx-auto text-muted mb-2" size={24} />
              <p className="text-body font-medium text-foreground mb-1">
                No treatment procedures recorded
              </p>
              <p className="text-label text-muted">
                Procedures are documented when completing clinical visits.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-body">
                <thead>
                  <tr className="bg-surface-secondary border-b border-border text-label text-muted uppercase">
                    <th className="py-2.5 px-4 font-medium">Procedure</th>
                    <th className="py-2.5 px-4 font-medium">Tooth #</th>
                    <th className="py-2.5 px-4 font-medium">Patient</th>
                    <th className="py-2.5 px-4 font-medium">Treating Dentist</th>
                    <th className="py-2.5 px-4 font-medium">Date</th>
                    <th className="py-2.5 px-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {treatments.map((t) => (
                    <tr key={t.id} className="hover:bg-surface-secondary/40">
                      <td className="py-3 px-4 font-medium text-foreground">
                        {t.procedureName}
                        {t.description && (
                          <span className="block text-label text-muted font-normal">
                            {t.description}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-label">
                        {t.toothNumber ? (
                          <span className="px-2 py-0.5 rounded bg-accent/10 text-accent font-medium">
                            #{t.toothNumber}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <Link
                          href={`/app/patients/${t.visit.patient.id}`}
                          className="font-medium text-foreground hover:text-accent"
                        >
                          {t.visit.patient.fullName}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-muted">
                        {t.visit.dentist.user.name}
                      </td>
                      <td className="py-3 px-4 text-label text-muted whitespace-nowrap">
                        {formatDate(t.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            t.status === 'COMPLETED'
                              ? 'success'
                              : t.status === 'IN_PROGRESS'
                              ? 'accent'
                              : 'neutral'
                          }
                        >
                          {t.status}
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
