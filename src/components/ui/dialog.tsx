"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

/* ------------------------------------------------------------------ */
/*  Dialog                                                             */
/* ------------------------------------------------------------------ */

type DialogProps = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
};

function Dialog({ open, onClose, children, className }: DialogProps) {
  const dialogRef = React.useRef<HTMLDialogElement>(null);

  React.useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;

    if (open && !el.open) {
      el.showModal();
    } else if (!open && el.open) {
      el.close();
    }
  }, [open]);

  // Close on backdrop click
  const handleClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === dialogRef.current) {
      onClose();
    }
  };

  // Close on Escape (native dialog does this, but we sync state)
  const handleCancel = (e: React.SyntheticEvent) => {
    e.preventDefault();
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className={cn(
        "w-full max-w-md rounded-md border border-border bg-white p-0 shadow-sm",
        "backdrop:bg-foreground/20",
        "open:animate-in open:fade-in-0 open:zoom-in-95",
        className
      )}
      onClick={handleClick}
      onCancel={handleCancel}
      aria-modal="true"
    >
      {open && children}
    </dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function DialogHeader({
  children,
  title,
  description,
  onClose,
  className,
}: {
  children?: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  onClose?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between border-b border-border px-5 py-4",
        className
      )}
    >
      <div>
        {title ? (
          <h2 className="text-base font-medium text-foreground">{title}</h2>
        ) : null}
        {description ? (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        ) : null}
        {children}
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground text-sm p-1 rounded"
          aria-label="Close"
        >
          ✕
        </button>
      )}
    </div>
  );
}

function DialogBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("px-5 py-4 text-sm text-foreground/80", className)}>
      {children}
    </div>
  );
}

function DialogFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-2 border-t border-border px-5 py-3",
        className
      )}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ConfirmDialog                                                      */
/* ------------------------------------------------------------------ */

type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
};

function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogHeader>{title}</DialogHeader>
      <DialogBody>{description}</DialogBody>
      <DialogFooter>
        <Button variant="secondary" onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button variant="danger" onClick={onConfirm} loading={loading}>
          {confirmLabel}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}

export {
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  ConfirmDialog,
};
