'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  DashboardIcon,
  CalendarIcon,
  PatientIcon,
  ClipboardIcon,
  StaffIcon,
  SettingsIcon,
  ToothIcon,
  MenuIcon,
  XIcon,
  HomeIcon,
} from '@/components/icons';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
}

const companyNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/app', icon: DashboardIcon },
  { label: 'Schedule', href: '/app/schedule', icon: CalendarIcon },
  { label: 'Patients', href: '/app/patients', icon: PatientIcon },
  { label: 'Treatments', href: '/app/treatments', icon: ClipboardIcon },
  { label: 'Staff', href: '/app/staff', icon: StaffIcon },
  { label: 'Settings', href: '/app/settings', icon: SettingsIcon },
];

// Bottom nav items for mobile (max 5)
const mobileNavItems: NavItem[] = [
  { label: 'Home', href: '/app', icon: HomeIcon },
  { label: 'Schedule', href: '/app/schedule', icon: CalendarIcon },
  { label: 'Patients', href: '/app/patients', icon: PatientIcon },
  { label: 'Treatments', href: '/app/treatments', icon: ClipboardIcon },
  { label: 'More', href: '/app/settings', icon: SettingsIcon },
];

interface CompanySidebarProps {
  companyName?: string;
}

export function CompanySidebar({ companyName }: CompanySidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/app') return pathname === '/app';
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile top bar with menu button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-50 p-2 rounded hover:bg-surface-secondary transition-colors"
        aria-label="Open navigation"
      >
        <MenuIcon size={20} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/20 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-full w-sidebar bg-surface border-r border-border flex flex-col transition-transform duration-200',
          'lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo / Company name */}
        <div className="flex items-center justify-between h-topbar px-5 border-b border-border">
          <Link href="/app" className="flex items-center gap-2 min-w-0">
            <ToothIcon className="text-accent shrink-0" size={22} />
            <span className="text-[15px] font-medium text-foreground tracking-tight truncate">
              {companyName || 'Dentalo'}
            </span>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1 rounded hover:bg-surface-secondary transition-colors"
            aria-label="Close navigation"
          >
            <XIcon size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 pt-4 space-y-0.5">
          {companyNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded text-body transition-colors',
                isActive(item.href)
                  ? 'bg-accent/8 text-accent font-medium'
                  : 'text-muted-foreground hover:bg-surface-secondary hover:text-foreground'
              )}
            >
              <item.icon className="shrink-0" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border">
          <p className="text-label text-muted truncate">
            {companyName || 'Clinic Workspace'}
          </p>
        </div>
      </aside>

      {/* Mobile bottom navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface border-t border-border flex justify-around py-1 safe-area-inset-bottom">
        {mobileNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center gap-0.5 py-2 px-3 min-w-[44px] min-h-[44px] justify-center rounded transition-colors',
              isActive(item.href)
                ? 'text-accent'
                : 'text-muted hover:text-foreground'
            )}
          >
            <item.icon size={20} />
            <span className="text-[11px]">{item.label}</span>
          </Link>
        ))}
      </nav>
    </>
  );
}
