'use server';

import crypto from 'crypto';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireSuperAdmin } from '@/lib/auth/guards';
import { invalidateAllUserSessions } from '@/lib/auth/session';
import { logAuditEvent } from '@/lib/audit/logger';
import { dispatchInvitation } from '@/lib/email';
import {
  createCompanySchema,
  updateCompanySchema,
  supportAccessSchema,
} from '@/lib/validations';
import { INVITATION_EXPIRY_HOURS, SUPPORT_SESSION_MAX_MINUTES } from '@/lib/constants';
import type { ActionResult } from '@/lib/types';

export async function createCompanyAction(
  formData: FormData
): Promise<ActionResult<{ companyId: string; inviteUrl: string; emailSent: boolean }>> {
  const admin = await requireSuperAdmin();

  const rawData = {
    name: formData.get('name')?.toString() || '',
    slug: formData.get('slug')?.toString() || '',
    email: formData.get('email')?.toString() || '',
    phone: formData.get('phone')?.toString() || '',
    address: formData.get('address')?.toString() || '',
    city: formData.get('city')?.toString() || '',
    ownerName: formData.get('ownerName')?.toString() || '',
    ownerEmail: formData.get('ownerEmail')?.toString() || '',
  };

  const parsed = createCompanySchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Please fix the validation errors.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  // Check unique slug and owner email
  const existingCompany = await prisma.company.findUnique({
    where: { slug: parsed.data.slug.toLowerCase() },
  });
  if (existingCompany) {
    return {
      success: false,
      error: 'A clinic with this URL slug already exists. Please pick a unique slug.',
      fieldErrors: { slug: ['Slug is already taken'] },
    };
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: parsed.data.ownerEmail.toLowerCase() },
  });
  if (existingUser && existingUser.role === 'SUPER_ADMIN') {
    return {
      success: false,
      error: 'Super Admin email cannot be assigned as clinic owner.',
    };
  }

  const invitationToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_HOURS * 60 * 60 * 1000);

  // Transactionally create company + invitation
  const { company, invitation } = await prisma.$transaction(async (tx) => {
    const comp = await tx.company.create({
      data: {
        name: parsed.data.name,
        slug: parsed.data.slug.toLowerCase(),
        email: parsed.data.email,
        phone: parsed.data.phone,
        address: parsed.data.address,
        city: parsed.data.city,
        status: 'PENDING_SETUP',
      },
    });

    const inv = await tx.invitation.create({
      data: {
        email: parsed.data.ownerEmail.toLowerCase(),
        companyId: comp.id,
        role: 'COMPANY_OWNER',
        staffType: 'OWNER',
        token: invitationToken,
        expiresAt,
        status: 'PENDING',
        invitedById: admin.id,
      },
    });

    return { company: comp, invitation: inv };
  });

  // Audit log
  await logAuditEvent({
    userId: admin.id,
    companyId: company.id,
    action: 'COMPANY_CREATED',
    entityType: 'Company',
    entityId: company.id,
    details: {
      name: company.name,
      slug: company.slug,
      ownerEmail: parsed.data.ownerEmail,
    },
    severity: 'INFO',
  });

  // Dispatch invitation & get copyable link
  const dispatchResult = await dispatchInvitation({
    toEmail: parsed.data.ownerEmail,
    recipientName: parsed.data.ownerName,
    companyName: company.name,
    token: invitation.token,
    role: 'Clinic Owner',
  });

  revalidatePath('/admin/companies');
  revalidatePath('/admin');

  return {
    success: true,
    data: {
      companyId: company.id,
      inviteUrl: dispatchResult.inviteUrl,
      emailSent: dispatchResult.emailSent,
    },
  };
}

export async function updateCompanyStatusAction(
  companyId: string,
  newStatus: 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED'
): Promise<ActionResult> {
  const admin = await requireSuperAdmin();

  const company = await prisma.company.findUnique({
    where: { id: companyId },
  });
  if (!company) {
    return { success: false, error: 'Company not found.' };
  }

  await prisma.company.update({
    where: { id: companyId },
    data: { status: newStatus },
  });

  // If suspended or archived, invalidate active sessions of company members
  if (newStatus === 'SUSPENDED' || newStatus === 'ARCHIVED') {
    const memberships = await prisma.companyMembership.findMany({
      where: { companyId },
      select: { userId: true },
    });
    for (const m of memberships) {
      await invalidateAllUserSessions(m.userId);
    }
  }

  await logAuditEvent({
    userId: admin.id,
    companyId,
    action: `COMPANY_STATUS_${newStatus}`,
    entityType: 'Company',
    entityId: companyId,
    details: {
      previousStatus: company.status,
      newStatus,
    },
    severity: newStatus === 'ARCHIVED' ? 'WARNING' : 'INFO',
  });

  revalidatePath('/admin/companies');
  revalidatePath(`/admin/companies/${companyId}`);
  revalidatePath('/admin');

  return { success: true, data: undefined };
}

