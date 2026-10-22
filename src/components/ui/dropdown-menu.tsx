"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type MenuItem = {
  label: string;
  onClick: () => void;
  variant?: "default" | "danger";
  disabled?: boolean;
};

type DropdownMenuProps = {
  items: MenuItem[];
  trigger?: React.ReactNode;
  align?: "left" | "right";
  className?: string;
};

/* ------------------------------------------------------------------ */
/*  DropdownMenu                                                       */
/* ------------------------------------------------------------------ */

function DropdownMenu({
  items,
  trigger,
  align = "right",
  className,
}: DropdownMenuProps) {
  const [open, setOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  // Keyboard nav
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    const menu = menuRef.current;
    if (!menu) return;

    const menuItems = menu.querySelectorAll<HTMLButtonElement>(
      '[role="menuitem"]:not(:disabled)'
    );
    const current = document.activeElement as HTMLElement;
    const idx = Array.from(menuItems).indexOf(current as HTMLButtonElement);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      menuItems[(idx + 1) % menuItems.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      menuItems[(idx - 1 + menuItems.length) % menuItems.length]?.focus();
    }
  };

  return (
    <div className={cn("relative inline-block", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-foreground/60 hover:bg-surface-secondary hover:text-foreground min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Open menu"
      >
        {trigger ?? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <circle cx="8" cy="3" r="1.25" />
            <circle cx="8" cy="8" r="1.25" />
            <circle cx="8" cy="13" r="1.25" />
          </svg>
        )}
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          onKeyDown={handleKeyDown}
          className={cn(
            "absolute z-40 mt-1 min-w-[160px] rounded-md border border-border bg-white py-1 shadow-sm",
            align === "right" ? "right-0" : "left-0"
          )}
        >
          {items.map((item, i) => (
            <button
              key={i}
              role="menuitem"
              disabled={item.disabled}
              className={cn(
                "flex w-full items-center px-3 py-2 text-left text-sm transition-colors min-h-[44px] sm:min-h-0",
                "hover:bg-surface-secondary focus:bg-surface-secondary focus:outline-none",
                "disabled:pointer-events-none disabled:opacity-50",
                item.variant === "danger"
                  ? "text-red-600"
                  : "text-foreground"
              )}
              onClick={() => {
                item.onClick();
                setOpen(false);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export { DropdownMenu };
export type { DropdownMenuProps, MenuItem };
