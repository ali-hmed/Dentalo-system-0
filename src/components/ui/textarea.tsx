import * as React from "react";
import { cn } from "@/lib/utils";

type TextareaProps = React.ComponentProps<"textarea"> & {
  label?: string;
  error?: string;
  description?: string;
};

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, description, id, ...props }, ref) => {
    const textareaId = id || React.useId();
    const errorId = error ? `${textareaId}-error` : undefined;
    const descId = description ? `${textareaId}-desc` : undefined;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={textareaId}
            className="text-xs font-medium text-foreground"
          >
            {label}
          </label>
        )}
        {description && (
          <p id={descId} className="text-xs text-foreground/60">
            {description}
          </p>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            "min-h-[80px] w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-foreground",
            "placeholder:text-foreground/40",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
            "disabled:cursor-not-allowed disabled:opacity-50",
            error && "border-red-500 focus-visible:outline-red-500",
            className
          )}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            [errorId, descId].filter(Boolean).join(" ") || undefined
          }
          {...props}
        />
        {error && (
          <p id={errorId} className="text-xs text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

export { Textarea };
export type { TextareaProps };
