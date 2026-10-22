import * as React from "react";
import { cn } from "@/lib/utils";

type InputProps = React.ComponentProps<"input"> & {
  label?: string;
  error?: string;
  description?: string;
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, description, id, ...props }, ref) => {
    const inputId = id || React.useId();
    const errorId = error ? `${inputId}-error` : undefined;
    const descId = description ? `${inputId}-desc` : undefined;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
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
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "h-9 w-full rounded-md border border-border bg-white px-3 text-sm text-foreground",
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

Input.displayName = "Input";

export { Input };
export type { InputProps };
