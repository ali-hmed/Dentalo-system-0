'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { PlusIcon, AlertIcon, XIcon } from '@/components/icons';
import { createVisitAction } from '@/lib/actions/visit';

interface DentistOption {
  id: string;
  name: string;
}

interface NewVisitModalProps {
  companyId: string;
  patientId: string;
  dentists: DentistOption[];
}

interface TreatmentItem {
  procedureName: string;
  toothNumber: string;
  description: string;
  notes: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'PLANNED';
}

export function NewVisitModal({ companyId, patientId, dentists }: NewVisitModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Dynamic treatment records
  const [treatments, setTreatments] = useState<TreatmentItem[]>([
    { procedureName: '', toothNumber: '', description: '', notes: '', status: 'COMPLETED' },
  ]);

  function addTreatmentRow() {
    setTreatments((prev) => [
      ...prev,
      { procedureName: '', toothNumber: '', description: '', notes: '', status: 'COMPLETED' },
    ]);
  }

  function removeTreatmentRow(index: number) {
    setTreatments((prev) => prev.filter((_, i) => i !== index));
  }

  function updateTreatment(index: number, field: keyof TreatmentItem, value: any) {
    setTreatments((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    formData.append('patientId', patientId);

    // Filter valid treatment records
    const validTreatments = treatments.filter((t) => t.procedureName.trim().length > 0);
    formData.append('treatmentRecordsJson', JSON.stringify(validTreatments));

    startTransition(async () => {
      const result = await createVisitAction(companyId, formData);
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
        <span>Record Visit</span>
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} className="max-w-2xl">
        <DialogHeader
          title="Record Clinical Visit & Procedures"
          description="Document clinical examination, diagnoses, tooth treatments, and notes."
          onClose={() => setOpen(false)}
        />

        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
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
              <Select
                label="Treating Dentist"
                name="dentistId"
                required
                options={[
                  { label: 'Select dentist', value: '' },
                  ...dentists.map((d) => ({ label: d.name, value: d.id })),
                ]}
                disabled={isPending}
              />

              <Input
                label="Visit Date & Time"
                name="date"
                type="datetime-local"
                defaultValue={new Date().toISOString().slice(0, 16)}
                required
                disabled={isPending}
              />
            </div>

            <Input
              label="Chief Complaint"
              name="chiefComplaint"
              placeholder="e.g., Severe toothache in lower right quadrant since 2 days"
              disabled={isPending}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Textarea
                label="Clinical Examination"
                name="examination"
                rows={2}
                placeholder="e.g., Deep occlusal caries on tooth #46, sensitive to percussion"
                disabled={isPending}
              />

              <Textarea
                label="Diagnosis"
                name="diagnosis"
                rows={2}
                placeholder="e.g., Acute irreversible pulpitis tooth #46"
                disabled={isPending}
              />
            </div>

            {/* Treatment procedures list */}
            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-label font-medium text-foreground uppercase tracking-wider">
                  Procedures & Treatments
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={addTreatmentRow}
                  disabled={isPending}
                >
                  <PlusIcon size={14} />
                  <span>Add procedure</span>
                </Button>
              </div>

              <div className="space-y-3">
                {treatments.map((t, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded bg-surface-secondary border border-border space-y-2.5 relative"
                  >
                    {treatments.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTreatmentRow(idx)}
                        className="absolute top-2 right-2 p-1 text-muted hover:text-status-error"
                      >
                        <XIcon size={14} />
                      </button>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="sm:col-span-2">
                        <Input
                          label="Procedure Name"
                          value={t.procedureName}
                          onChange={(e) =>
                            updateTreatment(idx, 'procedureName', e.target.value)
                          }
                          placeholder="e.g., Composite Restoration / Extraction"
                          required
                          disabled={isPending}
                        />
                      </div>
                      <div>
                        <Input
                          label="Tooth # (Optional)"
                          value={t.toothNumber}
                          onChange={(e) =>
                            updateTreatment(idx, 'toothNumber', e.target.value)
                          }
                          placeholder="e.g., 46, 11, UR6"
                          disabled={isPending}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input
                        label="Description / Material"
                        value={t.description}
                        onChange={(e) =>
                          updateTreatment(idx, 'description', e.target.value)
                        }
                        placeholder="e.g., 2-surface composite resin, shade A2"
                        disabled={isPending}
                      />
                      <Select
                        label="Status"
                        value={t.status}
                        onChange={(e) =>
                          updateTreatment(idx, 'status', e.target.value as any)
                        }
                        options={[
                          { label: 'Completed', value: 'COMPLETED' },
                          { label: 'In Progress', value: 'IN_PROGRESS' },
                          { label: 'Planned (Next visit)', value: 'PLANNED' },
                        ]}
                        disabled={isPending}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Textarea
                label="Clinical Progress Notes"
                name="notes"
                rows={2}
                placeholder="Post-operative observations..."
                disabled={isPending}
              />

              <Textarea
                label="Follow-Up Instructions"
                name="followUpInstructions"
                rows={2}
                placeholder="e.g., Prescribed Amoxicillin 500mg, review in 7 days"
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
              Save Visit & Treatments
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}
