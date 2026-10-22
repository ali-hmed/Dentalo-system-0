'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { formatTime } from '@/lib/utils';
import { AlertIcon, ToothIcon, XIcon, CheckIcon } from '@/components/icons';
import { updateAppointmentStatusAction } from '@/lib/actions/appointment';
import type { AppointmentStatus } from '@/lib/types';

interface AppointmentItem {
  id: string;
  dentistId: string;
  dentistName: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  patientAllergies?: string | null;
  patientMedicalHistory?: string | null;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  type: string;
  notes?: string | null;
  version: number;
}

interface ScheduleViewProps {
  companyId: string;
  selectedDate: string;
  appointments: AppointmentItem[];
  dentists: { id: string; name: string }[];
}

export function ScheduleView({
  companyId,
  selectedDate,
  appointments,
  dentists,
}: ScheduleViewProps) {
  const router = useRouter();
  const [selectedAppt, setSelectedAppt] = useState<AppointmentItem | null>(
    appointments[0] || null
  );
  const [isPending, startTransition] = useTransition();

  // Cancel dialog state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [statusError, setStatusError] = useState<string | null>(null);

  function handleStatusUpdate(newStatus: AppointmentStatus, reason?: string) {
    if (!selectedAppt) return;
    setStatusError(null);

    startTransition(async () => {
      const res = await updateAppointmentStatusAction(
        companyId,
        selectedAppt.id,
        newStatus,
        selectedAppt.version,
        reason
      );
      if (!res.success) {
        setStatusError(res.error);
      } else {
        setCancelModalOpen(false);
        setCancelReason('');
        router.refresh();
      }
    });
  }

  // Filter appointments for active selected appointment
  const currentSelected = appointments.find((a) => a.id === selectedAppt?.id) || selectedAppt;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
      {/* Left 2 Cols: Dentist Columns or List View */}
      <div className="lg:col-span-2 space-y-6">
        {statusError && (
          <div className="p-3 rounded bg-status-error-bg border border-status-error/20 text-status-error text-body flex items-start gap-2">
            <AlertIcon size={16} className="shrink-0 mt-0.5" />
            <span>{statusError}</span>
          </div>
        )}

        {appointments.length === 0 ? (
          <div className="bg-surface border border-border rounded p-12 text-center">
            <ToothIcon className="mx-auto text-muted mb-2" size={24} />
            <p className="text-body font-medium text-foreground mb-1">
              No appointments scheduled for {selectedDate}
            </p>
            <p className="text-label text-muted">
              Use the &ldquo;Book appointment&rdquo; button above to schedule a patient slot.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {dentists.map((dentist) => {
              const dentistAppts = appointments.filter((a) => a.dentistId === dentist.id);
              if (dentistAppts.length === 0) return null;

              return (
                <div key={dentist.id} className="bg-surface border border-border rounded p-4">
                  <div className="flex items-center justify-between border-b border-border pb-2.5 mb-3">
                    <h3 className="text-body font-medium text-foreground">
                      {dentist.name}
                    </h3>
                    <span className="text-label text-muted">
                      {dentistAppts.length} appointment{dentistAppts.length > 1 ? 's' : ''}
                    </span>
                  </div>

                  <div className="space-y-2">
                    {dentistAppts.map((appt) => {
                      const isSelected = currentSelected?.id === appt.id;
                      return (
                        <div
                          key={appt.id}
                          onClick={() => setSelectedAppt(appt)}
                          className={`p-3 rounded border cursor-pointer transition-all ${
                            isSelected
                              ? 'border-accent bg-accent/5 ring-1 ring-accent'
                              : 'border-border bg-surface-secondary/40 hover:bg-surface-secondary'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-label text-foreground font-medium">
                                {formatTime(appt.startTime)} - {formatTime(appt.endTime)}
                              </span>
                              <Badge
                                variant={
                                  appt.status === 'COMPLETED'
                                    ? 'success'
                                    : appt.status === 'ARRIVED'
                                    ? 'info'
                                    : appt.status === 'IN_PROGRESS'
                                    ? 'accent'
                                    : appt.status === 'CANCELLED'
                                    ? 'error'
                                    : appt.status === 'NO_SHOW'
                                    ? 'neutral'
                                    : 'warning'
                                }
                              >
                                {appt.status}
                              </Badge>
                            </div>

                            <span className="text-label text-muted">{appt.type}</span>
                          </div>

                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-body font-medium text-foreground">
                              {appt.patientName}
                            </span>
                            <span className="text-label text-muted font-mono">
                              {appt.patientPhone}
                            </span>
                          </div>

                          {appt.patientAllergies && (
                            <div className="mt-1 flex items-center gap-1 text-[11px] text-status-error font-medium">
                              <AlertIcon size={12} />
                              <span>Allergy: {appt.patientAllergies}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right Column: Patient Side Panel (Allergies, Treatment History, Actions) */}
      <div className="bg-surface border border-border rounded p-5 space-y-4 sticky top-20">
        {currentSelected ? (
          <>
            <div className="border-b border-border pb-3">
              <span className="text-label text-muted uppercase tracking-wider block">
                Selected Appointment
              </span>
              <h3 className="text-page-title font-medium text-foreground mt-0.5">
                {currentSelected.patientName}
              </h3>
              <p className="text-label text-muted font-mono mt-0.5">
                {currentSelected.patientPhone}
              </p>
            </div>

            {/* Prominent Allergy Alert in Side Panel */}
            {currentSelected.patientAllergies ? (
              <div
                role="alert"
                className="p-3 rounded bg-status-error-bg border border-status-error/30 text-status-error text-body"
              >
                <div className="flex items-center gap-1.5 font-medium text-[13px]">
                  <AlertIcon size={16} />
                  <span>Clinical Allergy Alert</span>
                </div>
                <p className="text-[12px] mt-1">{currentSelected.patientAllergies}</p>
              </div>
            ) : (
              <div className="p-2.5 rounded bg-surface-secondary text-label text-muted">
                No known allergies recorded for this patient.
              </div>
            )}

            {currentSelected.patientMedicalHistory && (
              <div>
                <span className="text-label text-muted block">Medical History</span>
                <p className="text-body text-foreground mt-0.5">
                  {currentSelected.patientMedicalHistory}
                </p>
              </div>
            )}

            <div className="pt-2 border-t border-border space-y-2 text-body">
              <div className="flex justify-between">
                <span className="text-label text-muted">Slot Time</span>
                <span className="font-mono text-foreground">
                  {formatTime(currentSelected.startTime)} - {formatTime(currentSelected.endTime)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-label text-muted">Assigned Dentist</span>
                <span className="text-foreground">{currentSelected.dentistName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-label text-muted">Appointment Type</span>
                <span className="text-foreground">{currentSelected.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-label text-muted">Status</span>
                <Badge
                  variant={
                    currentSelected.status === 'COMPLETED'
                      ? 'success'
                      : currentSelected.status === 'ARRIVED'
                      ? 'info'
                      : currentSelected.status === 'CANCELLED'
                      ? 'error'
                      : 'warning'
                  }
                >
                  {currentSelected.status}
                </Badge>
              </div>
              {currentSelected.notes && (
                <div className="pt-1">
                  <span className="text-label text-muted block">Notes</span>
                  <p className="text-foreground text-[13px]">{currentSelected.notes}</p>
                </div>
              )}
            </div>

            {/* Quick Status Transitions */}
            <div className="pt-3 border-t border-border space-y-2">
              <span className="text-label text-muted uppercase tracking-wider block mb-1">
                Workflow Actions
              </span>

              {currentSelected.status === 'SCHEDULED' && (
                <Button
                  variant="secondary"
                  className="w-full text-status-info"
                  onClick={() => handleStatusUpdate('CONFIRMED')}
                  loading={isPending}
                >
                  Confirm Appointment
                </Button>
              )}

              {(currentSelected.status === 'SCHEDULED' || currentSelected.status === 'CONFIRMED') && (
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => handleStatusUpdate('ARRIVED')}
                  loading={isPending}
                >
                  Mark Patient Arrived
                </Button>
              )}

              {currentSelected.status === 'ARRIVED' && (
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => handleStatusUpdate('IN_PROGRESS')}
                  loading={isPending}
                >
                  Start Examination
                </Button>
              )}

              {currentSelected.status === 'IN_PROGRESS' && (
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={() => handleStatusUpdate('COMPLETED')}
                  loading={isPending}
                >
                  Mark Completed
                </Button>
              )}

              {currentSelected.status !== 'COMPLETED' && currentSelected.status !== 'CANCELLED' && currentSelected.status !== 'NO_SHOW' && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleStatusUpdate('NO_SHOW')}
                    loading={isPending}
                  >
                    Mark No-Show
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setCancelModalOpen(true)}
                    disabled={isPending}
                  >
                    Cancel Slot
                  </Button>
                </div>
              )}

              <Link
                href={`/app/patients/${currentSelected.patientId}`}
                className="block text-center text-label text-accent hover:underline pt-2 font-medium"
              >
                Open Full Patient Chart &rarr;
              </Link>
            </div>
          </>
        ) : (
          <div className="p-8 text-center text-muted">
            <p className="text-body">Select an appointment to inspect clinical details.</p>
          </div>
        )}

        {/* Cancellation Reason Dialog */}
        <Dialog open={cancelModalOpen} onClose={() => setCancelModalOpen(false)} className="max-w-sm">
          <DialogHeader
            title="Cancel Appointment"
            description="A reason must be recorded to release this slot."
            onClose={() => setCancelModalOpen(false)}
          />
          <DialogBody className="space-y-3">
            <Textarea
              label="Cancellation Reason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              required
              rows={2}
              placeholder="e.g., Patient called to reschedule, emergency conflict..."
            />
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setCancelModalOpen(false)}>
              Back
            </Button>
            <Button
              variant="danger"
              disabled={cancelReason.trim().length < 3 || isPending}
              loading={isPending}
              onClick={() => handleStatusUpdate('CANCELLED', cancelReason)}
            >
              Confirm Cancellation
            </Button>
          </DialogFooter>
        </Dialog>
      </div>
    </div>
  );
}
