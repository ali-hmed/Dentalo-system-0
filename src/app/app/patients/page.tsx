import React from 'react';
import Link from 'next/link';
import { getTenantClient } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { getCompanyForUser } from '@/lib/auth/company';
import { Topbar } from '@/components/layouts/topbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { AlertIcon } from '@/components/icons';
import { RegisterPatientModal } from './register-patient-modal';

export const dynamic = 'force-dynamic';

interface PatientsPageProps {
  searchParams: { q?: string };
}

export default async function PatientsListPage({ searchParams }: PatientsPageProps) {
  const session = await getSession();
  if (!session) return null;

  const companyContext = await getCompanyForUser(session.user.id);
  if (!companyContext) return null;

  const tenantDb = getTenantClient(companyContext.companyId);
  const query = searchParams.q?.trim().toLowerCase();

  const whereClause: any = {};
  if (query) {
    whereClause.OR = [
      { fullName: { contains: query, mode: 'insensitive' } },
      { phone: { contains: query, mode: 'insensitive' } },
      { email: { contains: query, mode: 'insensitive' } },
    ];
  }

  const patients = await tenantDb.patient.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: {
          visits: true,
          appointments: true,
        },
      },
    },
  });

  return (
    <div>
      <Topbar
        title="Patients"
        userName={session.user.name}
        userEmail={session.user.email}
        actions={<RegisterPatientModal companyId={companyContext.companyId} />}
      />

      <div className="p-4 lg:p-6 space-y-4 max-w-7xl">
        {/* Search */}
        <form method="GET" className="max-w-md">
          <input
            type="search"
            name="q"
            defaultValue={searchParams.q || ''}
            placeholder="Search patients by name or phone number..."
            className="w-full text-body bg-surface border border-border rounded px-3 py-1.5 focus:border-accent"
          />
        </form>

        {/* Patients Table */}
        <div className="bg-surface border border-border rounded overflow-hidden">
          {patients.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-body font-medium text-foreground mb-1">No patients found</p>
              <p className="text-label text-muted">
                {query ? 'No patient matched your query.' : 'Register your first clinic patient above.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-body">
                <thead>
                  <tr className="bg-surface-secondary border-b border-border text-label text-muted uppercase">
                    <th className="py-2.5 px-4 font-medium">Patient</th>
                    <th className="py-2.5 px-4 font-medium">Contact</th>
                    <th className="py-2.5 px-4 font-medium">Medical Alerts</th>
                    <th className="py-2.5 px-4 font-medium text-center">Visits</th>
                    <th className="py-2.5 px-4 font-medium">Registered</th>
                    <th className="py-2.5 px-4 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {patients.map((p) => (
                    <tr key={p.id} className="hover:bg-surface-secondary/40">
                      <td className="py-3 px-4">
                        <Link
                          href={`/app/patients/${p.id}`}
                          className="font-medium text-foreground hover:text-accent block"
                        >
                          {p.fullName}
                        </Link>
                        <span className="text-label text-muted">
                          {p.gender || 'Not specified'}{' '}
                          {p.dateOfBirth ? `• Born ${formatDate(p.dateOfBirth)}` : ''}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-body text-foreground font-mono">{p.phone}</p>
                        {p.email && <p className="text-label text-muted">{p.email}</p>}
                      </td>
                      <td className="py-3 px-4">
                        {p.allergies ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-status-error-bg text-status-error text-label font-medium border border-status-error/20">
                            <AlertIcon size={12} className="shrink-0" />
                            <span className="truncate max-w-[200px]">{p.allergies}</span>
                          </div>
                        ) : p.medicalHistory ? (
                          <span className="text-label text-muted truncate max-w-[200px] block">
                            {p.medicalHistory}
                          </span>
                        ) : (
                          <span className="text-label text-muted">None noted</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-medium">
                        {p._count.visits}
                      </td>
                      <td className="py-3 px-4 text-label text-muted whitespace-nowrap">
                        {formatDate(p.createdAt)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link href={`/app/patients/${p.id}`}>
                          <Button variant="secondary" size="sm">
                            View Record
                          </Button>
                        </Link>
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
