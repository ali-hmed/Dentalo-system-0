'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CopyButton } from '@/components/ui/copy-button';
import { PlusIcon, AlertIcon, CheckIcon } from '@/components/icons';
import { createCompanyAction } from '@/lib/actions/admin';

export function CreateCompanyModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [successResult, setSuccessResult] = useState<{
    companyId: string;
    inviteUrl: string;
    emailSent: boolean;
  } | null>(null);

  function resetState() {
    setError(null);
    setFieldErrors({});
    setSuccessResult(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await createCompanyAction(formData);
      if (!result.success) {
        setError(result.error);
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
        }
      } else {
        setSuccessResult(result.data);
        router.refresh();
      }
    });
  }

  return (
    <>
      <Button
        variant="primary"
        size="sm"
        onClick={() => {
          resetState();
          setOpen(true);
        }}
      >
        <PlusIcon size={16} />
        <span>Create company</span>
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} className="max-w-lg">
        <DialogHeader
          title={successResult ? 'Company Created Successfully' : 'Create New Dental Company'}
          description={
            successResult
              ? 'The clinic has been registered and an owner invitation was generated.'
              : 'Add a new dental company and invite the initial clinic owner.'
          }
          onClose={() => setOpen(false)}
        />

        {successResult ? (
          <div className="p-6 space-y-4">
            <div className="p-3 rounded bg-status-success-bg border border-status-success/20 text-status-success flex items-start gap-2.5">
              <CheckIcon size={18} className="shrink-0 mt-0.5" />
              <div className="text-body text-[13px]">
                {successResult.emailSent
                  ? 'An onboarding invitation was dispatched to the clinic owner.'
                  : 'Clinic registered. Email service was offline, but you can copy the invitation link directly below.'}
              </div>
            </div>

            <div>
              <label className="block text-label font-medium text-foreground mb-1">
                Owner Setup & Invitation Link (Fallback)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={successResult.inviteUrl}
                  className="flex-1 text-body bg-surface-secondary border border-border rounded px-3 py-2 text-foreground font-mono text-[12px] truncate select-all"
                />
                <CopyButton text={successResult.inviteUrl} label="Copy link" />
              </div>
              <p className="text-label text-muted mt-1.5">
                Share this link directly via WhatsApp, SMS, or secure messaging if email is delayed.
              </p>
            </div>

            <div className="flex justify-end pt-4 border-t border-border">
              <Button
                variant="primary"
                onClick={() => {
                  setOpen(false);
                  router.push(`/admin/companies/${successResult.companyId}`);
                }}
              >
                Go to Company Details
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogBody className="space-y-4">
              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 p-3 rounded bg-status-error-bg border border-status-error/20 text-status-error text-body"
                >
                  <AlertIcon className="shrink-0 mt-0.5" size={16} />
                  <span className="text-[13px]">{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Company Name"
                  name="name"
                  required
                  placeholder="Mogadishu Dental Care"
                  error={fieldErrors.name?.[0]}
                  disabled={isPending}
                />

                <Input
                  label="URL Slug"
                  name="slug"
                  required
                  placeholder="mogadishu-dental"
                  description="Unique identifier"
                  error={fieldErrors.slug?.[0]}
                  disabled={isPending}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Company Email"
                  name="email"
                  type="email"
                  required
                  placeholder="info@clinic.so"
                  error={fieldErrors.email?.[0]}
                  disabled={isPending}
                />

                <Input
                  label="Company Phone"
                  name="phone"
                  required
                  placeholder="+252 61 5000000"
                  error={fieldErrors.phone?.[0]}
                  disabled={isPending}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Address"
                  name="address"
                  required
                  placeholder="Maka Al Mukarama St"
                  error={fieldErrors.address?.[0]}
                  disabled={isPending}
                />

                <Input
                  label="City"
                  name="city"
                  required
                  placeholder="Mogadishu"
                  error={fieldErrors.city?.[0]}
                  disabled={isPending}
                />
              </div>

              <div className="pt-2 border-t border-border">
                <p className="text-label font-medium text-muted uppercase tracking-wider mb-3">
                  Initial Owner Account
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Owner Full Name"
                    name="ownerName"
                    required
                    placeholder="Dr. Mohamed Ali"
                    error={fieldErrors.ownerName?.[0]}
                    disabled={isPending}
                  />

                  <Input
                    label="Owner Email Address"
                    name="ownerEmail"
                    type="email"
                    required
                    placeholder="owner@clinic.so"
                    description="Invitation will be sent here"
                    error={fieldErrors.ownerEmail?.[0]}
                    disabled={isPending}
                  />
                </div>
              </div>
            </DialogBody>

            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={isPending}>
                Create & Send Invitation
              </Button>
            </DialogFooter>
          </form>
        )}
      </Dialog>
    </>
  );
}
