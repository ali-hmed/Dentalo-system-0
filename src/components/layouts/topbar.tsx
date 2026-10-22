'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDownIcon, LogOutIcon } from '@/components/icons';

interface TopbarProps {
  title: string;
  userName?: string;
  userEmail?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

export function Topbar({ title, userName, userEmail, actions, children }: TopbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="flex items-center justify-between h-topbar px-4 lg:px-6">
        {/* Left: title and children (search, filters, etc.) */}
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <h1 className="text-page-title font-medium text-foreground truncate pl-10 lg:pl-0">
            {title}
          </h1>
          {children}
        </div>

        {/* Right: actions and account */}
        <div className="flex items-center gap-3 shrink-0">
          {actions}

          {/* Account menu */}
          {userName && (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-surface-secondary transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-accent/10 text-accent flex items-center justify-center text-label font-medium">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <span className="hidden md:block text-body text-foreground max-w-[120px] truncate">
                  {userName}
                </span>
                <ChevronDownIcon size={14} className="hidden md:block text-muted" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-surface border border-border rounded shadow-dialog py-1 z-50">
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-body font-medium text-foreground truncate">
                      {userName}
                    </p>
                    {userEmail && (
                      <p className="text-label text-muted truncate">{userEmail}</p>
                    )}
                  </div>
                  <form action="/api/auth/logout" method="POST">
                    <button
                      type="submit"
                      className="w-full flex items-center gap-2 px-3 py-2 text-body text-muted-foreground hover:bg-surface-secondary transition-colors"
                    >
                      <LogOutIcon size={16} />
                      <span>Sign out</span>
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
