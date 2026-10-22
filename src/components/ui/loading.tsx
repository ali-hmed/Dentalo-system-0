import * as React from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Spinner                                                            */
/* ------------------------------------------------------------------ */

type SpinnerProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
};

function Spinner({ size = "md", className }: SpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-8 w-8",
  };

  return (
    <svg
      className={cn("animate-spin text-accent", sizeClasses[size], className)}
      viewBox="0 0 24 24"
      fill="none"
      role="status"
      aria-label="Loading"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z"
      />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

type SkeletonProps = {
  className?: string;
};

function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-border",
        className
      )}
      aria-hidden="true"
    />
  );
}

/* ------------------------------------------------------------------ */
/*  TableSkeleton                                                      */
/* ------------------------------------------------------------------ */

function TableSkeleton({
  rows = 5,
  columns = 4,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn("w-full space-y-0", className)}>
      {/* Header */}
      <div className="flex gap-4 bg-surface-secondary px-4 py-3">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, ri) => (
        <div
          key={ri}
          className="flex gap-4 border-t border-border px-4 py-3"
        >
          {Array.from({ length: columns }).map((_, ci) => (
            <Skeleton key={ci} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  CardSkeleton                                                       */
/* ------------------------------------------------------------------ */

function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-md border border-border bg-white p-5 space-y-3",
        className
      )}
    >
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PageLoading                                                        */
/* ------------------------------------------------------------------ */

function PageLoading({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center py-24",
        className
      )}
    >
      <Spinner size="lg" />
    </div>
  );
}

export {
  Spinner,
  Skeleton,
  TableSkeleton,
  CardSkeleton,
  PageLoading,
};
export type { SpinnerProps, SkeletonProps };
