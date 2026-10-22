'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertIcon } from '@/components/icons';
import { loginAction } from '@/lib/actions/auth';

export function LoginForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await loginAction(formData);
      if (!result.success) {
        setError(result.error);
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
        }
      } else {
        // Redirection target is determined by role on server side
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

      <Input
        label="Email address"
        name="email"
        type="email"
        autoComplete="email"
        required
        placeholder="dentist@clinic.so"
        error={fieldErrors.email?.[0]}
        disabled={isPending}
      />

      <Input
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        error={fieldErrors.password?.[0]}
        disabled={isPending}
      />

      <Button
        type="submit"
        variant="primary"
        className="w-full mt-2"
        loading={isPending}
      >
        Sign in
      </Button>
    </form>
  );
}
