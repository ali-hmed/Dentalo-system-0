'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CopyButton } from '@/components/ui/copy-button';
import { AlertIcon, ShieldIcon, CheckIcon } from '@/components/icons';
import {
  updateCompanyStatusAction,
  updateCompanyDetailsAction,
  requestSupportAccessAction,
  revokeSupportAccessAction,
  resendInvitationAction,
} from '@/lib/actions/admin';

interface CompanyActionsProps {
  company: {
    id: string;
    name: string;
    slug: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    status: string;
  };
  activeSupportSession?: {
    id: string;
    reason: string;
    expiresAt: Date;
  } | null;
  pendingOwnerInvitation?: {
    id: string;
    email: string;
    token: string;
  } | null;
}

export function CompanyActions({
  company,
  activeSupportSession,
  pendingOwnerInvitation,
}: CompanyActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Modals state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [supportModalOpen, setSupportModalOpen] = useState(false);
  const [statusConfirm, setStatusConfirm] = useState<'ACTIVE' | 'SUSPENDED' | 'ARCHIVED' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Invitation resend state
  const [resentInviteUrl, setResentInviteUrl] = useState<string | null>(null);

  // Handle status update
  function handleStatusChange(status: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED') {
    startTransition(async () => {
      const res = await updateCompanyStatusAction(company.id, status);
      if (!res.success) {
        setActionError(res.error);
      } else {
        setStatusConfirm(null);
        router.refresh();
      }
    });
  }

  // Handle support access request
  async function handleSupportRequest(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setActionError(null);
    const formData = new FormData(e.currentTarget);
    formData.append('companyId', company.id);

    startTransition(async () => {
      const res = await requestSupportAccessAction(formData);
      if (!res.success) {
        setActionError(res.error);
      } else {
        setSupportModalOpen(false);
        router.refresh();
      }
    });
  }

  // Handle support session revoke
  function handleRevokeSupport(sessionId: string) {
    startTransition(async () => {
      const res = await revokeSupportAccessAction(sessionId);
      if (!res.success) {
        setActionError(res.error);
      } else {
        router.refresh();
      }
    });
  }

  // Handle resend invite
  function handleResendInvite(inviteId: string) {
    startTransition(async () => {
      const res = await resendInvitationAction(inviteId);
      if (!res.success) {
        setActionError(res.error);
      } else {
        setResentInviteUrl(res.data.inviteUrl);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-4">
      {actionError && (
        <div className="p-3 rounded bg-status-error-bg border border-status-error/20 text-status-error text-body flex items-start gap-2">
          <AlertIcon size={16} className="shrink-0 mt-0.5" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Break-Glass Support Access Banner */}
      {activeSupportSession ? (
        <div className="p-4 rounded bg-accent/10 border border-accent/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <ShieldIcon className="text-accent shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-body font-medium text-foreground">
                Active Break-Glass Support Session
              </p>
              <p className="text-label text-muted">
                Reason: {activeSupportSession.reason} &bull; Expires at{' '}
                {new Date(activeSupportSession.expiresAt).toLocaleTimeString()}
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleRevokeSupport(activeSupportSession.id)}
            loading={isPending}
          >
            End Support Session
          </Button>
        </div>
      ) : (
        <div className="p-4 rounded bg-surface border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <ShieldIcon className="text-muted shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-body font-medium text-foreground">
                Clinical Data Boundary
              </p>
              <p className="text-label text-muted">
                Super Admins have no default access to patients, visits, or treatments. An explicit audited support session is required.
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setActionError(null);
              setSupportModalOpen(true);
            }}
          >
            Request Support Access
          </Button>
        </div>
      )}

      {/* Pending Invitation Alert */}
      {pendingOwnerInvitation && (
        <div className="p-4 rounded bg-surface border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-body font-medium text-foreground">
              Pending Owner Invitation
            </p>
            <p className="text-label text-muted">
              Owner invitation was sent to {pendingOwnerInvitation.email}.
            </p>
            {resentInviteUrl && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={resentInviteUrl}
                  className="text-body bg-surface-secondary border border-border rounded px-2 py-1 text-foreground font-mono text-[11px] truncate"
                />
                <CopyButton text={resentInviteUrl} label="Copy link" />
              </div>
            )}
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleResendInvite(pendingOwnerInvitation.id)}
            loading={isPending}
          >
            Resend & Copy Link
          </Button>
        </div>
      )}

      {/* Primary Actions Toolbar */}
      <div className="flex flex-wrap items-center gap-2 pt-2">
        <Button variant="secondary" size="sm" onClick={() => setEditModalOpen(true)}>
          Edit Details
        </Button>

        {company.status === 'PENDING_SETUP' && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleStatusChange('ACTIVE')}
            loading={isPending}
          >
            Activate Clinic
          </Button>
        )}

        {company.status === 'ACTIVE' && (
          <Button
            variant="secondary"
            size="sm"
            className="text-status-warning hover:text-status-warning"
            onClick={() => setStatusConfirm('SUSPENDED')}
          >
            Suspend Clinic
          </Button>
        )}

        {company.status === 'SUSPENDED' && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleStatusChange('ACTIVE')}
            loading={isPending}
          >
            Reactivate Clinic
          </Button>
        )}

        {company.status !== 'ARCHIVED' && (
          <Button
            variant="danger"
            size="sm"
            onClick={() => setStatusConfirm('ARCHIVED')}
          >
            Archive
          </Button>
        )}
      </div>

      {/* Support Access Request Dialog */}
      <Dialog open={supportModalOpen} onClose={() => setSupportModalOpen(false)} className="max-w-md">
        <DialogHeader
          title="Request Break-Glass Support Access"
          description="Access to sensitive clinical tables requires an explicit business justification and is strictly audited."
          onClose={() => setSupportModalOpen(false)}
        />
        <form onSubmit={handleSupportRequest}>
          <DialogBody className="space-y-4">
            <div className="p-3 rounded bg-status-warning-bg border border-status-warning/20 text-status-warning text-label">
              This action is logged with CRITICAL severity. The clinic owner will have visibility of this session in their audit log.
            </div>

            <Textarea
              label="Business Reason / Justification"
              name="reason"
              required
              rows={3}
              placeholder="e.g., Investigating appointment synchronization defect per clinic owner request..."
              description="Minimum 10 characters describing why access is necessary."
            />

            <Input
              label="Support Ticket Reference (Optional)"
              name="ticketReference"
              placeholder="e.g., TICKET-4029"
            />
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setSupportModalOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={isPending}>
              Authorize Support Session (30 min)
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Edit Details Dialog */}
      <Dialog open={editModalOpen} onClose={() => setEditModalOpen(false)} className="max-w-md">
        <DialogHeader
          title="Edit Company Details"
          description="Update clinic profile and contact information."
          onClose={() => setEditModalOpen(false)}
        />
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            startTransition(async () => {
              const res = await updateCompanyDetailsAction(company.id, formData);
              if (!res.success) {
                setActionError(res.error);
              } else {
                setEditModalOpen(false);
                router.refresh();
              }
            });
          }}
        >
          <DialogBody className="space-y-4">
            <Input label="Company Name" name="name" defaultValue={company.name} required />
            <Input label="Email" name="email" type="email" defaultValue={company.email} required />
            <Input label="Phone" name="phone" defaultValue={company.phone} required />
            <Input label="Address" name="address" defaultValue={company.address} required />
            <Input label="City" name="city" defaultValue={company.city} required />
          </DialogBody>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setEditModalOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={isPending}>
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </Dialog>

      {/* Status Confirmation Dialog */}
      <Dialog open={!!statusConfirm} onClose={() => setStatusConfirm(null)} className="max-w-md">
        <DialogHeader
          title={statusConfirm === 'SUSPENDED' ? 'Suspend Dental Company?' : 'Archive Company?'}
          description={
            statusConfirm === 'SUSPENDED'
              ? 'Suspension immediately terminates all active staff sessions and blocks workspace access until reactivated.'
              : 'Archiving marks this company as permanently retired. Clinical data will be preserved but inaccessible.'
          }
          onClose={() => setStatusConfirm(null)}
        />
        <DialogFooter>
          <Button variant="secondary" onClick={() => setStatusConfirm(null)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant={statusConfirm === 'ARCHIVED' ? 'danger' : 'primary'}
            onClick={() => statusConfirm && handleStatusChange(statusConfirm)}
            loading={isPending}
          >
            Confirm {statusConfirm === 'SUSPENDED' ? 'Suspension' : 'Archival'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
