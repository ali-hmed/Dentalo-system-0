import React from 'react';
import { prisma } from '@/lib/db';
import { requireSuperAdmin } from '@/lib/auth/guards';
import { Topbar } from '@/components/layouts/topbar';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { UserRowActions } from './user-row-actions';

export const dynamic = 'force-dynamic';

interface UsersPageProps {
  searchParams: { q?: string };
}

export default async function AdminUsersPage({ searchParams }: UsersPageProps) {
  const admin = await requireSuperAdmin();
  const query = searchParams.q?.trim().toLowerCase();

  const whereClause: any = {};
  if (query) {
    whereClause.OR = [
      { name: { contains: query, mode: 'insensitive' } },
      { email: { contains: query, mode: 'insensitive' } },
    ];
  }

  const users = await prisma.user.findMany({
    where: whereClause,
    orderBy: { createdAt: 'desc' },
    include: {
      memberships: {
        include: {
          company: { select: { id: true, name: true, slug: true } },
        },
      },
    },
  });

  return (
    <div>
      <Topbar
        title="Global User Management"
        userName={admin.name}
        userEmail={admin.email}
      />

      <div className="p-4 lg:p-6 space-y-4 max-w-7xl">
        {/* Search bar */}
        <form method="GET" className="max-w-md">
          <input
            type="search"
            name="q"
            defaultValue={searchParams.q || ''}
            placeholder="Search users by name or email..."
            className="w-full text-body bg-surface border border-border rounded px-3 py-1.5 focus:border-accent"
          />
        </form>

        {/* Users Table */}
        <div className="bg-surface border border-border rounded overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-body">
              <thead>
                <tr className="bg-surface-secondary border-b border-border text-label text-muted uppercase">
                  <th className="py-2.5 px-4 font-medium">User</th>
                  <th className="py-2.5 px-4 font-medium">Platform Role</th>
                  <th className="py-2.5 px-4 font-medium">Clinic Memberships</th>
                  <th className="py-2.5 px-4 font-medium">Status</th>
                  <th className="py-2.5 px-4 font-medium">Joined Date</th>
                  <th className="py-2.5 px-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-surface-secondary/40">
                    <td className="py-3 px-4">
                      <p className="font-medium text-foreground">{u.name}</p>
                      <p className="text-label text-muted">{u.email}</p>
                    </td>
                    <td className="py-3 px-4">
                      <Badge
                        variant={u.role === 'SUPER_ADMIN' ? 'accent' : 'neutral'}
                      >
                        {u.role === 'SUPER_ADMIN'
                          ? 'Super Admin'
                          : u.role === 'COMPANY_OWNER'
                          ? 'Company Owner'
                          : 'Staff'}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      {u.memberships.length === 0 ? (
                        <span className="text-label text-muted">None</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {u.memberships.map((m) => (
                            <span
                              key={m.id}
                              className="text-label px-2 py-0.5 rounded bg-surface-secondary border border-border"
                            >
                              {m.company.name} ({m.staffType})
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={u.status === 'ACTIVE' ? 'success' : 'error'}>
                        {u.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-label text-muted whitespace-nowrap">
                      {formatDate(u.createdAt)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <UserRowActions
                        userId={u.id}
                        currentStatus={u.status === 'ACTIVE' ? 'ACTIVE' : 'SUSPENDED'}
                        isCurrentUser={u.id === admin.id}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
