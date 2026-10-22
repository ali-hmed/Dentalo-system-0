'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertIcon } from '@/components/icons';
import { setupAccountAction } from '@/lib/actions/auth';

interface SetupFormProps {
  token: string;
  email: string;
  companyName: string;
  roleDescription: string;
}

export function SetupAccountForm({ token, email, companyName, roleDescription }: SetupFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    formData.append('token', token);

    startTransition(async () => {
      const result = await setupAccountAction(formData);
      if (!result.success) {
        setError(result.error);
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
        }
      } else {
        router.push(result.data.redirectUrl);
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 p-3 rounded bg-status-error-bg border border-status-error/20 text-status-error text-body"
        >
          <AlertIcon className="shrink-0 mt-0.5" size={16} />
          <span className="text-[13px]">{error}</span>
        </div>
      )}

      <div>
        <label className="block text-label font-medium text-foreground mb-1">
          Clinic
        </label>
        <div className="text-body text-foreground font-medium p-2.5 rounded bg-surface-secondary border border-border">
          {companyName} ({roleDescription})
        </div>
      </div>

      <Input
        label="Email address"
        name="email"
        type="email"
        value={email}
        disabled
        description="Assigned invitation email"
      />

      <Input
        label="Full name"
        name="name"
        type="text"
        required
        placeholder="Dr. Ahmed Warsame"
        error={fieldErrors.name?.[0]}
        disabled={isPending}
      />

      <Input
        label="Create password"
        name="password"
        type="password"
        required
        description="At least 8 characters with 1 uppercase letter and 1 number"
        error={fieldErrors.password?.[0]}
        disabled={isPending}
      />

      <Input
        label="Confirm password"
        name="confirmPassword"
        type="password"
        required
        error={fieldErrors.confirmPassword?.[0]}
        disabled={isPending}
      />

      <Button
        type="submit"
        variant="primary"
        className="w-full mt-2"
        loading={isPending}
      >
        Complete setup & continue
      </Button>
    </form>
  );
}
