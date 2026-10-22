'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  DashboardIcon,
  CompanyIcon,
  UsersIcon,
  ActivityIcon,
  SettingsIcon,
  ToothIcon,
  MenuIcon,
  XIcon,
} from '@/components/icons';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
}

const adminNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: DashboardIcon },
  { label: 'Companies', href: '/admin/companies', icon: CompanyIcon },
  { label: 'Users', href: '/admin/users', icon: UsersIcon },
  { label: 'Activity Log', href: '/admin/activity', icon: ActivityIcon },
  { label: 'Settings', href: '/admin/settings', icon: SettingsIcon },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/admin') return pathname === '/admin';
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile menu button */}
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

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-40 h-full w-sidebar bg-surface border-r border-border flex flex-col transition-transform duration-200',
          'lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-topbar px-5 border-b border-border">
          <Link href="/admin" className="flex items-center gap-2">
            <ToothIcon className="text-accent" size={22} />
            <span className="text-[15px] font-medium text-foreground tracking-tight">
              Dentalo
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

        {/* Label */}
        <div className="px-5 pt-5 pb-2">
          <span className="text-label text-muted uppercase tracking-wider">
            Platform
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-0.5">
          {adminNavItems.map((item) => (
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
          <p className="text-label text-muted">Super Admin</p>
        </div>
      </aside>
    </>
  );
}
