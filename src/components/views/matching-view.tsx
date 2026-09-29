"use client";

// PACKVEDA — Packaging Matching.
//
// This page makes the distinction between RECOMMENDATION and MATCHING visual:
//  - The engine RECOMMENDS (ranks) candidate materials.
//  - Here we MATCH: every derived packaging requirement is checked against
//    each material's actual properties with MATCH / PARTIAL / NOT MATCHED /
//    VERIFICATION REQUIRED indicators and a plain-language explanation.
//
// Knowledge-base candidates come from the deterministic engine result.
// Seller-declared materials come from /api/supplier-materials and are clearly
// labelled — their properties never overwrite knowledge-base data.

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Boxes,
  Check,
  CircleHelp,
  GitCompareArrows,
  Loader2,
  Minus,
  ScanSearch,
  Store,
  TriangleAlert,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BackButton } from "@/components/shared/back-button";
import { EmptyState } from "@/components/shared/empty-state";
import { MaturityBadge } from "@/components/shared/maturity-badge";
import { SectionHeading } from "@/components/shared/section-heading";
import { ScoreRing } from "@/components/shared/score-ring";
import { useToast } from "@/hooks/use-toast";
import { usePackVeda } from "@/lib/store";
import {
  computeRequirementMatches,
  matchSummary,
  MATCH_STATUS_META,
  supplierMaterialToMatchable,
  type MatchStatus,
  type RequirementMatch,
} from "@/lib/matching";
import type { DerivedRequirement, CandidateResult } from "@/lib/engine";
import { getMaterial } from "@/lib/data/materials";
import { cn } from "@/lib/utils";

interface SupplierRow {
  id: string;
  supplierEmail: string;
  companyName: string;
  materialName: string;
  structure: string;
  form: string;
  moq: string;
  priceRange: string;
  location: string;
  foodApplications: string;
  otr: number | null;
  wvtr: number | null;
  co2tr: number | null;
  tensileStrengthMPa: number | null;
  sealability: string;
  aromaBarrier: string;
  lightBlocking: string;
  tempMinC: number | null;
  tempMaxC: number | null;
  foodContactSuitable: boolean;
  status: string;
}

function StatusIcon({ status }: { status: MatchStatus }) {
  const icon = MATCH_STATUS_META[status].icon;
  const cls: Record<MatchStatus, string> = {
    match: "text-forest-600",
    partial: "text-amber-warm-600",
    not_matched: "text-red-600",
    unverified: "text-slate-pkv-600",
    not_applicable: "text-navy-600/50",
  };
  const Cls = {
    check: Check,
    partial: TriangleAlert,
    cross: X,
    help: CircleHelp,
    minus: Minus,
  }[icon];
  return <Cls className={cn("size-4 shrink-0", cls[status])} aria-hidden />;
}

function StatusChip({ status }: { status: MatchStatus }) {
  const cls: Record<MatchStatus, string> = {
    match: "border-forest-600/30 bg-forest-50 text-forest-800",
    partial: "border-amber-warm-600/30 bg-amber-warm-50 text-amber-warm-600",
    not_matched: "border-red-500/25 bg-red-50 text-red-700",
    unverified: "border-slate-pkv-500/30 bg-slate-pkv-100 text-slate-pkv-700",
    not_applicable: "border-navy-600/15 bg-cream-100 text-navy-600",
  };
  return (
    <Badge variant="outline" className={cn("gap-1 text-[10.5px] font-semibold", cls[status])}>
      <StatusIcon status={status} />
      {MATCH_STATUS_META[status].label}
    </Badge>
  );
}

function RequirementRow({ m }: { m: RequirementMatch }) {
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <span className="mt-0.5">
        <StatusIcon status={m.status} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-semibold text-navy-900">
          {m.label}
          <span className="ml-1.5 font-normal text-navy-600">
            (required: {m.requiredLabel.replace("_", " ")})
          </span>
        </p>
        <p className="mt-0.5 text-[11.5px] leading-snug text-navy-600">{m.explanation}</p>
      </div>
    </div>
  );
}

