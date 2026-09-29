"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center rounded-xl border border-dashed border-border bg-card/60 px-6 py-14",
        className
      )}
      role="status"
    >
      <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-forest-50 text-forest-700">
        <Icon className="size-7" aria-hidden />
      </div>
      <h3 className="text-lg font-semibold text-navy-950">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm leading-relaxed text-navy-600">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-5 bg-forest-700 hover:bg-forest-600">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export default EmptyState;
