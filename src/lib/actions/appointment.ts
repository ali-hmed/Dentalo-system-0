'use server';

import { revalidatePath } from 'next/cache';
import { prisma, getTenantClient } from '@/lib/db';
import { requireCompanyStaff } from '@/lib/auth/guards';
import { logAuditEvent } from '@/lib/audit/logger';
import { appointmentSchema, rescheduleAppointmentSchema, cancelAppointmentSchema } from '@/lib/validations';
import { APPOINTMENT_TRANSITIONS } from '@/lib/constants';
import type { ActionResult, AppointmentStatus, AppointmentType } from '@/lib/types';

export async function createAppointmentAction(
  companyId: string,
  formData: FormData
): Promise<ActionResult<{ appointmentId: string }>> {
  const { user } = await requireCompanyStaff(companyId);

  const rawData = {
    patientId: formData.get('patientId')?.toString() || '',
    dentistId: formData.get('dentistId')?.toString() || '',
    date: formData.get('date')?.toString() || '',
    startTime: formData.get('startTime')?.toString() || '',
    endTime: formData.get('endTime')?.toString() || '',
    type: (formData.get('type')?.toString() as any) || 'CHECKUP',
    notes: formData.get('notes')?.toString() || undefined,
  };

  const parsed = appointmentSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Please fix appointment scheduling validation errors.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const startUtc = new Date(parsed.data.startTime);
  const endUtc = new Date(parsed.data.endTime);

  if (startUtc.getTime() >= endUtc.getTime()) {
    return {
      success: false,
      error: 'Appointment end time must be after start time.',
      fieldErrors: { endTime: ['End time must be after start time'] },
    };
  }

  const tenantDb = getTenantClient(companyId);

  // Application-level conflict check
  const conflicting = await tenantDb.appointment.findFirst({
    where: {
      dentistId: parsed.data.dentistId,
      status: {
        notIn: ['CANCELLED', 'NO_SHOW'],
      },
      startTime: {
        lt: endUtc,
      },
      endTime: {
        gt: startUtc,
      },
    },
    include: {
      patient: { select: { fullName: true } },
    },
  });

  if (conflicting) {
    return {
      success: false,
      error: `Conflict: This dentist already has an appointment booked during this time slot (with ${conflicting.patient.fullName}).`,
    };
  }

  try {
    const appointment = await tenantDb.appointment.create({
      data: {
        companyId,
        patientId: parsed.data.patientId,
        dentistId: parsed.data.dentistId,
        date: new Date(parsed.data.date),
        startTime: startUtc,
        endTime: endUtc,
        type: parsed.data.type as AppointmentType,
        status: 'SCHEDULED',
        notes: parsed.data.notes || null,
        version: 1,
      },
      include: {
        patient: { select: { fullName: true } },
      },
    });

    await logAuditEvent({
      userId: user.id,
      companyId,
      action: 'APPOINTMENT_SCHEDULED',
      entityType: 'Appointment',
      entityId: appointment.id,
      details: {
        patientName: appointment.patient.fullName,
        date: parsed.data.date,
        startTime: parsed.data.startTime,
        endTime: parsed.data.endTime,
      },
    });

    revalidatePath('/app/schedule');
    revalidatePath('/app');
    return {
      success: true,
      data: { appointmentId: appointment.id },
    };
  } catch (error: any) {
    // Catch PostgreSQL btree_gist exclusion constraint violation
    if (
      error.code === 'P2002' ||
      (error.message && error.message.includes('appointments_no_overlap'))
    ) {
      return {
        success: false,
        error: 'Double-booking rejected: Another appointment was booked concurrently for this dentist in this time window.',
      };
    }
    console.error('Failed to create appointment:', error);
    return {
      success: false,
      error: 'An unexpected database error occurred while creating the appointment.',
    };
  }
}

