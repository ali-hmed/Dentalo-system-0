'use server';

import { revalidatePath } from 'next/cache';
import { prisma, getTenantClient } from '@/lib/db';
import { requireCompanyStaff } from '@/lib/auth/guards';
import { logAuditEvent } from '@/lib/audit/logger';
import { visitSchema } from '@/lib/validations';
import type { ActionResult, TreatmentStatus } from '@/lib/types';

export async function createVisitAction(
  companyId: string,
  formData: FormData
): Promise<ActionResult<{ visitId: string }>> {
  const { user } = await requireCompanyStaff(companyId);

  const rawTreatments = formData.get('treatmentRecordsJson')?.toString();
  let parsedTreatments = [];
  if (rawTreatments) {
    try {
      parsedTreatments = JSON.parse(rawTreatments);
    } catch {
      // ignore
    }
  }

  const rawData = {
    patientId: formData.get('patientId')?.toString() || '',
    dentistId: formData.get('dentistId')?.toString() || '',
    appointmentId: formData.get('appointmentId')?.toString() || undefined,
    date: formData.get('date')?.toString() || new Date().toISOString(),
    chiefComplaint: formData.get('chiefComplaint')?.toString() || undefined,
    examination: formData.get('examination')?.toString() || undefined,
    diagnosis: formData.get('diagnosis')?.toString() || undefined,
    notes: formData.get('notes')?.toString() || undefined,
    followUpInstructions: formData.get('followUpInstructions')?.toString() || undefined,
    status: (formData.get('status')?.toString() as any) || 'COMPLETED',
    treatmentRecords: parsedTreatments,
  };

  const parsed = visitSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Please fix clinical visit validation errors.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const tenantDb = getTenantClient(companyId);

  const visit = await tenantDb.visit.create({
    data: {
      companyId,
      patientId: parsed.data.patientId,
      dentistId: parsed.data.dentistId,
      appointmentId: parsed.data.appointmentId || null,
      date: new Date(parsed.data.date),
      chiefComplaint: parsed.data.chiefComplaint || null,
      examination: parsed.data.examination || null,
      diagnosis: parsed.data.diagnosis || null,
      notes: parsed.data.notes || null,
      followUpInstructions: parsed.data.followUpInstructions || null,
      status: parsed.data.status,
      version: 1,
      treatmentRecords: {
        create: parsed.data.treatmentRecords.map((t) => ({
          companyId,
          procedureName: t.procedureName,
          toothNumber: t.toothNumber || null,
          description: t.description || null,
          notes: t.notes || null,
          status: t.status as TreatmentStatus,
        })),
      },
    },
    include: {
      patient: { select: { fullName: true } },
    },
  });

  // If this visit was created from an appointment, mark appointment COMPLETED
  if (parsed.data.appointmentId) {
    await tenantDb.appointment
      .update({
        where: { id: parsed.data.appointmentId },
        data: { status: 'COMPLETED' },
      })
      .catch(() => {});
  }

  await logAuditEvent({
    userId: user.id,
    companyId,
    action: 'CLINICAL_VISIT_RECORDED',
    entityType: 'Visit',
    entityId: visit.id,
    details: {
      patientName: visit.patient.fullName,
      treatmentCount: parsed.data.treatmentRecords.length,
    },
  });

  revalidatePath(`/app/patients/${parsed.data.patientId}`);
  revalidatePath('/app/treatments');
  revalidatePath('/app');
  return {
    success: true,
    data: { visitId: visit.id },
  };
}

export async function updateVisitAction(
  companyId: string,
  visitId: string,
  formData: FormData
): Promise<ActionResult> {
  const { user } = await requireCompanyStaff(companyId);

  const tenantDb = getTenantClient(companyId);

  const current = await tenantDb.visit.findUnique({
    where: { id: visitId },
  });

  if (!current) {
    return { success: false, error: 'Visit record not found.' };
  }

  const expectedVersion = Number(formData.get('version'));
  if (current.version !== expectedVersion) {
    return {
      success: false,
      error: 'Conflict: This clinical record was modified by another user. Please reload.',
    };
  }

  const chiefComplaint = formData.get('chiefComplaint')?.toString() || current.chiefComplaint;
  const examination = formData.get('examination')?.toString() || current.examination;
  const diagnosis = formData.get('diagnosis')?.toString() || current.diagnosis;
  const notes = formData.get('notes')?.toString() || current.notes;
  const followUpInstructions = formData.get('followUpInstructions')?.toString() || current.followUpInstructions;

  await tenantDb.visit.update({
    where: { id: visitId },
    data: {
      chiefComplaint,
      examination,
      diagnosis,
      notes,
      followUpInstructions,
      version: current.version + 1,
    },
  });

  await logAuditEvent({
    userId: user.id,
    companyId,
    action: 'CLINICAL_VISIT_UPDATED',
    entityType: 'Visit',
    entityId: visitId,
    details: { newVersion: current.version + 1 },
  });

  revalidatePath(`/app/patients/${current.patientId}`);
  return { success: true, data: undefined };
}
