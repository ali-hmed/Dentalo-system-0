"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Tab = {
  id: string;
  label: string;
  disabled?: boolean;
};

type TabsProps = {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  className?: string;
};

/* ------------------------------------------------------------------ */
/*  Tabs                                                               */
/* ------------------------------------------------------------------ */

function Tabs({ tabs, activeTab, onTabChange, className }: TabsProps) {
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    const enabledTabs = tabs.filter((t) => !t.disabled);
    const currentEnabledIndex = enabledTabs.findIndex(
      (t) => t.id === tabs[index].id
    );

    let nextTab: Tab | undefined;

    if (e.key === "ArrowRight") {
      e.preventDefault();
      nextTab =
        enabledTabs[(currentEnabledIndex + 1) % enabledTabs.length];
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      nextTab =
        enabledTabs[
          (currentEnabledIndex - 1 + enabledTabs.length) %
            enabledTabs.length
        ];
    } else if (e.key === "Home") {
      e.preventDefault();
      nextTab = enabledTabs[0];
    } else if (e.key === "End") {
      e.preventDefault();
      nextTab = enabledTabs[enabledTabs.length - 1];
    }

    if (nextTab) {
      onTabChange(nextTab.id);
      // Focus the newly activated tab
      const el = document.getElementById(`tab-${nextTab.id}`);
      el?.focus();
    }
  };

  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      className={cn(
        "flex border-b border-border",
        className
      )}
    >
      {tabs.map((tab, index) => {
        const isActive = tab.id === activeTab;

        return (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            role="tab"
            type="button"
            aria-selected={isActive}
            aria-controls={`tabpanel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            disabled={tab.disabled}
            onClick={() => onTabChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={cn(
              "relative px-4 py-2.5 text-sm transition-colors min-h-[44px] sm:min-h-0",
              "focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent",
              "disabled:pointer-events-none disabled:opacity-40",
              isActive
                ? "text-foreground font-medium"
                : "text-foreground/50 hover:text-foreground/80",
              isActive &&
                "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-accent"
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  TabPanel                                                           */
/* ------------------------------------------------------------------ */

function TabPanel({
  id,
  activeTab,
  children,
  className,
}: {
  id: string;
  activeTab: string;
  children: React.ReactNode;
  className?: string;
}) {
  if (id !== activeTab) return null;

  return (
    <div
      id={`tabpanel-${id}`}
      role="tabpanel"
      aria-labelledby={`tab-${id}`}
      tabIndex={0}
      className={cn("py-4", className)}
    >
      {children}
    </div>
  );
}

export { Tabs, TabPanel };
export type { TabsProps, Tab };