export async function rescheduleAppointmentAction(
  companyId: string,
  formData: FormData
): Promise<ActionResult> {
  const { user } = await requireCompanyStaff(companyId);

  const rawData = {
    id: formData.get('id')?.toString() || '',
    date: formData.get('date')?.toString() || '',
    startTime: formData.get('startTime')?.toString() || '',
    endTime: formData.get('endTime')?.toString() || '',
    version: Number(formData.get('version')),
  };

  const parsed = rescheduleAppointmentSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Please fix validation errors.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const tenantDb = getTenantClient(companyId);

  // 1. Fetch current appointment and verify version (Optimistic Concurrency Control)
  const current = await tenantDb.appointment.findUnique({
    where: { id: parsed.data.id },
  });

  if (!current) {
    return { success: false, error: 'Appointment not found.' };
  }

  if (current.version !== parsed.data.version) {
    return {
      success: false,
      error: 'Concurrent modification: This appointment was modified by another staff member. Please refresh to see latest changes.',
    };
  }

  const startUtc = new Date(parsed.data.startTime);
  const endUtc = new Date(parsed.data.endTime);

  // 2. Overlap check
  const conflict = await tenantDb.appointment.findFirst({
    where: {
      dentistId: current.dentistId,
      id: { not: current.id },
      status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      startTime: { lt: endUtc },
      endTime: { gt: startUtc },
    },
  });

  if (conflict) {
    return {
      success: false,
      error: 'Conflict: This dentist already has an appointment booked for that time window.',
    };
  }

  try {
    await tenantDb.appointment.update({
      where: {
        id: current.id,
      },
      data: {
        date: new Date(parsed.data.date),
        startTime: startUtc,
        endTime: endUtc,
        version: current.version + 1,
      },
    });

    await logAuditEvent({
      userId: user.id,
      companyId,
      action: 'APPOINTMENT_RESCHEDULED',
      entityType: 'Appointment',
      entityId: current.id,
      details: {
        oldStartTime: current.startTime,
        newStartTime: startUtc,
        newVersion: current.version + 1,
      },
    });

    revalidatePath('/app/schedule');
    revalidatePath('/app');
    return { success: true, data: undefined };
  } catch (error: any) {
    if (error.message && error.message.includes('appointments_no_overlap')) {
      return {
        success: false,
        error: 'Double-booking rejected: Another conflicting appointment was scheduled concurrently.',
      };
    }
    throw error;
  }
}

export async function updateAppointmentStatusAction(
  companyId: string,
  appointmentId: string,
  newStatus: AppointmentStatus,
  currentVersion: number,
  cancellationReason?: string
): Promise<ActionResult> {
  const { user } = await requireCompanyStaff(companyId);

  const tenantDb = getTenantClient(companyId);

  const appointment = await tenantDb.appointment.findUnique({
    where: { id: appointmentId },
  });

  if (!appointment) {
    return { success: false, error: 'Appointment not found.' };
  }

  // Optimistic locking
  if (appointment.version !== currentVersion) {
    return {
      success: false,
      error: 'Conflict: This appointment was updated by another user. Please refresh and review.',
    };
  }

  // State machine transition validation
  const allowed = APPOINTMENT_TRANSITIONS[appointment.status] || [];
  if (!allowed.includes(newStatus)) {
    return {
      success: false,
      error: `Invalid status transition from ${appointment.status} to ${newStatus}.`,
    };
  }

  if (newStatus === 'CANCELLED' && !cancellationReason) {
    return {
      success: false,
      error: 'A cancellation reason is required.',
    };
  }

  await tenantDb.appointment.update({
    where: { id: appointmentId },
    data: {
      status: newStatus,
      cancellationReason: cancellationReason || appointment.cancellationReason,
      version: appointment.version + 1,
    },
  });

  await logAuditEvent({
    userId: user.id,
    companyId,
    action: `APPOINTMENT_${newStatus}`,
    entityType: 'Appointment',
    entityId: appointmentId,
    details: {
      previousStatus: appointment.status,
      newStatus,
      cancellationReason,
      newVersion: appointment.version + 1,
    },
  });

  revalidatePath('/app/schedule');
  revalidatePath('/app');
  return { success: true, data: undefined };
}
