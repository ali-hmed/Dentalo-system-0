'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { AlertIcon } from '@/components/icons';
import { updatePatientAction } from '@/lib/actions/patient';

interface EditPatientModalProps {
  companyId: string;
  patient: {
    id: string;
    fullName: string;
    phone: string;
    email?: string | null;
    dateOfBirth?: Date | null;
    gender?: string | null;
    medicalHistory?: string | null;
    allergies?: string | null;
    notes?: string | null;
  };
}

export function EditPatientModal({ companyId, patient }: EditPatientModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await updatePatientAction(companyId, patient.id, formData);
      if (!result.success) {
        setError(result.error);
      } else {
        setOpen(false);
        router.refresh();
      }
    });
  }

  const dobStr = patient.dateOfBirth
    ? new Date(patient.dateOfBirth).toISOString().slice(0, 10)
    : '';

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Edit Patient
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} className="max-w-lg">
        <DialogHeader
          title="Edit Patient Information"
          description="Update demographics, contact details, and medical alerts."
          onClose={() => setOpen(false)}
        />

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
                label="Full Name"
                name="fullName"
                defaultValue={patient.fullName}
                required
                disabled={isPending}
              />

              <Input
                label="Phone Number"
                name="phone"
                defaultValue={patient.phone}
                required
                disabled={isPending}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Email"
                name="email"
                type="email"
                defaultValue={patient.email || ''}
                disabled={isPending}
              />

              <Input
                label="Date of Birth"
                name="dateOfBirth"
                type="date"
                defaultValue={dobStr}
                disabled={isPending}
              />

              <Select
                label="Gender"
                name="gender"
                defaultValue={patient.gender || ''}
                options={[
                  { label: 'Select gender', value: '' },
                  { label: 'Female', value: 'FEMALE' },
                  { label: 'Male', value: 'MALE' },
                  { label: 'Other', value: 'OTHER' },
                ]}
                disabled={isPending}
              />
            </div>

            <div className="pt-2 border-t border-border space-y-3">
              <Input
                label="Known Allergies"
                name="allergies"
                defaultValue={patient.allergies || ''}
                disabled={isPending}
              />

              <Textarea
                label="Medical History & Chronic Conditions"
                name="medicalHistory"
                rows={2}
                defaultValue={patient.medicalHistory || ''}
                disabled={isPending}
              />

              <Textarea
                label="Notes"
                name="notes"
                rows={2}
                defaultValue={patient.notes || ''}
                disabled={isPending}
              />
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
              Save Updates
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}
