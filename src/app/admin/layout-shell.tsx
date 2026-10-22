'use client';

import React from 'react';
import { AdminSidebar } from '@/components/layouts/admin-sidebar';

interface AdminLayoutShellProps {
  userName: string;
  userEmail: string;
  children: React.ReactNode;
}

export function AdminLayoutShell({ children }: AdminLayoutShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <AdminSidebar />
      <main className="lg:pl-sidebar">
        {children}
      </main>
    </div>
  );
}
