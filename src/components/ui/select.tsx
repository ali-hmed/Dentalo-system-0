import * as React from "react";
import { cn } from "@/lib/utils";

export type SelectOption = { label: string; value: string };

type SelectProps = React.ComponentProps<"select"> & {
  label?: string;
  error?: string;
  description?: string;
  options?: SelectOption[];
};

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, description, id, options, children, ...props }, ref) => {
    const selectId = id || React.useId();
    const errorId = error ? `${selectId}-error` : undefined;
    const descId = description ? `${selectId}-desc` : undefined;

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={selectId}
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
        <select
          ref={ref}
          id={selectId}
          className={cn(
            "h-9 w-full rounded-md border border-border bg-white px-3 text-sm text-foreground",
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
        >
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        {error && (
          <p id={errorId} className="text-xs text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";

export { Select };
export type { SelectProps };
