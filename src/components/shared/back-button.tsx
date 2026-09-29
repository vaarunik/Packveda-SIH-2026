"use client";

// Shared Back button for inner application pages.
// Uses real browser history when the previous entry belongs to the app
// (the SPA pushes history state on view change), otherwise falls back to
// the provided target view. Form/wizard data lives in the Zustand store, so
// navigating back never loses entered data.

import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePackVeda, type View } from "@/lib/store";
import { cn } from "@/lib/utils";

export function BackButton({
  label,
  fallback,
  className,
}: {
  label: string;
  /** View to navigate to when there is no in-app history entry */
  fallback: View;
  className?: string;
}) {
  const setView = usePackVeda((s) => s.setView);

  function goBack() {
    if (
      typeof window !== "undefined" &&
      window.history.length > 1 &&
      window.history.state?.packveda === true
    ) {
      window.history.back();
    } else {
      setView(fallback);
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={goBack}
      className={cn(
        "-ml-2 gap-1.5 text-navy-700 hover:bg-cream-200/70 hover:text-navy-950",
        className
      )}
    >
      <ArrowLeft className="size-4" aria-hidden />
      {label}
    </Button>
  );
}

export default BackButton;
