import React from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { ToothIcon } from '@/components/icons';
import { LoginForm } from './login-form';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Sign In — Dentalo',
  description: 'Sign in to Dentalo Clinic Management',
};

export default async function LoginPage() {
  const session = await getSession();
  if (session) {
    if (session.user.role === 'SUPER_ADMIN') {
      redirect('/admin');
    } else {
      redirect('/app');
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 bg-background">
      <div className="w-full max-w-[380px]">
        {/* Brand header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent mb-3">
            <ToothIcon size={24} />
          </div>
          <h1 className="text-page-title font-medium text-foreground tracking-tight">
            Sign in to Dentalo
          </h1>
          <p className="text-body text-muted mt-1">
            Dental clinic management platform
          </p>
        </div>

        {/* Card */}
        <div className="bg-surface border border-border rounded p-6 shadow-subtle">
          <LoginForm />
        </div>

        {/* Quiet support link */}
        <p className="text-center text-label text-muted mt-6">
          Need an account? Contact your clinic owner or system administrator.
        </p>
      </div>
    </div>
  );
}
