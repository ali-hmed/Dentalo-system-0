'use server';

import crypto from 'crypto';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireCompanyStaff } from '@/lib/auth/guards';
import { invalidateAllUserSessions } from '@/lib/auth/session';
import { logAuditEvent } from '@/lib/audit/logger';
import { dispatchInvitation } from '@/lib/email';
import { inviteStaffSchema } from '@/lib/validations';
import { INVITATION_EXPIRY_HOURS } from '@/lib/constants';
import type { ActionResult, StaffType } from '@/lib/types';

export async function inviteStaffAction(
  companyId: string,
  formData: FormData
): Promise<ActionResult<{ inviteUrl: string; emailSent: boolean }>> {
  // Only clinic Owner can invite staff
  const { user } = await requireCompanyStaff(companyId, ['OWNER']);

  const email = formData.get('email')?.toString() || '';
  const staffType = formData.get('staffType')?.toString() as StaffType;
  const specialization = formData.get('specialization')?.toString() || '';
  const licenseNumber = formData.get('licenseNumber')?.toString() || '';

  const parsed = inviteStaffSchema.safeParse({ email, staffType, specialization, licenseNumber });
  if (!parsed.success) {
    return {
      success: false,
      error: 'Please fix validation errors.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
  });
  if (!company) {
    return { success: false, error: 'Company not found.' };
  }

  // Check if active user already a member of this clinic
  const existingUser = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
    include: {
      memberships: {
        where: { companyId },
      },
    },
  });

  if (existingUser && existingUser.memberships.length > 0) {
    return {
      success: false,
      error: 'A user with this email is already a member of this clinic.',
    };
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_HOURS * 60 * 60 * 1000);

  const invitation = await prisma.invitation.create({
    data: {
      email: parsed.data.email.toLowerCase(),
      companyId,
      role: 'COMPANY_STAFF',
      staffType: parsed.data.staffType,
      token,
      expiresAt,
      status: 'PENDING',
      invitedById: user.id,
    },
  });

  const dispatchResult = await dispatchInvitation({
    toEmail: parsed.data.email,
    companyName: company.name,
    token: invitation.token,
    role: parsed.data.staffType,
  });

  await logAuditEvent({
    userId: user.id,
    companyId,
    action: 'STAFF_INVITED',
    entityType: 'Invitation',
    entityId: invitation.id,
    details: {
      email: parsed.data.email,
      staffType: parsed.data.staffType,
      specialization: parsed.data.specialization,
      licenseNumber: parsed.data.licenseNumber,
    },
  });

  revalidatePath('/app/staff');
  return {
    success: true,
    data: {
      inviteUrl: dispatchResult.inviteUrl,
      emailSent: dispatchResult.emailSent,
    },
  };
}

export async function toggleStaffStatusAction(
  companyId: string,
  membershipId: string,
  newStatus: 'ACTIVE' | 'INACTIVE'
): Promise<ActionResult> {
  const { user } = await requireCompanyStaff(companyId, ['OWNER']);

  const membership = await prisma.companyMembership.findUnique({
    where: { id: membershipId },
    include: { user: true },
  });

  if (!membership || membership.companyId !== companyId) {
    return { success: false, error: 'Membership not found in this company.' };
  }

  if (membership.userId === user.id) {
    return { success: false, error: 'You cannot deactivate your own owner membership.' };
  }

  await prisma.companyMembership.update({
    where: { id: membershipId },
    data: { status: newStatus },
  });

  if (newStatus === 'INACTIVE') {
    await invalidateAllUserSessions(membership.userId);
  }

  await logAuditEvent({
    userId: user.id,
    companyId,
    action: `STAFF_${newStatus}`,
    entityType: 'CompanyMembership',
    entityId: membershipId,
    details: {
      staffEmail: membership.user.email,
      staffType: membership.staffType,
    },
    severity: 'WARNING',
  });

  revalidatePath('/app/staff');
  return { success: true, data: undefined };
}
