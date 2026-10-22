"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Column<T> = {
  key: string;
  header: string;
  render?: (row: T, index: number) => React.ReactNode;
  className?: string;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string | number;
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  /** Pagination */
  page?: number;
  pageSize?: number;
  totalCount?: number;
  onPageChange?: (page: number) => void;
  className?: string;
};

/* ------------------------------------------------------------------ */
/*  Skeleton rows                                                      */
/* ------------------------------------------------------------------ */

function SkeletonRows({ columns, rows }: { columns: number; rows: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, ri) => (
        <tr key={ri} className="border-t border-border">
          {Array.from({ length: columns }).map((_, ci) => (
            <td key={ci} className="px-4 py-3">
              <div className="h-4 w-3/4 animate-pulse rounded bg-border" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  DataTable                                                          */
/* ------------------------------------------------------------------ */

function DataTable<T>({
  columns,
  data,
  keyExtractor,
  loading = false,
  emptyMessage = "No data to display.",
  onRowClick,
  page,
  pageSize,
  totalCount,
  onPageChange,
  className,
}: DataTableProps<T>) {
  const hasPagination =
    page !== undefined &&
    pageSize !== undefined &&
    totalCount !== undefined &&
    onPageChange !== undefined;

  const totalPages = hasPagination
    ? Math.max(1, Math.ceil(totalCount! / pageSize!))
    : 1;

  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <table className="w-full min-w-[600px] text-sm">
        <thead>
          <tr className="bg-surface-secondary">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-4 py-2.5 text-left text-xs font-medium text-foreground/60",
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <SkeletonRows columns={columns.length} rows={pageSize ?? 5} />
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-12 text-center text-sm text-foreground/50"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <tr
                key={keyExtractor(row, index)}
                className={cn(
                  "border-t border-border transition-colors",
                  onRowClick &&
                    "cursor-pointer hover:bg-surface-secondary"
                )}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn("px-4 py-3 text-foreground", col.className)}
                  >
                    {col.render
                      ? col.render(row, index)
                      : (row as Record<string, unknown>)[col.key] as React.ReactNode}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Pagination */}
      {hasPagination && !loading && data.length > 0 && (
        <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-xs text-foreground/60">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => onPageChange!(page! - 1)}
              disabled={page! <= 1}
              className="rounded-md border border-border px-3 py-1.5 hover:bg-surface-secondary disabled:opacity-40 disabled:pointer-events-none min-h-[44px] sm:min-h-0"
              aria-label="Previous page"
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange!(page! + 1)}
              disabled={page! >= totalPages}
              className="rounded-md border border-border px-3 py-1.5 hover:bg-surface-secondary disabled:opacity-40 disabled:pointer-events-none min-h-[44px] sm:min-h-0"
              aria-label="Next page"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export { DataTable };
export type { DataTableProps, Column };
