"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ToastVariant = "success" | "error" | "info";

type Toast = {
  id: string;
  variant: ToastVariant;
  message: string;
};

type ToastContextValue = {
  toasts: Toast[];
  addToast: (variant: ToastVariant, message: string) => void;
  removeToast: (id: string) => void;
};

/* ------------------------------------------------------------------ */
/*  Context                                                            */
/* ------------------------------------------------------------------ */

const ToastContext = React.createContext<ToastContextValue | null>(null);

function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  Styling                                                            */
/* ------------------------------------------------------------------ */

const variantStyles: Record<ToastVariant, string> = {
  success: "border-emerald-300 bg-emerald-50 text-emerald-800",
  error: "border-red-300 bg-red-50 text-red-800",
  info: "border-blue-300 bg-blue-50 text-blue-800",
};

const variantLabels: Record<ToastVariant, string> = {
  success: "Success",
  error: "Error",
  info: "Info",
};

const AUTO_DISMISS_MS = 5000;

/* ------------------------------------------------------------------ */
/*  ToastItem                                                          */
/* ------------------------------------------------------------------ */

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  React.useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-start gap-3 rounded-md border px-4 py-3 text-sm shadow-sm",
        variantStyles[toast.variant]
      )}
    >
      <span className="font-medium">{variantLabels[toast.variant]}:</span>
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="ml-2 shrink-0 opacity-60 hover:opacity-100 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 flex items-center justify-center"
        aria-label="Dismiss notification"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Provider                                                           */
/* ------------------------------------------------------------------ */

function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const addToast = React.useCallback(
    (variant: ToastVariant, message: string) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, variant, message }]);
    },
    []
  );

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = React.useMemo(
    () => ({ toasts, addToast, removeToast }),
    [toasts, addToast, removeToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast container — bottom-right */}
      <div
        aria-label="Notifications"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export { ToastProvider, useToast };
export type { ToastVariant, Toast };
