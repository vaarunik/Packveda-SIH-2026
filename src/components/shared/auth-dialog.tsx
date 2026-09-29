"use client";

// Global authentication gate dialog — "Sign in to PackVeda".
// Opened whenever a logged-out visitor tries to use an authenticated
// capability (Start Packaging Analysis, Ask PackVeda, Marketplace matching…).
// Offers Sign In / Create Account and hands over to the dedicated auth view.

import { LogIn, UserPlus, ShieldCheck } from "lucide-react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { usePackVeda } from "@/lib/store";

export function AuthDialog() {
  const authDialog = usePackVeda((s) => s.authDialog);
  const openAuthDialog = usePackVeda((s) => s.openAuthDialog);
  const closeAuthDialog = usePackVeda((s) => s.closeAuthDialog);
  const setAuthMode = usePackVeda((s) => s.setAuthMode);
  const setView = usePackVeda((s) => s.setView);

  function go(mode: "signin" | "signup") {
    setAuthMode(mode);
    closeAuthDialog();
    setView("signin");
  }

  return (
    <Dialog
      open={authDialog.open}
      onOpenChange={(open) => {
        if (!open) closeAuthDialog();
        else openAuthDialog({ mode: authDialog.mode });
      }}
    >
      <DialogContent className="max-w-md gap-0 overflow-hidden p-0">
        <div className="bg-navy-950 bg-grid-navy px-6 pb-6 pt-8 text-center">
          <span className="mx-auto flex size-14 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-white/25">
            <Image
              src="/packveda-icon.png"
              alt=""
              width={56}
              height={56}
              className="size-full object-contain"
            />
          </span>
          <DialogHeader className="mt-4 space-y-2 text-center">
            <DialogTitle className="text-xl font-bold text-cream-50">
              {authDialog.title}
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed text-cream-100/70">
              {authDialog.subtitle}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-4 px-6 py-6">
          <div className="grid gap-2.5 sm:grid-cols-2">
            <Button
              onClick={() => go("signin")}
              className="gap-2 bg-forest-700 text-white hover:bg-forest-600"
            >
              <LogIn className="size-4" aria-hidden />
              Sign In
            </Button>
            <Button
              onClick={() => go("signup")}
              variant="outline"
              className="gap-2 border-forest-700/30 text-forest-800 hover:bg-forest-50"
            >
              <UserPlus className="size-4" aria-hidden />
              Create Account
            </Button>
          </div>
          <p className="flex items-start gap-2 text-xs leading-relaxed text-navy-600">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-forest-600" aria-hidden />
            PackVeda is free to explore publicly — an account unlocks analyses,
            the AI assistant, supplier matching and Packaging Passports.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AuthDialog;
