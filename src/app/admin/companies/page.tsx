import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireSuperAdmin } from '@/lib/auth/guards';
import { Topbar } from '@/components/layouts/topbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { CreateCompanyModal } from './create-company-modal';

export const dynamic = 'force-dynamic';

interface CompaniesPageProps {
  searchParams: {
    q?: string;
    status?: string;
  };
}

export default async function AdminCompaniesPage({ searchParams }: CompaniesPageProps) {
  const admin = await requireSuperAdmin();
  const query = searchParams.q?.trim().toLowerCase();
  const statusFilter = searchParams.status;

  const whereClause: any = {};
  if (query) {
    whereClause.OR = [
      { name: { contains: query, mode: 'insensitive' } },
      { slug: { contains: query, mode: 'insensitive' } },
      { email: { contains: query, mode: 'insensitive' } },
      { city: { contains: query, mode: 'insensitive' } },
    ];
  }

  if (statusFilter && statusFilter !== 'ALL') {
    whereClause.status = statusFilter;
  }

  const companies = await prisma.company.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    include: {
      memberships: {
        where: { staffType: 'OWNER' },
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
        take: 1,
      },
      invitations: {
        where: { staffType: 'OWNER', status: 'PENDING' },
        take: 1,
      },
      _count: {
        select: {
          memberships: true,
          patients: true,
        },
      },
    },
  });

  return (
    <div>
      <Topbar
        title="Company Management"
        userName={admin.name}
        userEmail={admin.email}
        actions={<CreateCompanyModal />}
      />

      <div className="p-4 lg:p-6 space-y-4 max-w-7xl">
        {/* Search & Filter Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <form method="GET" className="flex items-center gap-2 flex-1 max-w-md">
            <input
              type="search"
              name="q"
              defaultValue={searchParams.q || ''}
              placeholder="Search companies by name, slug, or city..."
              className="w-full text-body bg-surface border border-border rounded px-3 py-1.5 focus:border-accent"
            />
            {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
            <Button type="submit" variant="secondary" size="sm">
              Search
            </Button>
          </form>

          {/* Status filter tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {[
              { label: 'All', value: 'ALL' },
              { label: 'Active', value: 'ACTIVE' },
              { label: 'Pending Setup', value: 'PENDING_SETUP' },
              { label: 'Suspended', value: 'SUSPENDED' },
              { label: 'Archived', value: 'ARCHIVED' },
            ].map((tab) => {
              const isSelected = (statusFilter || 'ALL') === tab.value;
              const href =
                tab.value === 'ALL'
                  ? `/admin/companies${query ? `?q=${encodeURIComponent(query)}` : ''}`
                  : `/admin/companies?status=${tab.value}${query ? `&q=${encodeURIComponent(query)}` : ''}`;

              return (
                <Link
                  key={tab.value}
                  href={href}
                  className={`px-3 py-1 text-label rounded whitespace-nowrap transition-colors ${
                    isSelected
                      ? 'bg-accent text-white font-medium'
                      : 'bg-surface border border-border text-muted hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Companies Table */}
        <div className="bg-surface border border-border rounded overflow-hidden">
          {companies.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-body font-medium text-foreground mb-1">No companies found</p>
              <p className="text-label text-muted">
                {query || statusFilter
                  ? 'Try clearing your search query or filter.'
                  : 'Get started by creating your first dental company.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-body">
                <thead>
                  <tr className="bg-surface-secondary border-b border-border text-label text-muted uppercase">
                    <th className="py-2.5 px-4 font-medium">Company</th>
                    <th className="py-2.5 px-4 font-medium">Owner</th>
                    <th className="py-2.5 px-4 font-medium text-center">Staff</th>
                    <th className="py-2.5 px-4 font-medium">Status</th>
                    <th className="py-2.5 px-4 font-medium">Created Date</th>
                    <th className="py-2.5 px-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {companies.map((comp) => {
                    const owner = comp.memberships[0]?.user;
                    const pendingOwnerInvite = comp.invitations[0];

                    return (
                      <tr key={comp.id} className="hover:bg-surface-secondary/40 transition-colors">
                        <td className="py-3 px-4">
                          <Link
                            href={`/admin/companies/${comp.id}`}
                            className="font-medium text-foreground hover:text-accent block"
                          >
                            {comp.name}
                          </Link>
                          <span className="text-label text-muted font-mono">{comp.slug}</span>
                        </td>
                        <td className="py-3 px-4">
                          {owner ? (
                            <div>
                              <p className="text-body text-foreground">{owner.name}</p>
                              <p className="text-label text-muted">{owner.email}</p>
                            </div>
                          ) : pendingOwnerInvite ? (
                            <div>
                              <p className="text-body text-foreground">Invitation Sent</p>
                              <p className="text-label text-muted font-mono text-[11px]">
                                {pendingOwnerInvite.email}
                              </p>
                            </div>
                          ) : (
                            <span className="text-label text-muted">No owner assigned</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-medium">
                          {comp._count.memberships}
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={
                              comp.status === 'ACTIVE'
                                ? 'success'
                                : comp.status === 'PENDING_SETUP'
                                ? 'warning'
                                : comp.status === 'SUSPENDED'
                                ? 'error'
                                : 'neutral'
                            }
                          >
                            {comp.status === 'PENDING_SETUP' ? 'Pending Setup' : comp.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-muted text-label whitespace-nowrap">
                          {formatDate(comp.createdAt)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link href={`/admin/companies/${comp.id}`}>
                            <Button variant="secondary" size="sm">
                              Manage
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
