'use client';

import React, { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toggleStaffStatusAction } from '@/lib/actions/staff';

interface StaffRowActionsProps {
  companyId: string;
  membershipId: string;
  currentStatus: 'ACTIVE' | 'INACTIVE';
  isCurrentUser: boolean;
  isOwner: boolean;
}

export function StaffRowActions({
  companyId,
  membershipId,
  currentStatus,
  isCurrentUser,
  isOwner,
}: StaffRowActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (isCurrentUser) {
    return <span className="text-label text-muted">You</span>;
  }

  if (isOwner) {
    return <span className="text-label text-muted">Clinic Owner</span>;
  }

  function handleToggle() {
    const nextStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    startTransition(async () => {
      const res = await toggleStaffStatusAction(companyId, membershipId, nextStatus);
      if (res.success) {
        router.refresh();
      }
    });
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={handleToggle}
      loading={isPending}
      className={currentStatus === 'ACTIVE' ? 'text-status-warning hover:text-status-error' : 'text-status-success'}
    >
      {currentStatus === 'ACTIVE' ? 'Deactivate' : 'Reactivate'}
    </Button>
  );
}
