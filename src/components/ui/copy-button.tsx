"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type CopyButtonProps = Omit<React.ComponentProps<"button">, "onClick"> & {
  text: string;
  label?: string;
  copiedLabel?: string;
};

const CopyButton = React.forwardRef<HTMLButtonElement, CopyButtonProps>(
  (
    {
      text,
      label = "Copy",
      copiedLabel = "Copied",
      className,
      children,
      ...props
    },
    ref
  ) => {
    const [copied, setCopied] = React.useState(false);

    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Fallback: do nothing (clipboard API may not be available)
      }
    };

    return (
      <button
        ref={ref}
        type="button"
        onClick={handleCopy}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs text-foreground transition-colors",
          "hover:bg-surface-secondary active:bg-border",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          "min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0",
          className
        )}
        aria-label={copied ? copiedLabel : label}
        {...props}
      >
        {copied ? (
          <>
            {/* Check icon */}
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M2.5 7.5l3 3 6-6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {copiedLabel}
          </>
        ) : (
          <>
            {children ?? (
              <>
                {/* Copy icon */}
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  aria-hidden="true"
                >
                  <rect
                    x="4.5"
                    y="4.5"
                    width="7"
                    height="8"
                    rx="1"
                    stroke="currentColor"
                    strokeWidth="1.25"
                  />
                  <path
                    d="M9.5 4.5V3a1 1 0 00-1-1H3a1 1 0 00-1 1v7.5a1 1 0 001 1h1.5"
                    stroke="currentColor"
                    strokeWidth="1.25"
                  />
                </svg>
                {label}
              </>
            )}
          </>
        )}
      </button>
    );
  }
);

CopyButton.displayName = "CopyButton";

export { CopyButton };
export type { CopyButtonProps };
