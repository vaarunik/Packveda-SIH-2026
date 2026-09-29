"use client";

import { Badge } from "@/components/ui/badge";
import { CheckCircle2, FlaskConical, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";

export type Maturity = "available" | "prototype" | "future";

const CONFIG: Record<
  Maturity,
  { label: string; icon: React.ElementType; className: string }
> = {
  available: {
    label: "Available Now",
    icon: CheckCircle2,
    className:
      "bg-forest-100 text-forest-800 border-forest-600/30 hover:bg-forest-100",
  },
  prototype: {
    label: "Prototype",
    icon: FlaskConical,
    className:
      "bg-amber-100 text-amber-900 border-amber-600/30 hover:bg-amber-100",
  },
  future: {
    label: "Future Integration",
    icon: Rocket,
    className:
      "bg-navy-800/10 text-navy-800 border-navy-800/25 hover:bg-navy-800/10 dark:bg-white/10 dark:text-cream-100 dark:border-white/20",
  },
};

/** Communicates feature maturity honestly: Available Now / Prototype / Future Integration. */
export function MaturityBadge({
  status,
  label,
  className,
}: {
  status: Maturity;
  label?: string;
  className?: string;
}) {
  const cfg = CONFIG[status];
  const Icon = cfg.icon;
  return (
    <Badge
      variant="outline"
      className={cn("gap-1 font-medium text-[11px] px-2 py-0.5", cfg.className, className)}
    >
      <Icon className="size-3" aria-hidden />
      {label ?? cfg.label}
    </Badge>
  );
}

export default MaturityBadge;
