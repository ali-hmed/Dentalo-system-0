'use server';

import { revalidatePath } from 'next/cache';
import { prisma, getTenantClient } from '@/lib/db';
import { requireCompanyStaff } from '@/lib/auth/guards';
import { logAuditEvent } from '@/lib/audit/logger';
import { patientSchema } from '@/lib/validations';
import type { ActionResult } from '@/lib/types';

export async function createPatientAction(
  companyId: string,
  formData: FormData
): Promise<ActionResult<{ patientId: string }>> {
  const { user } = await requireCompanyStaff(companyId);

  const rawData = {
    fullName: formData.get('fullName')?.toString() || '',
    phone: formData.get('phone')?.toString() || '',
    email: formData.get('email')?.toString() || undefined,
    dateOfBirth: formData.get('dateOfBirth')?.toString() || undefined,
    gender: (formData.get('gender')?.toString() as any) || undefined,
    medicalHistory: formData.get('medicalHistory')?.toString() || undefined,
    allergies: formData.get('allergies')?.toString() || undefined,
    notes: formData.get('notes')?.toString() || undefined,
  };

  const parsed = patientSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Please fix the highlighted patient information errors.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const tenantDb = getTenantClient(companyId);

  // Duplicate detection by phone number in this clinic
  const existingPatient = await tenantDb.patient.findFirst({
    where: {
      phone: parsed.data.phone.trim(),
    },
  });

  if (existingPatient) {
    return {
      success: false,
      error: `A patient with phone number ${parsed.data.phone} already exists (${existingPatient.fullName}). Duplicate registration prevented.`,
      fieldErrors: {
        phone: [`Already assigned to patient: ${existingPatient.fullName}`],
      },
    };
  }

  const patient = await tenantDb.patient.create({
    data: {
      companyId,
      fullName: parsed.data.fullName,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      dateOfBirth: parsed.data.dateOfBirth ? new Date(parsed.data.dateOfBirth) : null,
      gender: parsed.data.gender || null,
      medicalHistory: parsed.data.medicalHistory || null,
      allergies: parsed.data.allergies || null,
      notes: parsed.data.notes || null,
      status: 'ACTIVE',
    },
  });

  await logAuditEvent({
    userId: user.id,
    companyId,
    action: 'PATIENT_REGISTERED',
    entityType: 'Patient',
    entityId: patient.id,
    details: {
      fullName: patient.fullName,
      phone: patient.phone,
      hasAllergies: !!patient.allergies,
    },
  });

  revalidatePath('/app/patients');
  return {
    success: true,
    data: { patientId: patient.id },
  };
}

export async function updatePatientAction(
  companyId: string,
  patientId: string,
  formData: FormData
): Promise<ActionResult> {
  const { user } = await requireCompanyStaff(companyId);

  const rawData = {
    fullName: formData.get('fullName')?.toString() || '',
    phone: formData.get('phone')?.toString() || '',
    email: formData.get('email')?.toString() || undefined,
    dateOfBirth: formData.get('dateOfBirth')?.toString() || undefined,
    gender: (formData.get('gender')?.toString() as any) || undefined,
    medicalHistory: formData.get('medicalHistory')?.toString() || undefined,
    allergies: formData.get('allergies')?.toString() || undefined,
    notes: formData.get('notes')?.toString() || undefined,
  };

  const parsed = patientSchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Please fix validation errors.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const tenantDb = getTenantClient(companyId);

  // Check phone uniqueness against other patients in this clinic
  const conflict = await tenantDb.patient.findFirst({
    where: {
      phone: parsed.data.phone.trim(),
      id: { not: patientId },
    },
  });

  if (conflict) {
    return {
      success: false,
      error: `Another patient (${conflict.fullName}) is already registered with phone ${parsed.data.phone}.`,
      fieldErrors: { phone: ['Phone number already in use'] },
    };
  }

  await tenantDb.patient.update({
    where: { id: patientId },
    data: {
      fullName: parsed.data.fullName,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      dateOfBirth: parsed.data.dateOfBirth ? new Date(parsed.data.dateOfBirth) : null,
      gender: parsed.data.gender || null,
      medicalHistory: parsed.data.medicalHistory || null,
      allergies: parsed.data.allergies || null,
      notes: parsed.data.notes || null,
    },
  });

  await logAuditEvent({
    userId: user.id,
    companyId,
    action: 'PATIENT_UPDATED',
    entityType: 'Patient',
    entityId: patientId,
    details: { fullName: parsed.data.fullName },
  });

  revalidatePath(`/app/patients/${patientId}`);
  revalidatePath('/app/patients');
  return { success: true, data: undefined };
}
