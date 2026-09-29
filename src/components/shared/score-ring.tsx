"use client";

import { cn } from "@/lib/utils";
import { Term } from "@/components/shared/term-tooltip";

/** Circular SVG score gauge for the overall compatibility score (0-100). */
export function ScoreRing({
  value,
  size = 132,
  stroke = 10,
  label = "Overall Compatibility",
  className,
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct / 100);
  const color =
    pct >= 75 ? "var(--color-forest-600)" : pct >= 50 ? "var(--color-forest-500)" : "var(--color-sand-400)";
  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      role="img"
      aria-label={`${label}: ${pct.toFixed(0)} out of 100`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-cream-200)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-navy-950 tabular-nums">
          {pct.toFixed(0)}
        </span>
        <span className="text-[10px] uppercase tracking-wider text-navy-600">
          / 100
        </span>
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}

/** Horizontal labelled bar for score breakdowns. */
export function ScoreBar({
  label,
  value,
  tooltipKey,
  suffix,
}: {
  label: string;
  value: number; // 0..1
  tooltipKey?: Parameters<typeof Term>[0]["k"];
  suffix?: string;
}) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-navy-700 font-medium">
          {label}
          {tooltipKey && <Term k={tooltipKey} className="ml-1" />}
        </span>
        <span className="text-navy-950 font-semibold tabular-nums">
          {pct}%{suffix}
        </span>
      </div>
      <div className="h-2 rounded-full bg-cream-200 overflow-hidden">
        <div
          className="h-full rounded-full bg-forest-600 transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default ScoreRing;
