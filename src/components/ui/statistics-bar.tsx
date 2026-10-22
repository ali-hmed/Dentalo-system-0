import * as React from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type TrendDirection = "up" | "down" | "neutral";

type StatisticItem = {
  label: string;
  value: string | number;
  trend?: {
    direction: TrendDirection;
    text: string;
  };
};

type StatisticsBarProps = {
  items: StatisticItem[];
  className?: string;
};

/* ------------------------------------------------------------------ */
/*  Trend icon                                                         */
/* ------------------------------------------------------------------ */

function TrendIndicator({
  direction,
  text,
}: {
  direction: TrendDirection;
  text: string;
}) {
  const colors: Record<TrendDirection, string> = {
    up: "text-emerald-600",
    down: "text-red-600",
    neutral: "text-foreground/50",
  };

  const arrows: Record<TrendDirection, string> = {
    up: "↑",
    down: "↓",
    neutral: "→",
  };

  return (
    <span className={cn("text-xs", colors[direction])}>
      {arrows[direction]} {text}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  StatisticsBar                                                      */
/* ------------------------------------------------------------------ */

function StatisticsBar({ items, className }: StatisticsBarProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 divide-x divide-border rounded-md border border-border bg-white sm:grid-cols-none sm:grid-flow-col sm:auto-cols-fr",
        className
      )}
    >
      {items.map((item, i) => (
        <div
          key={i}
          className={cn(
            "flex flex-col gap-1 px-5 py-3",
            /* On mobile 2-col grid: add top border for rows after the first */
            i >= 2 && "border-t border-border sm:border-t-0"
          )}
        >
          <span className="text-xs text-foreground/50">{item.label}</span>
          <span className="text-lg font-medium text-foreground">
            {item.value}
          </span>
          {item.trend && (
            <TrendIndicator
              direction={item.trend.direction}
              text={item.trend.text}
            />
          )}
        </div>
      ))}
    </div>
  );
}

export { StatisticsBar, TrendIndicator };
export type { StatisticsBarProps, StatisticItem, TrendDirection };
