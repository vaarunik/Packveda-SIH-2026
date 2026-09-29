"use client";

import { usePackVeda, View, isProtectedView } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { Wordmark } from "@/components/shared/site-header";
import { MaturityBadge, Maturity } from "@/components/shared/maturity-badge";
import { Separator } from "@/components/ui/separator";
import { Lock } from "lucide-react";

const LINKS: { view: View; label: string }[] = [
  { view: "analyze", label: "Analyze" },
  { view: "dashboard", label: "Dashboard" },
  { view: "compare", label: "Compare" },
  { view: "matching", label: "Packaging Matching" },
  { view: "marketplace", label: "Marketplace" },
  { view: "seller", label: "Seller Studio" },
  { view: "passport", label: "Packaging Passport" },
  { view: "trials", label: "Trial & Validation" },
  { view: "sources", label: "Data Sources" },
  { view: "about", label: "About" },
];

const PUBLIC_LINKS: { view: View; label: string }[] = [
  { view: "about", label: "About" },
  { view: "sources", label: "Data Sources" },
];

export function SiteFooter() {
  const { setView, openAuthDialog } = usePackVeda();
  const { status } = useAuth();
  const authed = status === "authenticated";
  const links = authed ? LINKS : PUBLIC_LINKS;

  const footerLink = (l: { view: View; label: string }) => {
    const locked = !authed && isProtectedView(l.view);
    return (
      <button
        onClick={() =>
          authed || !isProtectedView(l.view)
            ? setView(l.view)
            : openAuthDialog({ mode: "signin" })
        }
        className="group inline-flex items-center gap-1.5 text-sm text-cream-100/70 hover:text-emerald-400 transition-colors focus-visible:outline-2 focus-visible:outline-ring rounded"
      >
        {locked && (
          <Lock className="size-3 text-cream-100/40 group-hover:text-emerald-400/70" aria-hidden />
        )}
        {l.label}
      </button>
    );
  };

  return (
    <footer className="mt-auto w-full bg-navy-950 text-cream-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Wordmark dark onClick={() => setView("home")} />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-cream-100/70">
              An intelligent decision-support platform that recommends food
              packaging materials based on commodity properties, storage
              conditions, barrier requirements, shelf-life goals, cost,
              sustainability, and regulatory considerations.
            </p>
            <p className="mt-4 text-xs text-cream-100/50">
              PackVeda does not replace packaging scientists, laboratories, or
              regulatory authorities. Recommendations require validation and
              testing before commercial adoption.
            </p>
          </div>

          <nav aria-label="Footer">
            <h3 className="text-sm font-semibold tracking-wide text-cream-50 mb-3">
              Platform
            </h3>
            <ul className="space-y-2">
              {links.map((l) => (
                <li key={l.view}>{footerLink(l)}</li>
              ))}
              {!authed && (
                <li className="pt-1 text-xs leading-relaxed text-cream-100/45">
                  Sign in to unlock the full application.
                </li>
              )}
            </ul>
          </nav>

          <div>
            <h3 className="text-sm font-semibold tracking-wide text-cream-50 mb-3">
              Feature Maturity
            </h3>
            <ul className="space-y-2.5">
              <li className="flex items-center gap-2">
                <MaturityBadge status={"available" as Maturity} />
                <span className="text-xs text-cream-100/60">Core analysis engine</span>
              </li>
              <li className="flex items-center gap-2">
                <MaturityBadge status={"prototype" as Maturity} />
                <span className="text-xs text-cream-100/60">Trials &amp; packaging passports</span>
              </li>
              <li className="flex items-center gap-2">
                <MaturityBadge status={"prototype" as Maturity} />
                <span className="text-xs text-cream-100/60">Marketplace &amp; supplier matching</span>
              </li>
              <li className="flex items-center gap-2">
                <MaturityBadge status={"future" as Maturity} />
                <span className="text-xs text-cream-100/60">Verified supplier network, QR traceability</span>
              </li>
            </ul>
            <p className="mt-4 text-xs leading-relaxed text-cream-100/50">
              Material properties shown are indicative literature values for
              decision support. Always verify against supplier datasheets and
              laboratory testing.
            </p>
          </div>
        </div>

        <Separator className="my-8 bg-white/10" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <p className="text-xs text-cream-100/60">
            © 2026 Team PACKVEDA · Built for Smart India Hackathon 2026 —
            Problem Statement 26236 ·{" "}
            <span className="text-cream-100/40">
              “AI-Based Intelligent Food Packaging Material Recommendation
              System for Food Commodities”
            </span>
          </p>
          <p className="text-xs font-medium tracking-wide text-emerald-400">
            Smarter Packaging. Safer Food. Longer Shelf Life.
          </p>
        </div>
      </div>
    </footer>
  );
}

export default SiteFooter;
