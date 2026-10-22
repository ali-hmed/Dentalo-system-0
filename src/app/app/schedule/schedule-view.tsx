'use client';

import React, { useState, useTransition, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { formatTime, formatDate, formatMonthYear } from '@/lib/utils';
import {
  AlertIcon,
  ToothIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
} from '@/components/icons';
import { updateAppointmentStatusAction } from '@/lib/actions/appointment';
import type { AppointmentStatus } from '@/lib/types';

export interface AppointmentItem {
  id: string;
  dentistId: string;
  dentistName: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  patientAllergies?: string | null;
  patientMedicalHistory?: string | null;
  dateString: string; // YYYY-MM-DD in Africa/Mogadishu
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  type: string;
  notes?: string | null;
  version: number;
}

interface ScheduleViewProps {
  companyId: string;
  selectedDate: string; // YYYY-MM-DD
  todayStr: string;     // YYYY-MM-DD
  appointments: AppointmentItem[];
  dentists: { id: string; name: string }[];
}

interface CalendarDay {
  day: number;
  dateStr: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  appointmentCount: number;
}

export function ScheduleView({
  companyId,
  selectedDate,
  todayStr,
  appointments,
  dentists,
}: ScheduleViewProps) {
  const router = useRouter();
  const [activeDate, setActiveDate] = useState<string>(selectedDate);
  const [isPending, startTransition] = useTransition();

  // Cancel dialog state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [statusError, setStatusError] = useState<string | null>(null);

  // Parse active date to determine current viewing year and month
  const [activeYear, activeMonth] = useMemo(() => {
    const [y, m] = activeDate.split('-').map(Number);
    return [y || 2026, m || 10];
  }, [activeDate]);

  // Appointments for the currently active day
  const activeDayAppointments = useMemo(() => {
    return appointments.filter((a) => a.dateString === activeDate);
  }, [appointments, activeDate]);

  // Selected appointment state
  const [selectedApptId, setSelectedApptId] = useState<string | null>(
    activeDayAppointments[0]?.id || null
  );

  // Keep selectedAppt synchronized when date changes or updates occur
  const selectedAppt = useMemo(() => {
    if (selectedApptId) {
      const found = activeDayAppointments.find((a) => a.id === selectedApptId);
      if (found) return found;
    }
    return activeDayAppointments[0] || null;
  }, [activeDayAppointments, selectedApptId]);

  // Count map of appointments per day
  const appointmentCountByDate = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of appointments) {
      counts[a.dateString] = (counts[a.dateString] || 0) + 1;
    }
    return counts;
  }, [appointments]);

  // Total appointments in current displayed month
  const totalMonthAppointments = useMemo(() => {
    const monthPrefix = `${activeYear}-${String(activeMonth).padStart(2, '0')}`;
    return appointments.filter((a) => a.dateString.startsWith(monthPrefix)).length;
  }, [appointments, activeYear, activeMonth]);

  // Compute calendar days grid for the active month
  const calendarDays = useMemo(() => {
    const firstDay = new Date(Date.UTC(activeYear, activeMonth - 1, 1));
    const lastDay = new Date(Date.UTC(activeYear, activeMonth, 0));
    const daysInMonth = lastDay.getUTCDate();
    const startDayOfWeek = firstDay.getUTCDay(); // 0 = Sunday

    const days: CalendarDay[] = [];

    // Prev month padding
    const prevMonthLastDay = new Date(Date.UTC(activeYear, activeMonth - 1, 0)).getUTCDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i;
      const m = activeMonth === 1 ? 12 : activeMonth - 1;
      const y = activeMonth === 1 ? activeYear - 1 : activeYear;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({
        day,
        dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === activeDate,
        appointmentCount: appointmentCountByDate[dateStr] || 0,
      });
    }

    // Current month days (1 .. 31)
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${activeYear}-${String(activeMonth).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        day: i,
        dateStr,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isSelected: dateStr === activeDate,
        appointmentCount: appointmentCountByDate[dateStr] || 0,
      });
    }

    // Next month padding to complete 7-day grid rows
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const m = activeMonth === 12 ? 1 : activeMonth + 1;
      const y = activeMonth === 12 ? activeYear + 1 : activeYear;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        day: i,
        dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === activeDate,
        appointmentCount: appointmentCountByDate[dateStr] || 0,
      });
    }

    return days;
  }, [activeYear, activeMonth, activeDate, todayStr, appointmentCountByDate]);

  function handleSelectDate(dateStr: string) {
    setActiveDate(dateStr);
    const dayAppts = appointments.filter((a) => a.dateString === dateStr);
    setSelectedApptId(dayAppts[0]?.id || null);
    router.push(`/app/schedule?date=${dateStr}`, { scroll: false });
  }

  function handlePrevMonth() {
    const prevMonthDate = new Date(Date.UTC(activeYear, activeMonth - 2, 1));
    const newDateStr = prevMonthDate.toISOString().slice(0, 10);
    handleSelectDate(newDateStr);
  }

  function handleNextMonth() {
    const nextMonthDate = new Date(Date.UTC(activeYear, activeMonth, 1));
    const newDateStr = nextMonthDate.toISOString().slice(0, 10);
    handleSelectDate(newDateStr);
  }

  function handleToday() {
    handleSelectDate(todayStr);
  }

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

  const weekDayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="space-y-6">
      {statusError && (
        <div className="p-3 rounded bg-status-error-bg border border-status-error/20 text-status-error text-body flex items-start gap-2">
          <AlertIcon size={16} className="shrink-0 mt-0.5" />
          <span>{statusError}</span>
        </div>
      )}

      {/* Main Layout: 2 Columns on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left 2 Cols: Calendar Grid + Day's Appointments */}
        <div className="lg:col-span-2 space-y-6">
          {/* Calendar Card */}
          <div className="bg-surface border border-border rounded shadow-subtle overflow-hidden">
            {/* Calendar Toolbar */}
            <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface">
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handlePrevMonth}
                  aria-label="Previous month"
                >
                  <ChevronLeftIcon size={16} />
                </Button>

                <Button
                  variant={activeDate === todayStr ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={handleToday}
                >
                  Today
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleNextMonth}
                  aria-label="Next month"
                >
                  <ChevronRightIcon size={16} />
                </Button>

                <div className="flex items-center gap-2 ml-2">
                  <CalendarIcon size={18} className="text-accent" />
                  <span className="text-page-title font-medium text-foreground">
                    {formatMonthYear(`${activeYear}-${String(activeMonth).padStart(2, '0')}-01`)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-label text-muted">
                <span className="font-mono text-[11px] bg-surface-secondary px-2 py-0.5 rounded border border-border">
                  Africa/Mogadishu (UTC+3)
                </span>
                <span>&bull;</span>
                <span className="font-medium text-foreground">
                  {totalMonthAppointments} appointment{totalMonthAppointments === 1 ? '' : 's'}
                </span>
              </div>
            </div>

            {/* Days of the Week Header */}
            <div className="grid grid-cols-7 border-b border-border bg-surface-secondary/60">
              {weekDayLabels.map((day) => (
                <div
                  key={day}
                  className="py-2.5 text-center text-[12px] font-semibold text-muted uppercase tracking-wider"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* 7-Column Calendar Grid of Days */}
            <div className="grid grid-cols-7 divide-x divide-y divide-border bg-border/20">
              {calendarDays.map((cell) => {
                const isSelected = cell.isSelected;
                const hasAppts = cell.appointmentCount > 0;

                return (
                  <button
                    key={cell.dateStr}
                    type="button"
                    onClick={() => handleSelectDate(cell.dateStr)}
                    className={`min-h-[82px] sm:min-h-[96px] p-2 text-left transition-colors flex flex-col justify-between relative group ${
                      isSelected
                        ? 'bg-accent/10 ring-2 ring-inset ring-accent z-10'
                        : cell.isCurrentMonth
                        ? 'bg-surface hover:bg-surface-secondary/80'
                        : 'bg-surface-secondary/40 text-muted/50 hover:bg-surface-secondary/60'
                    }`}
                  >
                    {/* Top Row: Date Number and Indicators */}
                    <div className="flex items-center justify-between w-full">
                      <span
                        className={`inline-flex items-center justify-center text-[13px] sm:text-[14px] font-medium w-7 h-7 rounded-full transition-all ${
                          isSelected
                            ? 'bg-accent text-white font-semibold shadow-sm'
                            : cell.isToday
                            ? 'border-2 border-accent text-accent font-bold'
                            : cell.isCurrentMonth
                            ? 'text-foreground'
                            : 'text-muted/50'
                        }`}
                      >
                        {cell.day}
                      </span>

                      {cell.isToday && !isSelected && (
                        <span className="text-[10px] font-semibold text-accent uppercase tracking-wider hidden sm:inline">
                          Today
                        </span>
                      )}
                    </div>

                    {/* Bottom Row: Appointment Badges / Count */}
                    <div className="mt-1 w-full">
                      {hasAppts ? (
                        <div
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium leading-tight w-full justify-between sm:justify-start ${
                            isSelected
                              ? 'bg-accent text-white'
                              : 'bg-accent-light text-accent border border-accent/20'
                          }`}
                        >
                          <span className="font-semibold">{cell.appointmentCount}</span>
                          <span className="hidden sm:inline">
                            {cell.appointmentCount === 1 ? 'slot' : 'slots'}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Date's Detailed Schedule Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-2.5">
              <div className="flex items-center gap-2">
                <ClockIcon size={18} className="text-accent" />
                <h3 className="text-body font-medium text-foreground">
                  Schedule for {formatDate(activeDate)}
                </h3>
              </div>
              <span className="text-label text-muted font-medium">
                {activeDayAppointments.length} appointment
                {activeDayAppointments.length === 1 ? '' : 's'}
              </span>
            </div>

            {activeDayAppointments.length === 0 ? (
              <div className="bg-surface border border-border rounded p-10 text-center shadow-subtle">
                <ToothIcon className="mx-auto text-muted mb-3" size={28} />
                <p className="text-body font-medium text-foreground mb-1">
                  No appointments scheduled for {formatDate(activeDate)}
                </p>
                <p className="text-label text-muted max-w-sm mx-auto">
                  Click on any highlighted calendar date above to view bookings, or click &ldquo;Book appointment&rdquo; at the top to schedule a patient slot.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {dentists.map((dentist) => {
                  const dentistAppts = activeDayAppointments.filter(
                    (a) => a.dentistId === dentist.id
                  );
                  if (dentistAppts.length === 0) return null;

                  return (
                    <div
                      key={dentist.id}
                      className="bg-surface border border-border rounded p-4 shadow-subtle"
                    >
                      <div className="flex items-center justify-between border-b border-border pb-2.5 mb-3">
                        <h4 className="text-body font-medium text-foreground">
                          {dentist.name}
                        </h4>
                        <span className="text-label text-muted">
                          {dentistAppts.length} appointment
                          {dentistAppts.length > 1 ? 's' : ''}
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {dentistAppts.map((appt) => {
                          const isApptSelected = selectedAppt?.id === appt.id;
                          return (
                            <div
                              key={appt.id}
                              onClick={() => setSelectedApptId(appt.id)}
                              className={`p-3.5 rounded border cursor-pointer transition-all ${
                                isApptSelected
                                  ? 'border-accent bg-accent/5 ring-1 ring-accent'
                                  : 'border-border bg-surface-secondary/40 hover:bg-surface-secondary'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-label text-foreground font-semibold">
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

                                <span className="text-label text-muted font-medium">
                                  {appt.type}
                                </span>
                              </div>

                              <div className="mt-2.5 flex items-center justify-between">
                                <span className="text-body font-medium text-foreground">
                                  {appt.patientName}
                                </span>
                                <span className="text-label text-muted font-mono">
                                  {appt.patientPhone}
                                </span>
                              </div>

                              {appt.patientAllergies && (
                                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-status-error font-medium">
                                  <AlertIcon size={13} className="shrink-0" />
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

                {/* Fallback for appointments not mapped to listed dentists */}
                {(() => {
                  const unlistedAppts = activeDayAppointments.filter(
                    (a) => !dentists.some((d) => d.id === a.dentistId)
                  );
                  if (unlistedAppts.length === 0) return null;

                  return (
                    <div className="bg-surface border border-border rounded p-4 shadow-subtle">
                      <div className="flex items-center justify-between border-b border-border pb-2.5 mb-3">
                        <h4 className="text-body font-medium text-foreground">
                          Other Clinicians
                        </h4>
                        <span className="text-label text-muted">
                          {unlistedAppts.length} appointment
                          {unlistedAppts.length > 1 ? 's' : ''}
                        </span>
                      </div>

                      <div className="space-y-2.5">
                        {unlistedAppts.map((appt) => {
                          const isApptSelected = selectedAppt?.id === appt.id;
                          return (
                            <div
                              key={appt.id}
                              onClick={() => setSelectedApptId(appt.id)}
                              className={`p-3.5 rounded border cursor-pointer transition-all ${
                                isApptSelected
                                  ? 'border-accent bg-accent/5 ring-1 ring-accent'
                                  : 'border-border bg-surface-secondary/40 hover:bg-surface-secondary'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-label text-foreground font-semibold">
                                  {formatTime(appt.startTime)} - {formatTime(appt.endTime)}
                                </span>
                                <Badge variant="warning">{appt.status}</Badge>
                              </div>
                              <div className="mt-2 flex items-center justify-between">
                                <span className="text-body font-medium text-foreground">
                                  {appt.patientName}
                                </span>
                                <span className="text-label text-muted">{appt.dentistName}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Interactive Patient Clinical Details Side Panel */}
        <div className="bg-surface border border-border rounded p-5 space-y-4 sticky top-20 shadow-subtle">
          {selectedAppt ? (
            <>
              <div className="border-b border-border pb-3">
                <span className="text-label text-muted uppercase tracking-wider block">
                  Selected Appointment
                </span>
                <h3 className="text-page-title font-medium text-foreground mt-0.5">
                  {selectedAppt.patientName}
                </h3>
                <p className="text-label text-muted font-mono mt-0.5">
                  {selectedAppt.patientPhone}
                </p>
              </div>

              {/* Prominent Allergy Alert in Side Panel */}
              {selectedAppt.patientAllergies ? (
                <div
                  role="alert"
                  className="p-3 rounded bg-status-error-bg border border-status-error/30 text-status-error text-body"
                >
                  <div className="flex items-center gap-1.5 font-medium text-[13px]">
                    <AlertIcon size={16} />
                    <span>Clinical Allergy Alert</span>
                  </div>
                  <p className="text-[12px] mt-1">{selectedAppt.patientAllergies}</p>
                </div>
              ) : (
                <div className="p-2.5 rounded bg-surface-secondary text-label text-muted">
                  No known allergies recorded for this patient.
                </div>
              )}

              {selectedAppt.patientMedicalHistory && (
                <div>
                  <span className="text-label text-muted block">Medical History</span>
                  <p className="text-body text-foreground mt-0.5">
                    {selectedAppt.patientMedicalHistory}
                  </p>
                </div>
              )}

              <div className="pt-2 border-t border-border space-y-2 text-body">
                <div className="flex justify-between">
                  <span className="text-label text-muted">Slot Time</span>
                  <span className="font-mono text-foreground font-medium">
                    {formatTime(selectedAppt.startTime)} - {formatTime(selectedAppt.endTime)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-label text-muted">Assigned Dentist</span>
                  <span className="text-foreground">{selectedAppt.dentistName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-label text-muted">Appointment Type</span>
                  <span className="text-foreground font-medium">{selectedAppt.type}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-label text-muted">Status</span>
                  <Badge
                    variant={
                      selectedAppt.status === 'COMPLETED'
                        ? 'success'
                        : selectedAppt.status === 'ARRIVED'
                        ? 'info'
                        : selectedAppt.status === 'IN_PROGRESS'
                        ? 'accent'
                        : selectedAppt.status === 'CANCELLED'
                        ? 'error'
                        : 'warning'
                    }
                  >
                    {selectedAppt.status}
                  </Badge>
                </div>
                {selectedAppt.notes && (
                  <div className="pt-1">
                    <span className="text-label text-muted block">Notes</span>
                    <p className="text-foreground text-[13px]">{selectedAppt.notes}</p>
                  </div>
                )}
              </div>

              {/* Quick Status Transitions */}
              <div className="pt-3 border-t border-border space-y-2">
                <span className="text-label text-muted uppercase tracking-wider block mb-1">
                  Workflow Actions
                </span>

                {selectedAppt.status === 'SCHEDULED' && (
                  <Button
                    variant="secondary"
                    className="w-full text-status-info"
                    onClick={() => handleStatusUpdate('CONFIRMED')}
                    loading={isPending}
                  >
                    Confirm Appointment
                  </Button>
                )}

                {(selectedAppt.status === 'SCHEDULED' || selectedAppt.status === 'CONFIRMED') && (
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={() => handleStatusUpdate('ARRIVED')}
                    loading={isPending}
                  >
                    Mark Patient Arrived
                  </Button>
                )}

                {selectedAppt.status === 'ARRIVED' && (
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={() => handleStatusUpdate('IN_PROGRESS')}
                    loading={isPending}
                  >
                    Start Examination
                  </Button>
                )}

                {selectedAppt.status === 'IN_PROGRESS' && (
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={() => handleStatusUpdate('COMPLETED')}
                    loading={isPending}
                  >
                    Mark Completed
                  </Button>
                )}

                {selectedAppt.status !== 'COMPLETED' &&
                  selectedAppt.status !== 'CANCELLED' &&
                  selectedAppt.status !== 'NO_SHOW' && (
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
                  href={`/app/patients/${selectedAppt.patientId}`}
                  className="block text-center text-label text-accent hover:underline pt-2 font-medium"
                >
                  Open Full Patient Chart &rarr;
                </Link>
              </div>
            </>
          ) : (
            <div className="p-8 text-center text-muted">
              <CalendarIcon className="mx-auto mb-2 text-muted/60" size={24} />
              <p className="text-body font-medium text-foreground mb-1">
                No Appointment Selected
              </p>
              <p className="text-label text-muted">
                Select a scheduled appointment from the list to inspect clinical details and execute workflow actions.
              </p>
            </div>
          )}

          {/* Cancellation Reason Dialog */}
          <Dialog
            open={cancelModalOpen}
            onClose={() => setCancelModalOpen(false)}
            className="max-w-sm"
          >
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
    </div>
  );
}
