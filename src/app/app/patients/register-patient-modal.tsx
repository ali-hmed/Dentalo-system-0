'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { PlusIcon, AlertIcon } from '@/components/icons';
import { createPatientAction } from '@/lib/actions/patient';

interface RegisterPatientModalProps {
  companyId: string;
}

export function RegisterPatientModal({ companyId }: RegisterPatientModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  function resetState() {
    setError(null);
    setFieldErrors({});
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await createPatientAction(companyId, formData);
      if (!result.success) {
        setError(result.error);
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
        }
      } else {
        setOpen(false);
        router.push(`/app/patients/${result.data.patientId}`);
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
        <span>Register patient</span>
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} className="max-w-lg">
        <DialogHeader
          title="Register New Patient"
          description="Enter patient demographics and clinical history. Accidental duplicate records will be prevented."
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
                required
                placeholder="Amina Hassan"
                error={fieldErrors.fullName?.[0]}
                disabled={isPending}
              />

              <Input
                label="Phone Number"
                name="phone"
                required
                placeholder="+252 61 7000000"
                description="Unique identifier per patient"
                error={fieldErrors.phone?.[0]}
                disabled={isPending}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Email (Optional)"
                name="email"
                type="email"
                placeholder="patient@example.com"
                error={fieldErrors.email?.[0]}
                disabled={isPending}
              />

              <Input
                label="Date of Birth"
                name="dateOfBirth"
                type="date"
                error={fieldErrors.dateOfBirth?.[0]}
                disabled={isPending}
              />

              <Select
                label="Gender"
                name="gender"
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
              <p className="text-label font-medium text-muted uppercase tracking-wider">
                Clinical Alerts & Medical History
              </p>

              <Input
                label="Known Allergies (Penicillin, Latex, Local Anesthetics, etc.)"
                name="allergies"
                placeholder="e.g., Penicillin allergy, severe reaction"
                description="Highlighted prominently on schedule and clinical charts"
                disabled={isPending}
              />

              <Textarea
                label="Past Medical History / Chronic Conditions"
                name="medicalHistory"
                rows={2}
                placeholder="e.g., Hypertension, diabetes, pregnant, bleeding disorders..."
                disabled={isPending}
              />

              <Textarea
                label="Additional Notes"
                name="notes"
                rows={2}
                placeholder="Patient preferences, emergency contact..."
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
              Register Patient
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}
