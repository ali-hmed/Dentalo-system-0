'use server';

import { headers } from 'next/headers';
import { prisma } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { createSession, setSessionCookie, invalidateSession } from '@/lib/auth/session';
import { checkRateLimit } from '@/lib/auth/rate-limit';
import { verifyCsrfOrigin } from '@/lib/auth/csrf';
import { logAuditEvent } from '@/lib/audit/logger';
import { loginSchema, setupAccountSchema } from '@/lib/validations';
import type { ActionResult } from '@/lib/types';

export async function loginAction(
  formData: FormData
): Promise<ActionResult<{ redirectUrl: string }>> {
  // 1. Verify CSRF
  if (!verifyCsrfOrigin()) {
    return { success: false, error: 'Invalid request origin. Please reload and try again.' };
  }

  // 2. Rate limiting by IP
  const headersList = headers();
  const forwardedFor = headersList.get('x-forwarded-for');
  const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1';
  const rateLimitKey = `login:${ip}`;

  const rateCheck = checkRateLimit(rateLimitKey, 5, 15 * 60 * 1000);
  if (!rateCheck.success) {
    const minutesLeft = Math.ceil((rateCheck.resetAt - Date.now()) / 60000);
    return {
      success: false,
      error: `Too many failed sign-in attempts. Please try again in ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''}.`,
    };
  }

  // 3. Validate input
  const email = formData.get('email')?.toString() || '';
  const password = formData.get('password')?.toString() || '';

  const parsed = loginSchema.safeParse({ email, password });
  if (!parsed.success) {
    return {
      success: false,
      error: 'Please check your email and password format.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  // 4. Find user
  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });

  if (!user) {
    return { success: false, error: 'Invalid email address or password.' };
  }

  if (user.status !== 'ACTIVE') {
    return {
      success: false,
      error:
        user.status === 'SUSPENDED'
          ? 'This account has been suspended. Please contact the platform administrator.'
          : 'This account is currently inactive.',
    };
  }

  // 5. Verify password
  const isValidPassword = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!isValidPassword) {
    return { success: false, error: 'Invalid email address or password.' };
  }

  // 6. Create session & set cookie
  const userAgent = headersList.get('user-agent') || undefined;
  const { token, expiresAt } = await createSession(user.id, ip, userAgent);
  await setSessionCookie(token, expiresAt);

  // 7. Audit log
  await logAuditEvent({
    userId: user.id,
    action: 'USER_LOGIN',
    entityType: 'User',
    entityId: user.id,
    ipAddress: ip,
    details: { userAgent },
  });

  // 8. Determine redirect
  const redirectUrl = user.role === 'SUPER_ADMIN' ? '/admin' : '/app';

  return {
    success: true,
    data: { redirectUrl },
  };
}

export async function setupAccountAction(
  formData: FormData
): Promise<ActionResult<{ redirectUrl: string }>> {
  // 1. Verify CSRF
  if (!verifyCsrfOrigin()) {
    return { success: false, error: 'Invalid request origin. Please reload and try again.' };
  }

  // 2. Validate input
  const token = formData.get('token')?.toString() || '';
  const name = formData.get('name')?.toString() || '';
  const password = formData.get('password')?.toString() || '';
  const confirmPassword = formData.get('confirmPassword')?.toString() || '';

  const parsed = setupAccountSchema.safeParse({ token, name, password, confirmPassword });
  if (!parsed.success) {
    return {
      success: false,
      error: 'Please resolve the highlighted validation errors.',
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  // 3. Find invitation
  const invitation = await prisma.invitation.findUnique({
    where: { token: parsed.data.token },
    include: { company: true },
  });

  if (!invitation || invitation.status !== 'PENDING' || invitation.expiresAt.getTime() < Date.now()) {
    return {
      success: false,
      error: 'This invitation is invalid, has expired, or was already accepted.',
    };
  }

  // 4. Hash password
  const passwordHash = await hashPassword(parsed.data.password);

  // 5. Atomic transaction
  const headersList = headers();
  const forwardedFor = headersList.get('x-forwarded-for');
  const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1';
  const userAgent = headersList.get('user-agent') || undefined;

  const result = await prisma.$transaction(async (tx) => {
    // Upsert or create user
    let user = await tx.user.findUnique({
      where: { email: invitation.email.toLowerCase() },
    });

    if (user) {
      user = await tx.user.update({
        where: { id: user.id },
        data: {
          name: parsed.data.name,
          passwordHash,
          status: 'ACTIVE',
        },
      });
    } else {
      user = await tx.user.create({
        data: {
          email: invitation.email.toLowerCase(),
          name: parsed.data.name,
          passwordHash,
          role: invitation.role,
          status: 'ACTIVE',
        },
      });
    }

    // Upsert membership
    await tx.companyMembership.upsert({
      where: {
        userId_companyId: {
          userId: user.id,
          companyId: invitation.companyId,
        },
      },
      create: {
        userId: user.id,
        companyId: invitation.companyId,
        staffType: invitation.staffType,
        status: 'ACTIVE',
      },
      update: {
        staffType: invitation.staffType,
        status: 'ACTIVE',
      },
    });

    // Mark invitation accepted
    await tx.invitation.update({
      where: { id: invitation.id },
      data: { status: 'ACCEPTED' },
    });

    // If company was PENDING_SETUP and the user is OWNER, activate company
    if (invitation.staffType === 'OWNER' && invitation.company.status === 'PENDING_SETUP') {
      await tx.company.update({
        where: { id: invitation.companyId },
        data: { status: 'ACTIVE' },
      });
    }

    return user;
  });

  // 6. Create session
  const { token: sessionToken, expiresAt } = await createSession(result.id, ip, userAgent);
  await setSessionCookie(sessionToken, expiresAt);

  // 7. Audit log
  await logAuditEvent({
    userId: result.id,
    companyId: invitation.companyId,
    action: 'ACCOUNT_SETUP_COMPLETED',
    entityType: 'User',
    entityId: result.id,
    ipAddress: ip,
    details: {
      companyName: invitation.company.name,
      staffType: invitation.staffType,
    },
  });

  return {
    success: true,
    data: { redirectUrl: '/app' },
  };
}

export async function logoutAction(): Promise<void> {
  await invalidateSession();
}
