'use client';

import React, { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toggleUserStatusAction } from '@/lib/actions/admin';

interface UserRowActionsProps {
  userId: string;
  currentStatus: 'ACTIVE' | 'SUSPENDED';
  isCurrentUser: boolean;
}

export function UserRowActions({ userId, currentStatus, isCurrentUser }: UserRowActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (isCurrentUser) {
    return <span className="text-label text-muted">Current User</span>;
  }

  function handleToggle() {
    const nextStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    startTransition(async () => {
      const res = await toggleUserStatusAction(userId, nextStatus);
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
      {currentStatus === 'ACTIVE' ? 'Suspend' : 'Reactivate'}
    </Button>
  );
}
