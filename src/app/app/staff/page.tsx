import React from 'react';
import { getTenantClient } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import { getCompanyForUser } from '@/lib/auth/company';
import { Topbar } from '@/components/layouts/topbar';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { InviteStaffModal } from './invite-staff-modal';
import { StaffRowActions } from './staff-row-actions';

export const dynamic = 'force-dynamic';

export default async function StaffPage() {
  const session = await getSession();
  if (!session) return null;

  const companyContext = await getCompanyForUser(session.user.id);
  if (!companyContext) return null;

  const companyId = companyContext.companyId;
  const tenantDb = getTenantClient(companyId);

  const [memberships, pendingInvitations] = await Promise.all([
    tenantDb.companyMembership.findMany({
      where: { companyId },
      include: {
        user: { select: { id: true, name: true, email: true, status: true } },
        staffProfile: true,
      },
      orderBy: { createdAt: 'asc' },
    }),
    tenantDb.invitation.findMany({
      where: { companyId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const isUserOwner = companyContext.membership.staffType === 'OWNER';

  return (
    <div>
      <Topbar
        title="Staff Management"
        userName={session.user.name}
        userEmail={session.user.email}
        actions={isUserOwner ? <InviteStaffModal companyId={companyId} /> : undefined}
      />

      <div className="p-4 lg:p-6 space-y-6 max-w-7xl">
        {/* Active Staff Members */}
        <div className="bg-surface border border-border rounded overflow-hidden">
          <div className="p-4 border-b border-border bg-surface-secondary flex items-center justify-between">
            <h3 className="text-body font-medium text-foreground">Clinic Staff Members</h3>
            <span className="text-label text-muted">
              {memberships.length} team member{memberships.length > 1 ? 's' : ''}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-body">
              <thead>
                <tr className="border-b border-border text-label text-muted uppercase">
                  <th className="py-2.5 px-4 font-medium">Name</th>
                  <th className="py-2.5 px-4 font-medium">Email</th>
                  <th className="py-2.5 px-4 font-medium">Role</th>
                  <th className="py-2.5 px-4 font-medium">Specialization</th>
                  <th className="py-2.5 px-4 font-medium">Status</th>
                  <th className="py-2.5 px-4 font-medium">Joined Date</th>
                  {isUserOwner && <th className="py-2.5 px-4 font-medium text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {memberships.map((m) => (
                  <tr key={m.id} className="hover:bg-surface-secondary/40">
                    <td className="py-3 px-4 font-medium text-foreground">
                      {m.user.name}
                    </td>
                    <td className="py-3 px-4 text-muted">{m.user.email}</td>
                    <td className="py-3 px-4">
                      <span className="text-label font-medium px-2 py-0.5 rounded bg-surface-secondary border border-border">
                        {m.staffType}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-label text-muted">
                      {m.staffProfile?.specialization || 'General Dentistry'}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={m.status === 'ACTIVE' ? 'success' : 'error'}>
                        {m.status}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-label text-muted whitespace-nowrap">
                      {formatDate(m.createdAt)}
                    </td>
                    {isUserOwner && (
                      <td className="py-3 px-4 text-right">
                        <StaffRowActions
                          companyId={companyId}
                          membershipId={m.id}
                          currentStatus={m.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE'}
                          isCurrentUser={m.user.id === session.user.id}
                          isOwner={m.staffType === 'OWNER'}
                        />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Staff Invitations */}
        {pendingInvitations.length > 0 && (
          <div className="bg-surface border border-border rounded overflow-hidden">
            <div className="p-4 border-b border-border bg-surface-secondary">
              <h3 className="text-body font-medium text-foreground">Pending Invitations</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-body">
                <thead>
                  <tr className="border-b border-border text-label text-muted uppercase">
                    <th className="py-2.5 px-4 font-medium">Email</th>
                    <th className="py-2.5 px-4 font-medium">Assigned Role</th>
                    <th className="py-2.5 px-4 font-medium">Sent Date</th>
                    <th className="py-2.5 px-4 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {pendingInvitations.map((inv) => (
                    <tr key={inv.id}>
                      <td className="py-3 px-4 font-mono text-label">{inv.email}</td>
                      <td className="py-3 px-4 text-label font-medium">{inv.staffType}</td>
                      <td className="py-3 px-4 text-label text-muted">{formatDate(inv.createdAt)}</td>
                      <td className="py-3 px-4">
                        <Badge variant="warning">Pending Acceptance</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
