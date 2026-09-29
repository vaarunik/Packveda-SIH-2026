"use client";

// PACKVEDA — Onboarding: "Who are you?"
// A simple one-step role choice: Food Business (Buyer) vs Packaging
// Manufacturer (Seller). Creates a lightweight profile (name + email) that
// drives the dashboard experience and request scoping. Users can change
// roles later by re-running onboarding.

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, Factory, Loader2, UserRound, Wheat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BackButton } from "@/components/shared/back-button";
import { SectionHeading } from "@/components/shared/section-heading";
import { useToast } from "@/hooks/use-toast";
import { usePackVeda, type UserRole } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

const ROLES: {
  role: UserRole;
  icon: React.ElementType;
  title: string;
  desc: string;
  bullets: string[];
}[] = [
  {
    role: "buyer",
    icon: Wheat,
    title: "Food Business / Buyer",
    desc: "Analyse packaging requirements, get recommendations, compare materials and connect with suppliers.",
    bullets: [
      "Create a food profile & analyse requirements",
      "AI recommendations + material matching",
      "Compare, request samples & quotes",
      "Packaging Passport & trial records",
    ],
  },
  {
    role: "seller",
    icon: Factory,
    title: "Packaging Manufacturer / Seller",
    desc: "List your packaging materials with real properties and receive matched sample & quote requests.",
    bullets: [
      "Publish material listings (structure, OTR, WVTR, MOQ…)",
      "Materials matched against buyer requirements",
      "Receive sample & quote requests",
      "Track listings & profile completeness",
    ],
  },
];

export function OnboardingView() {
  const { setProfile, setView, profile } = usePackVeda();
  const { user } = useAuth();
  const { toast } = useToast();
  const [role, setRole] = useState<UserRole | null>(null);
  // Signed-in users get their email prefilled from the auth account — the
  // server also forces this server-side, so the value is authoritative.
  const [form, setForm] = useState({
    name: profile?.name ?? "",
    email: user?.email ?? profile?.email ?? "",
    company: profile?.company ?? "",
    location: profile?.location ?? "",
  });
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!role) return;
    if (!form.name.trim() || !form.email.trim()) {
      toast({
        title: "Name and email are required",
        description: "We use them to scope your profile, listings and requests.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          name: form.name.trim(),
          email: form.email.trim(),
          company: form.company.trim(),
          location: form.location.trim(),
        }),
      });
      const data = (await res.json()) as {
        profile?: { id: string; role: UserRole; name: string; email: string; company: string; location?: string };
        error?: string;
      };
      if (!res.ok || !data.profile) throw new Error(data.error || "Could not save profile");
      setProfile({ ...data.profile, location: form.location.trim() });
      toast({
        title: role === "buyer" ? "Welcome to PackVeda" : "Seller Studio ready",
        description:
          role === "buyer"
            ? "Your buyer profile is saved. Start with a packaging analysis."
            : "Your seller profile is saved. Add your first material listing.",
      });
      setView(role === "buyer" ? "dashboard" : "seller");
    } catch (err) {
      toast({
        title: "Could not save profile",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <BackButton label="Back" fallback="home" />

      {/* Brand lockup — official PackVeda logo (transparent PNG) */}
      <div className="mt-4 flex justify-center">
        <Image
          src="/packveda-logo.png"
          alt="PackVeda — Packaging Intelligence, Backed by Science"
          width={396}
          height={343}
          priority
          className="h-auto w-44 sm:w-56"
        />
      </div>

      <SectionHeading
        eyebrow="Get started"
        title="Who are you?"
        description="PackVeda serves two sides of food packaging. Choose how you want to use the platform — you can change or update your profile later."
        className="mt-4"
      />

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {ROLES.map((r, i) => {
          const Icon = r.icon;
          const active = role === r.role;
          return (
            <motion.button
              key={r.role}
              type="button"
              onClick={() => setRole(r.role)}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.08 }}
              aria-pressed={active}
              className={cn(
                "rounded-xl border bg-card p-6 text-left shadow-sm transition-all focus-visible:outline-2 focus-visible:outline-ring",
                active
                  ? "border-forest-600 ring-2 ring-forest-600/30"
                  : "border-border hover:border-forest-600/40"
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex size-11 items-center justify-center rounded-lg",
                    active ? "bg-forest-700 text-white" : "bg-forest-50 text-forest-700"
                  )}
                >
                  <Icon className="size-5.5" aria-hidden />
                </span>
                <h3 className="text-base font-bold text-navy-950">{r.title}</h3>
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-navy-600">{r.desc}</p>
              <ul className="mt-3 space-y-1.5">
                {r.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-[12.5px] text-navy-800">
                    <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-forest-600" aria-hidden />
                    {b}
                  </li>
                ))}
              </ul>
            </motion.button>
          );
        })}
      </div>

      {role && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="mt-6">
            <CardContent className="p-6">
              <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-navy-800">
                <UserRound className="size-4" aria-hidden />
                Your details
              </h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                  <Label htmlFor="ob-name">Name *</Label>
                  <Input
                    id="ob-name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Your name"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="ob-email">Business email *</Label>
                  <Input
                    id="ob-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="you@company.in"
                    readOnly={Boolean(user?.email)}
                  />
                  {user?.email && (
                    <p className="text-[11.5px] text-navy-600">
                      Signed in as {user.email} — email is taken from your account.
                    </p>
                  )}
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="ob-company">{role === "seller" ? "Company name" : "Food business (optional)"}</Label>
                  <Input
                    id="ob-company"
                    value={form.company}
                    onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                    placeholder={role === "seller" ? "e.g. Bharat Flexipack" : "e.g. Sharma Foods"}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="ob-location">Location (optional)</Label>
                  <Input
                    id="ob-location"
                    value={form.location}
                    onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                    placeholder="City, State"
                  />
                </div>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button
                  onClick={submit}
                  disabled={saving}
                  className="bg-forest-700 hover:bg-forest-600"
                >
                  {saving ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      Saving…
                    </>
                  ) : (
                    <>
                      Continue as {role === "buyer" ? "Food Business" : "Manufacturer"}
                      <ArrowRight className="size-4" aria-hidden />
                    </>
                  )}
                </Button>
                <p className="text-[11.5px] text-navy-600">
                  Saved to PackVeda&apos;s database — this prototype uses a lightweight
                  identity (no password) that maps to the production auth structure.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

export default OnboardingView;
