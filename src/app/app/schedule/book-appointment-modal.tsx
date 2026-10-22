'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PlusIcon, AlertIcon } from '@/components/icons';
import { createAppointmentAction } from '@/lib/actions/appointment';

interface PatientOption {
  id: string;
  name: string;
  phone: string;
}

interface DentistOption {
  id: string;
  name: string;
}

interface BookAppointmentModalProps {
  companyId: string;
  selectedDate: string; // YYYY-MM-DD
  patients: PatientOption[];
  dentists: DentistOption[];
}

export function BookAppointmentModal({
  companyId,
  selectedDate,
  patients,
  dentists,
}: BookAppointmentModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Default to 09:00 - 09:30
  const [startTime, setStartTime] = useState('09:00');
  const [durationMinutes, setDurationMinutes] = useState(30);

  function calculateEndTime(start: string, duration: number): string {
    const [h, m] = start.split(':').map(Number);
    const date = new Date(2000, 0, 1, h, m + duration);
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = event.currentTarget;
    const formData = new FormData(form);

    const dateVal = formData.get('date')?.toString() || selectedDate;
    const sTime = formData.get('startTimeOnly')?.toString() || startTime;
    const eTime = calculateEndTime(sTime, durationMinutes);

    // Stored in ISO string
    formData.set('date', dateVal);
    formData.set('startTime', `${dateVal}T${sTime}:00`);
    formData.set('endTime', `${dateVal}T${eTime}:00`);

    startTransition(async () => {
      const result = await createAppointmentAction(companyId, formData);
      if (!result.success) {
        setError(result.error);
      } else {
        setOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <>
      <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
        <PlusIcon size={16} />
        <span>Book appointment</span>
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} className="max-w-md">
        <DialogHeader
          title="Book New Appointment"
          description="Schedule a patient appointment with conflict detection."
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

            <Select
              label="Select Patient"
              name="patientId"
              required
              options={[
                { label: 'Select a patient', value: '' },
                ...patients.map((p) => ({
                  label: `${p.name} (${p.phone})`,
                  value: p.id,
                })),
              ]}
              disabled={isPending}
            />

            <Select
              label="Treating Dentist"
              name="dentistId"
              required
              options={[
                { label: 'Select a dentist', value: '' },
                ...dentists.map((d) => ({
                  label: d.name,
                  value: d.id,
                })),
              ]}
              disabled={isPending}
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Date"
                name="date"
                type="date"
                defaultValue={selectedDate}
                required
                disabled={isPending}
              />

              <Select
                label="Appointment Type"
                name="type"
                defaultValue="CHECKUP"
                options={[
                  { label: 'Checkup & Consultation', value: 'CHECKUP' },
                  { label: 'Treatment / Procedure', value: 'TREATMENT' },
                  { label: 'Emergency / Toothache', value: 'EMERGENCY' },
                  { label: 'Follow-up', value: 'FOLLOW_UP' },
                ]}
                disabled={isPending}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Start Time"
                name="startTimeOnly"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                disabled={isPending}
              />

              <Select
                label="Duration"
                value={durationMinutes.toString()}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                options={[
                  { label: '15 minutes', value: '15' },
                  { label: '30 minutes', value: '30' },
                  { label: '45 minutes', value: '45' },
                  { label: '60 minutes (1 hour)', value: '60' },
                  { label: '90 minutes', value: '90' },
                ]}
                disabled={isPending}
              />
            </div>

            <p className="text-label text-muted">
              Scheduled slot: {startTime} &ndash; {calculateEndTime(startTime, durationMinutes)} (Africa/Mogadishu)
            </p>

            <Textarea
              label="Appointment Notes (Optional)"
              name="notes"
              rows={2}
              placeholder="e.g., Patient requested morning slot, sensitive molar"
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
              Confirm Booking
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}
