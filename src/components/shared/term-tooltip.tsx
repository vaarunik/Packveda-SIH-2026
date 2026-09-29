"use client";

import { Info } from "lucide-react";
import { GLOSSARY, GlossaryKey } from "@/lib/glossary";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Inline tooltip for technical terms (OTR, WVTR, water activity, ...).
 * Renders children as a subtly underlined span; the tooltip shows the
 * plain-language definition from the glossary.
 */
export function Term({
  k,
  children,
  className,
}: {
  k: GlossaryKey;
  children?: React.ReactNode;
  className?: string;
}) {
  const entry = GLOSSARY[k];
  if (!entry) return <>{children}</>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          role="button"
          tabIndex={0}
          aria-label={`${entry.short}: ${entry.definition}`}
          className={cn(
            "inline-flex items-center gap-0.5 cursor-help border-b border-dashed border-muted-foreground/50 hover:border-foreground transition-colors",
            className
          )}
        >
          {children ?? entry.term}
          <Info className="size-3 text-muted-foreground" aria-hidden />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-72 text-left">
        <p className="font-semibold text-foreground mb-1">{entry.short}</p>
        <p className="text-muted-foreground text-xs leading-relaxed">
          {entry.definition}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

export default Term;
