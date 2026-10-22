import React from 'react';
import Link from 'next/link';
import { prisma } from '@/lib/db';
import { ToothIcon, AlertIcon } from '@/components/icons';
import { SetupAccountForm } from './setup-form';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Set Up Account — Dentalo',
  description: 'Complete your Dentalo account setup',
};

interface SetupAccountPageProps {
  searchParams?: Promise<{ token?: string }>;
}

export default async function SetupAccountPage({ searchParams }: SetupAccountPageProps) {
  const sp = (await searchParams) || {};
  const token = sp.token;

  if (!token) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center px-4 bg-background">
        <div className="w-full max-w-[400px] bg-surface border border-border rounded p-6 text-center">
          <div className="w-10 h-10 rounded-full bg-status-error-bg text-status-error flex items-center justify-center mx-auto mb-3">
            <AlertIcon size={20} />
          </div>
          <h1 className="text-page-title font-medium text-foreground mb-2">
            Invalid invitation link
          </h1>
          <p className="text-body text-muted mb-4">
            No invitation token was provided. Please check the link sent to your email or messaging channel.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
          >
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  // Validate token from database
  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: {
      company: {
        select: {
          name: true,
          status: true,
        },
      },
    },
  });

  if (!invitation || invitation.status !== 'PENDING' || invitation.expiresAt.getTime() < Date.now()) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center px-4 bg-background">
        <div className="w-full max-w-[400px] bg-surface border border-border rounded p-6 text-center">
          <div className="w-10 h-10 rounded-full bg-status-error-bg text-status-error flex items-center justify-center mx-auto mb-3">
            <AlertIcon size={20} />
          </div>
          <h1 className="text-page-title font-medium text-foreground mb-2">
            Invitation expired or revoked
          </h1>
          <p className="text-body text-muted mb-4">
            This invitation link is invalid, has expired, or has already been used. Please contact your clinic administrator for a new invitation.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
          >
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  const roleLabels: Record<string, string> = {
    OWNER: 'Clinic Owner',
    DENTIST: 'Dentist',
    RECEPTIONIST: 'Receptionist',
    HYGIENIST: 'Hygienist',
    ASSISTANT: 'Dental Assistant',
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-12 bg-background">
      <div className="w-full max-w-[420px]">
        {/* Brand header */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent mb-3">
            <ToothIcon size={24} />
          </div>
          <h1 className="text-page-title font-medium text-foreground tracking-tight">
            Complete your account setup
          </h1>
          <p className="text-body text-muted mt-1">
            Join {invitation.company.name} on Dentalo
          </p>
        </div>

        {/* Card */}
        <div className="bg-surface border border-border rounded p-6 shadow-subtle">
          <SetupAccountForm
            token={token}
            email={invitation.email}
            companyName={invitation.company.name}
            roleDescription={roleLabels[invitation.staffType] || invitation.staffType}
          />
        </div>
      </div>
    </div>
  );
}
