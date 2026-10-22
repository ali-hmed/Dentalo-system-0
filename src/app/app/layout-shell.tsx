'use client';

import React from 'react';
import { CompanySidebar } from '@/components/layouts/company-sidebar';

interface CompanyLayoutShellProps {
  userName: string;
  userEmail: string;
  companyName: string;
  children: React.ReactNode;
}

export function CompanyLayoutShell({ companyName, children }: CompanyLayoutShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <CompanySidebar companyName={companyName} />
      <main className="lg:pl-sidebar pb-16 lg:pb-0">
        {children}
      </main>
    </div>
  );
}
