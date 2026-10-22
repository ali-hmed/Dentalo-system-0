"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type SearchInputProps = Omit<React.ComponentProps<"input">, "onChange"> & {
  onSearch: (value: string) => void;
  debounceMs?: number;
  label?: string;
};

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, onSearch, debounceMs = 300, label, ...props }, ref) => {
    const [value, setValue] = React.useState(
      (props.defaultValue as string) ?? ""
    );
    const timerRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const next = e.target.value;
      setValue(next);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onSearch(next), debounceMs);
    };

    // Cleanup on unmount
    React.useEffect(() => {
      return () => clearTimeout(timerRef.current);
    }, []);

    return (
      <div className="relative">
        {label && (
          <span className="sr-only">{label}</span>
        )}
        {/* Magnifying glass icon */}
        <svg
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/40"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M13 13l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <input
          ref={ref}
          type="search"
          value={value}
          onChange={handleChange}
          className={cn(
            "h-9 w-full rounded-md border border-border bg-white pl-9 pr-3 text-sm text-foreground",
            "placeholder:text-foreground/40",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
            className
          )}
          aria-label={label ?? "Search"}
          {...props}
        />
      </div>
    );
  }
);

SearchInput.displayName = "SearchInput";

export { SearchInput };
export type { SearchInputProps };