export async function updateCompanyDetailsAction(
  companyId: string,
  formData: FormData
): Promise<ActionResult> {
  const admin = await requireSuperAdmin();

  const rawData = {
    name: formData.get('name')?.toString() || '',
    phone: formData.get('phone')?.toString() || '',
    email: formData.get('email')?.toString() || '',
    address: formData.get('address')?.toString() || '',
    city: formData.get('city')?.toString() || '',
  };

  const parsed = updateCompanySchema.safeParse(rawData);
  if (!parsed.success) {
    return {
      success: false,
      error: 'Please fix validation errors.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  await prisma.company.update({
    where: { id: companyId },
    data: parsed.data,
  });

  await logAuditEvent({
    userId: admin.id,
    companyId,
    action: 'COMPANY_UPDATED',
    entityType: 'Company',
    entityId: companyId,
    details: parsed.data,
  });

  revalidatePath(`/admin/companies/${companyId}`);
  revalidatePath('/admin/companies');

  return { success: true, data: undefined };
}

export async function resendInvitationAction(
  invitationId: string
): Promise<ActionResult<{ inviteUrl: string; emailSent: boolean }>> {
  const admin = await requireSuperAdmin();

  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    include: { company: true },
  });

  if (!invitation || invitation.status !== 'PENDING') {
    return { success: false, error: 'Active pending invitation not found.' };
  }

  // Generate fresh token and extend expiry
  const newToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_HOURS * 60 * 60 * 1000);

  await prisma.invitation.update({
    where: { id: invitationId },
    data: {
      token: newToken,
      expiresAt,
    },
  });

  const dispatchResult = await dispatchInvitation({
    toEmail: invitation.email,
    companyName: invitation.company.name,
    token: newToken,
    role: invitation.staffType,
  });

  await logAuditEvent({
    userId: admin.id,
    companyId: invitation.companyId,
    action: 'INVITATION_RESENT',
    entityType: 'Invitation',
    entityId: invitationId,
    details: { email: invitation.email },
  });

  return {
    success: true,
    data: {
      inviteUrl: dispatchResult.inviteUrl,
      emailSent: dispatchResult.emailSent,
    },
  };
}

export async function toggleUserStatusAction(
  userId: string,
  newStatus: 'ACTIVE' | 'SUSPENDED'
): Promise<ActionResult> {
  const admin = await requireSuperAdmin();

  if (userId === admin.id) {
    return { success: false, error: 'You cannot alter your own administrative status.' };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return { success: false, error: 'User not found.' };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { status: newStatus },
  });

  if (newStatus === 'SUSPENDED') {
    await invalidateAllUserSessions(userId);
  }

  await logAuditEvent({
    userId: admin.id,
    action: `USER_${newStatus}`,
    entityType: 'User',
    entityId: userId,
    details: { email: user.email, previousStatus: user.status },
    severity: 'WARNING',
  });

  revalidatePath('/admin/users');
  return { success: true, data: undefined };
}

export async function requestSupportAccessAction(
  formData: FormData
): Promise<ActionResult<{ sessionId: string; expiresAt: Date }>> {
  const admin = await requireSuperAdmin();

  const companyId = formData.get('companyId')?.toString() || '';
  const reason = formData.get('reason')?.toString() || '';
  const ticketReference = formData.get('ticketReference')?.toString() || '';

  const parsed = supportAccessSchema.safeParse({ companyId, reason, ticketReference });
  if (!parsed.success) {
    return {
      success: false,
      error: 'A clear reason of at least 10 characters is required for support compliance.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const expiresAt = new Date(Date.now() + SUPPORT_SESSION_MAX_MINUTES * 60 * 1000);

  const session = await prisma.supportSession.create({
    data: {
      superAdminId: admin.id,
      companyId: parsed.data.companyId,
      reason: parsed.data.reason,
      ticketReference: parsed.data.ticketReference || null,
      expiresAt,
      isActive: true,
    },
  });

  await logAuditEvent({
    userId: admin.id,
    companyId: parsed.data.companyId,
    action: 'BREAK_GLASS_SUPPORT_SESSION_CREATED',
    entityType: 'SupportSession',
    entityId: session.id,
    details: {
      reason: parsed.data.reason,
      ticketReference: parsed.data.ticketReference,
      expiresAt,
    },
    severity: 'CRITICAL',
  });

  revalidatePath(`/admin/companies/${companyId}`);
  return {
    success: true,
    data: {
      sessionId: session.id,
      expiresAt,
    },
  };
}

export async function revokeSupportAccessAction(
  sessionId: string
): Promise<ActionResult> {
  const admin = await requireSuperAdmin();

  const session = await prisma.supportSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    return { success: false, error: 'Support session not found.' };
  }

  await prisma.supportSession.update({
    where: { id: sessionId },
    data: {
      isActive: false,
      revokedAt: new Date(),
    },
  });

  await logAuditEvent({
    userId: admin.id,
    companyId: session.companyId,
    action: 'BREAK_GLASS_SUPPORT_SESSION_REVOKED',
    entityType: 'SupportSession',
    entityId: sessionId,
    severity: 'WARNING',
  });

  revalidatePath(`/admin/companies/${session.companyId}`);
  return { success: true, data: undefined };
}
