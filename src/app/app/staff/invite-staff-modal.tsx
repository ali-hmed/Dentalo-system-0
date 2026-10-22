'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { CopyButton } from '@/components/ui/copy-button';
import { PlusIcon, AlertIcon, CheckIcon } from '@/components/icons';
import { inviteStaffAction } from '@/lib/actions/staff';

interface InviteStaffModalProps {
  companyId: string;
}

export function InviteStaffModal({ companyId }: InviteStaffModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [successResult, setSuccessResult] = useState<{
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
      const result = await inviteStaffAction(companyId, formData);
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
        <span>Invite staff</span>
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} className="max-w-md">
        <DialogHeader
          title={successResult ? 'Staff Invitation Generated' : 'Invite Staff Member'}
          description={
            successResult
              ? 'An onboarding link was prepared for the staff member.'
              : 'Send an invitation to join this clinic workspace.'
          }
          onClose={() => setOpen(false)}
        />

        {successResult ? (
          <div className="p-6 space-y-4">
            <div className="p-3 rounded bg-status-success-bg border border-status-success/20 text-status-success flex items-start gap-2.5">
              <CheckIcon size={18} className="shrink-0 mt-0.5" />
              <div className="text-body text-[13px]">
                {successResult.emailSent
                  ? 'An invitation email was sent to the staff member.'
                  : 'Invitation created. Email was bypassed, but you can copy the setup link directly below.'}
              </div>
            </div>

            <div>
              <label className="block text-label font-medium text-foreground mb-1">
                Direct Setup Link (Copyable Fallback)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={successResult.inviteUrl}
                  className="flex-1 text-body bg-surface-secondary border border-border rounded px-3 py-2 text-foreground font-mono text-[11px] truncate select-all"
                />
                <CopyButton text={successResult.inviteUrl} label="Copy link" />
              </div>
              <p className="text-label text-muted mt-1.5">
                Send this link directly to the dentist or staff member via WhatsApp or SMS.
              </p>
            </div>

            <div className="flex justify-end pt-3 border-t border-border">
              <Button variant="secondary" onClick={() => setOpen(false)}>
                Done
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

              <Input
                label="Staff Email Address"
                name="email"
                type="email"
                required
                placeholder="colleague@clinic.so"
                error={fieldErrors.email?.[0]}
                disabled={isPending}
              />

              <Select
                label="Predefined Role"
                name="staffType"
                required
                defaultValue="DENTIST"
                options={[
                  { label: 'Dentist (Clinical practitioner)', value: 'DENTIST' },
                  { label: 'Receptionist (Front desk & scheduling)', value: 'RECEPTIONIST' },
                  { label: 'Hygienist (Preventative care)', value: 'HYGIENIST' },
                  { label: 'Dental Assistant (Chairside support)', value: 'ASSISTANT' },
                ]}
                disabled={isPending}
              />

              <Input
                label="Specialization (Optional)"
                name="specialization"
                placeholder="e.g., Orthodontics, Endodontics, Oral Surgery"
                disabled={isPending}
              />

              <Input
                label="License / Registration Number (Optional)"
                name="licenseNumber"
                placeholder="e.g., SOM-DENT-8492"
                disabled={isPending}
              />
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