function MatchCard({
  name,
  subtitle,
  matches,
  engineScore,
  provenance,
  actions,
}: {
  name: string;
  subtitle: string;
  matches: RequirementMatch[];
  engineScore?: number | null;
  provenance?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const counts = matchSummary(matches);
  const applicable = matches.filter((m) => m.status !== "not_applicable");
  const matched = applicable.filter((m) => m.status === "match").length;
  const partial = applicable.filter((m) => m.status === "partial").length;
  const failed = applicable.filter((m) => m.status === "not_matched").length;
  const unverified = applicable.filter((m) => m.status === "unverified").length;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b border-border bg-white px-5 py-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[15px] font-bold text-navy-950">{name}</h3>
            {provenance}
          </div>
          <p className="mt-0.5 text-xs text-navy-600">{subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          {typeof engineScore === "number" && (
            <div className="hidden sm:block">
              <ScoreRing value={engineScore} size={56} label="Engine score" />
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className="border-forest-600/30 bg-forest-50 text-[10.5px] font-semibold text-forest-800">
              {matched} match{matched === 1 ? "" : "es"}
            </Badge>
            {partial > 0 && (
              <Badge variant="outline" className="border-amber-warm-600/30 bg-amber-warm-50 text-[10.5px] font-semibold text-amber-warm-600">
                {partial} partial
              </Badge>
            )}
            {unverified > 0 && (
              <Badge variant="outline" className="border-slate-pkv-500/30 bg-slate-pkv-100 text-[10.5px] font-semibold text-slate-pkv-700">
                {unverified} to verify
              </Badge>
            )}
            {failed > 0 && (
              <Badge variant="outline" className="border-red-500/25 bg-red-50 text-[10.5px] font-semibold text-red-700">
                {failed} not matched
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="bg-cream-50 px-5 py-4">
        <div className="grid gap-x-6 md:grid-cols-2">
          {matches.map((m) => (
            <RequirementRow key={m.key} m={m} />
          ))}
        </div>
        {actions && <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">{actions}</div>}
      </CardContent>
    </Card>
  );
}

export function MatchingView() {
  const { result, wizardInput, setView, openPassport, toggleCompare, openMarketplace } = usePackVeda();
  const { toast } = useToast();
  const [sellerRows, setSellerRows] = useState<SupplierRow[] | null>(null);
  const [loadingSellers, setLoadingSellers] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingSellers(true);
      try {
        const res = await fetch("/api/supplier-materials");
        const data = (await res.json()) as { materials?: SupplierRow[] };
        if (!cancelled) setSellerRows(data.materials ?? []);
      } catch {
        if (!cancelled) setSellerRows([]);
      } finally {
        if (!cancelled) setLoadingSellers(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const requirements = result?.requirements ?? [];

  const kbMatches = useMemo(() => {
    if (!result) return [];
    return result.candidates
      .filter((c) => c.status !== "excluded")
      .slice(0, 6)
      .map((c: CandidateResult) => {
        const m = getMaterial(c.materialId);
        if (!m) return null;
        const matches = computeRequirementMatches(
          requirements,
          {
            id: m.id,
            name: m.name,
            source: "knowledge_base",
            otr: m.otr,
            wvtr: m.wvtr,
            co2tr: m.co2tr,
            tensileStrengthMPa: m.tensileStrengthMPa,
            sealability: m.sealability,
            aromaBarrier: m.aromaBarrier,
            lightBlocking: m.lightBlocking,
            punctureResistance: m.punctureResistance,
            tempMinC: m.tempMinC,
            tempMaxC: m.tempMaxC,
            foodContactSuitable: m.foodContactSuitable,
          },
          wizardInput
        );
        return { candidate: c, matches };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }, [result, requirements, wizardInput]);

  const sellerMatches = useMemo(() => {
    if (!result || !sellerRows) return [];
    return sellerRows
      .filter((r) => r.status === "active")
      .map((row) => ({
        row,
        matches: computeRequirementMatches(
          requirements,
          supplierMaterialToMatchable(row),
          wizardInput
        ),
      }))
      .sort((a, b) => {
        const ra = matchSummary(a.matches);
        const rb = matchSummary(b.matches);
        return rb.match - rb.not_matched - (ra.match - ra.not_matched);
      })
      .slice(0, 4);
  }, [result, sellerRows, requirements, wizardInput]);

  if (!result) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <BackButton label="Back to Dashboard" fallback="dashboard" />
        <div className="mt-6">
          <EmptyState
            icon={ScanSearch}
            title="Run an analysis first"
            description="Packaging Matching checks your derived packaging requirements against real material properties. Start a packaging analysis to generate your requirements."
            actionLabel="Start Packaging Analysis"
            onAction={() => setView("analyze")}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BackButton label="Back to Results" fallback="results" />
        <MaturityBadge status="available" />
      </div>

      <div className="mt-4">
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="text-xs font-semibold uppercase tracking-[0.18em] text-forest-600"
        >
          Material Matching
        </motion.p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-navy-950 md:text-4xl">
          Packaging Matching
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-navy-600">
          <span className="font-semibold text-navy-900">Recommendation</span> says what
          type of packaging is suitable.{" "}
          <span className="font-semibold text-navy-900">Matching</span> checks which
          actual materials satisfy each of your packaging requirements — property by
          property, with the reason for every verdict.
        </p>
      </div>

      {/* YOUR PACKAGING REQUIREMENTS */}
      <section aria-labelledby="requirements-heading" className="mt-8">
        <div className="flex items-center justify-between gap-3">
          <h2 id="requirements-heading" className="text-sm font-bold uppercase tracking-wider text-navy-800">
            Your Packaging Requirements
          </h2>
          <span className="text-xs text-navy-600">
            Derived by the deterministic engine from your food &amp; storage profile
          </span>
        </div>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {requirements.map((r: DerivedRequirement) => (
            <div
              key={r.key}
              className="rounded-lg border border-border bg-card px-4 py-3 shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[13px] font-semibold text-navy-900">{r.label}</p>
                <Badge
                  variant="outline"
                  className={cn(
                    "shrink-0 text-[10.5px] font-semibold",
                    r.level === "very_high" || r.level === "high"
                      ? "border-forest-700 bg-forest-700 text-white"
                      : r.level === "moderate"
                        ? "border-forest-600/30 bg-forest-100 text-forest-800"
                        : r.level === "exchange"
                          ? "border-amber-warm-600/30 bg-amber-warm-50 text-amber-warm-600"
                          : "border-navy-600/20 bg-cream-200 text-navy-700"
                  )}
                >
                  {r.level.replace("_", " ")}
                </Badge>
              </div>
              <p className="mt-1 line-clamp-2 text-[11.5px] leading-snug text-navy-600" title={r.rationale}>
                {r.rationale}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* MATCHED PACKAGING OPTIONS — knowledge base */}
      <section aria-labelledby="matched-heading" className="mt-10">
        <div className="flex items-center justify-between gap-3">
          <h2 id="matched-heading" className="text-sm font-bold uppercase tracking-wider text-navy-800">
            Matched Packaging Options
          </h2>
          <span className="text-xs text-navy-600">
            Knowledge-base materials · properties from referenced sources
          </span>
        </div>
        <div className="mt-3 space-y-4">
          {kbMatches.map(({ candidate, matches }) => (
            <MatchCard
              key={candidate.materialId}
              name={candidate.materialName}
              subtitle={getMaterial(candidate.materialId)?.structure ?? ""}
              matches={matches}
              engineScore={candidate.score}
              actions={
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => {
                      toggleCompare(candidate.materialId);
                      toast({ title: "Added to comparison", description: candidate.materialName });
                    }}
                  >
                    <GitCompareArrows className="size-4" aria-hidden />
                    Compare
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => openPassport(candidate.materialId)}
                  >
                    Passport
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1.5 bg-forest-700 hover:bg-forest-600"
                    onClick={() => openMarketplace(candidate.materialId)}
                  >
                    <Store className="size-4" aria-hidden />
                    Find Suppliers
                  </Button>
                </>
              }
            />
          ))}
        </div>
      </section>

      {/* SUPPLIER-DECLARED MATERIALS */}
      <section aria-labelledby="seller-heading" className="mt-10">
        <div className="flex items-center justify-between gap-3">
          <h2 id="seller-heading" className="text-sm font-bold uppercase tracking-wider text-navy-800">
            Supplier-Listed Materials Matched to Your Requirements
          </h2>
          <MaturityBadge status="prototype" label="Prototype · verification required" />
        </div>

        {loadingSellers ? (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-6 text-sm text-navy-600">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Checking supplier-listed materials…
          </div>
        ) : sellerMatches.length === 0 ? (
          <Alert className="mt-3 border-slate-pkv-500/25 bg-slate-pkv-100/50">
            <Boxes className="size-4" aria-hidden />
            <AlertTitle>No verified supplier matches available yet</AlertTitle>
            <AlertDescription className="text-[13px] leading-relaxed">
              No packaging manufacturer has listed a material matching these
              requirements in this prototype environment. When sellers list materials
              (structure, OTR, WVTR, MOQ, applications), PackVeda matches them against
              your requirements here — using the same rules, and always marked
              &ldquo;seller-declared · verification required&rdquo;.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="mt-3 space-y-4">
            {sellerMatches.map(({ row, matches }) => (
              <MatchCard
                key={row.id}
                name={`${row.materialName}`}
                subtitle={`${row.companyName}${row.structure ? ` · ${row.structure}` : ""}${row.moq ? ` · MOQ ${row.moq}` : ""}`}
                matches={matches}
                provenance={
                  <Badge
                    variant="outline"
                    className="border-amber-warm-600/35 bg-amber-warm-50 text-[10px] font-semibold text-amber-warm-600"
                  >
                    Seller-declared · verification required
                  </Badge>
                }
                actions={
                  <Button
                    size="sm"
                    className="gap-1.5 bg-forest-700 hover:bg-forest-600"
                    onClick={() => openMarketplace(row.id)}
                  >
                    <Store className="size-4" aria-hidden />
                    View Supplier &amp; Request
                  </Button>
                }
              />
            ))}
          </div>
        )}
      </section>

      <p className="mt-10 rounded-lg border border-amber-warm-600/25 bg-amber-warm-50 px-4 py-3 text-[12.5px] leading-relaxed text-navy-800">
        Matching verdicts are computed by deterministic rules from the same thresholds
        as the recommendation engine. They are decision-support indicators — not
        guarantees. Laboratory verification is required before commercial adoption.
      </p>
    </div>
  );
}

export default MatchingView;
