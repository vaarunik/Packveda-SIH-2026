"use client";

// PACKVEDA — Explainable intelligence results view (Task 6-b).
// Renders derived packaging requirements, the recommended material with
// transparent property cards, "why recommended / limitations" panels,
// why alternatives were not selected, a ranked candidate table and a
// compare/save/trial action bar. All values are honest: null => "Data not available".

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Coins,
  Columns3,
  Droplets,
  FlaskConical,
  Info,
  Layers,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  ScanSearch,
  Store,
  Thermometer,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { BackButton } from "@/components/shared/back-button";
import { INTENSITY_LABEL, usePackVeda } from "@/lib/store";
import { computeRequirementMatches, matchSummary } from "@/lib/matching";
import type { CandidateResult, DerivedRequirement } from "@/lib/engine";
import { getMaterial } from "@/lib/data/materials";
import {
  buildAnalysisEvidence,
  buildWhyThisMaterial,
  toSourceRows,
} from "@/lib/evidence";
import { getSource } from "@/lib/data/sources";
import {
  ConfidenceChip,
  EvidenceCard,
  EvidenceCoverageBar,
  EvidenceItemRow,
  InlineEvidence,
  OriginBadge,
  RegulatoryRow,
  SourceTypeBadge,
  ValidationNote,
} from "@/components/shared/evidence-kit";
import { EmptyState } from "@/components/shared/empty-state";
import { MaturityBadge } from "@/components/shared/maturity-badge";
import { ScoreRing } from "@/components/shared/score-ring";
import { Term } from "@/components/shared/term-tooltip";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

/** 6000 -> "6000", 17 -> "17", 0.5 -> "0.50" */
function fmtNum(n: number): string {
  if (n >= 100) return n.toFixed(0);
  if (n >= 1) return n.toFixed(1);
  return n.toFixed(2);
}

/** True minus sign for negative temperatures: -18 -> "−18" */
function fmtTemp(n: number): string {
  return `${n < 0 ? "\u2212" : ""}${Math.abs(n)}`;
}

const STANDARD_LIMITATIONS = [
  "Requires laboratory/real-world validation before commercial use",
  "Actual performance depends on film structure, thickness, sealing and processing",
  "Environmental conditions may change performance",
];

const RECYCLABLE_LABEL: Record<string, string> = {
  widely: "Widely recyclable",
  limited: "Limited recycling",
  difficult: "Difficult to recycle",
  not_recyclable: "Not recyclable",
};

// ---------------------------------------------------------------------------
// Small building blocks (local to this view)
// ---------------------------------------------------------------------------

function RequirementLevelBadge({ level }: { level: DerivedRequirement["level"] }) {
  const cfg: Record<
    string,
    { label: string; className: string }
  > = {
    very_high: { label: "Very High", className: "border-forest-700 bg-forest-700 text-white" },
    high: { label: "High", className: "border-forest-700 bg-forest-700 text-white" },
    moderate: { label: "Moderate", className: "border-forest-600/30 bg-forest-100 text-forest-800" },
    low: { label: "Low", className: "border-navy-600/20 bg-cream-200 text-navy-700" },
    none: { label: "None", className: "border-navy-600/20 bg-cream-100 text-navy-600" },
    exchange: { label: "Gas Exchange", className: "border-amber-600/30 bg-amber-100 text-amber-900" },
  };
  const c = cfg[level] ?? cfg.none;
  return (
    <Badge variant="outline" className={cn("shrink-0 text-[11px] font-semibold", c.className)}>
      {c.label}
    </Badge>
  );
}

function ProvenanceBadge({ available }: { available: boolean }) {
  return available ? (
    <Badge
      variant="outline"
      className="shrink-0 border-forest-600/30 bg-forest-50 text-[10px] font-medium text-forest-800"
    >
      Source available
    </Badge>
  ) : (
    <Badge
      variant="outline"
      className="shrink-0 border-amber-600/30 bg-amber-50 text-[10px] font-medium text-amber-900"
    >
      No verified value
    </Badge>
  );
}

function CostDots({ index }: { index: number }) {
  return (
    <span
      className="inline-flex items-center gap-1"
      role="img"
      aria-label={`Relative cost index ${index} of 5`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={cn("size-2 rounded-full", i <= index ? "bg-forest-700" : "bg-cream-200")}
          aria-hidden
        />
      ))}
    </span>
  );
}

function StatusBadge({ status }: { status: CandidateResult["status"] }) {
  if (status === "excluded") {
    return (
      <Badge variant="outline" className="border-red-200 bg-red-50 text-[11px] text-red-700">
        Excluded
      </Badge>
    );
  }
  if (status === "recommended") {
    return <Badge className="bg-forest-700 text-[11px] text-white">Recommended</Badge>;
  }
  return (
    <Badge
      variant="outline"
      className="border-forest-600/30 bg-forest-50 text-[11px] text-forest-800"
    >
      Viable
    </Badge>
  );
}

function SubCard({
  title,
  icon: Icon,
  children,
}: {
  title: React.ReactNode;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-cream-50 p-4">
      <div className="mb-1 flex items-center gap-2">
        <Icon className="size-4 text-forest-700" aria-hidden />
        <h4 className="text-sm font-semibold text-navy-900">{title}</h4>
      </div>
      <div className="divide-y divide-border/70">{children}</div>
    </div>
  );
}

function PropRow({ children, note }: { children: React.ReactNode; note?: React.ReactNode }) {
  return (
    <div className="py-2">
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">{children}</div>
      {note ? <p className="mt-1 text-xs leading-relaxed text-navy-600">{note}</p> : null}
    </div>
  );
}

function MiniBar({ pct }: { pct: number }) {
  const p = Math.round(Math.max(0, Math.min(1, pct)) * 100);
  return (
    <span className="flex items-center gap-2">
      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-cream-200" aria-hidden>
        <span
          className="block h-full rounded-full bg-forest-600 transition-[width] duration-500"
          style={{ width: `${p}%` }}
        />
      </span>
      <span className="text-xs tabular-nums text-navy-700">{p}%</span>
    </span>
  );
}

// Framer Motion shared props (subtle whileInView fade/translate).
const fadeUp = {
  initial: { opacity: 0, y: 12 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-40px" },
  transition: { duration: 0.35, ease: "easeOut" as const },
};

// ---------------------------------------------------------------------------
// ResultsView
// ---------------------------------------------------------------------------

export default function ResultsView() {
  const { result, lastLabel, wizardInput, setView, toggleCompare, compareIds, openPassport, openMarketplace } =
    usePackVeda();
  const { toast } = useToast();

  const [expandedCandidateId, setExpandedCandidateId] = useState<string | null>(null);
  const [savingAnalysis, setSavingAnalysis] = useState(false);
  const [analysisSaved, setAnalysisSaved] = useState(false);
  const [savingCandidate, setSavingCandidate] = useState(false);
  const [candidateSaved, setCandidateSaved] = useState(false);
  const [savingTrial, setSavingTrial] = useState(false);

  // Matched suppliers (prototype network) — fetched once, matched deterministically
  const [supplierRows, setSupplierRows] = useState<
    { id: string; companyName: string; materialName: string; moq: string; location: string; otr: number | null; wvtr: number | null; sealability: string; tempMinC: number | null }[]
  >([]);
  const [supplierMatches, setSupplierMatches] = useState<
    { id: string; companyName: string; materialName: string; moq: string; location: string; matched: number; total: number }[]
  >([]);
  const [supplierLoading, setSupplierLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await apiFetch("/api/supplier-materials");
        const data = (await res.json()) as { materials?: typeof supplierRows };
        if (cancelled) return;
        setSupplierRows(data.materials ?? []);
      } catch {
        if (!cancelled) setSupplierRows([]);
      } finally {
        if (!cancelled) setSupplierLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!result) return;
    const scored = supplierRows
      .map((row) => {
        const matches = computeRequirementMatches(
          result.requirements,
          {
            id: row.id,
            name: row.materialName,
            source: "seller_declared",
            otr: row.otr,
            wvtr: row.wvtr,
            co2tr: null,
            tensileStrengthMPa: null,
            sealability: (row.sealability as "none" | "low" | "moderate" | "high" | "very_high") ?? "moderate",
            aromaBarrier: "low",
            lightBlocking: "low",
            tempMinC: row.tempMinC,
            tempMaxC: null,
            foodContactSuitable: true,
          },
          wizardInput
        );
        const c = matchSummary(matches);
        const applicable = matches.filter((m) => m.status !== "not_applicable").length;
        return {
          id: row.id,
          companyName: row.companyName,
          materialName: row.materialName,
          moq: row.moq,
          location: row.location,
          matched: c.match,
          total: applicable,
        };
      })
      .sort((a, b) => b.matched - a.matched)
      .slice(0, 3);
    setSupplierMatches(scored);
  }, [result, supplierRows, wizardInput]);

  const rec = result?.recommended ?? null;
  const topMaterial = rec ? getMaterial(rec.materialId) : undefined;

  // ------------------------------------------------------ Evidence & Sources
  // Derived deterministically from the SAME inputs/result — the recommendation
  // engine is NOT re-run and its logic is untouched. supplierMatches is used
  // only to record that supplier-declared (verification-pending) data exists.
  const evidence = useMemo(() => {
    if (!result || !wizardInput) return null;
    return buildAnalysisEvidence(
      wizardInput,
      result,
      topMaterial ?? null,
      supplierMatches.length
    );
  }, [result, wizardInput, topMaterial, supplierMatches.length]);

  const whyRows = useMemo(() => {
    if (!result || !wizardInput) return [];
    return buildWhyThisMaterial(wizardInput, result, topMaterial ?? null, supplierMatches.length);
  }, [result, wizardInput, topMaterial, supplierMatches.length]);

  const sourceCardRecords = useMemo(() => {
    if (!evidence) return [];
    const ids = new Set<string>();
    for (const item of evidence.items) for (const id of item.sourceIds) ids.add(id);
    return Array.from(ids)
      .map((id) => ({ record: getSource(id), id }))
      .filter((e): e is { record: NonNullable<ReturnType<typeof getSource>>; id: string } => !!e.record)
      .map(({ record, id }) => ({
        record,
        usedFor:
          evidence.items
            .filter((i) => i.sourceIds.includes(id))
            .map((i) => i.parameter)
            .slice(0, 3)
            .join(" · ") || record.description,
      }));
  }, [evidence]);

  const generatedLabel = useMemo(() => {
    if (!result) return "";
    try {
      return new Date(result.engineMeta.generatedAt).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return result.engineMeta.generatedAt;
    }
  }, [result]);

  // ------------------------------------------------------------------ empty
  if (!result) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-16 sm:px-6">
        <EmptyState
          icon={ScanSearch}
          title="No analysis yet"
          description="Run a packaging analysis to see explainable recommendations here."
          actionLabel="Start Packaging Analysis"
          onAction={() => setView("analyze")}
        />
      </div>
    );
  }

  const topInCompare = rec ? compareIds.includes(rec.materialId) : false;
  const tempMinOk = topMaterial
    ? topMaterial.tempMinC === null || wizardInput.storageTempC >= topMaterial.tempMinC
    : false;

  const alternatives = rec
    ? result.candidates.filter(
        (c) => c.materialId !== rec.materialId && (c.status === "viable" || c.status === "excluded")
      )
    : [];

  const ranked = result.candidates
    .filter((c) => c.status !== "excluded")
    .sort((a, b) => a.rank - b.rank);

  // ------------------------------------------------------------------ API
  const saveAnalysis = async () => {
    if (!result) return;
    setSavingAnalysis(true);
    try {
      const res = await apiFetch("/api/analyses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: lastLabel || `${wizardInput.commodityName} analysis`,
          commodity: wizardInput.commodityName,
          inputsJson: JSON.stringify(wizardInput),
          resultJson: JSON.stringify(result),
          // Structured evidence rows — traceability persisted with the analysis.
          sources: evidence ? toSourceRows(evidence).slice(0, 50) : [],
        }),
      });
      if (!res.ok) throw new Error("Could not save the analysis. Please try again.");
      setAnalysisSaved(true);
      toast({
        title: "Analysis saved",
        description: "Find it later in the Dashboard → Analyses.",
      });
    } catch (err) {
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingAnalysis(false);
    }
  };

  const saveCandidate = async () => {
    if (!rec) return;
    setSavingCandidate(true);
    try {
      const res = await apiFetch("/api/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materialId: rec.materialId,
          materialName: rec.materialName,
          commodity: wizardInput.commodityName,
          score: rec.score,
        }),
      });
      if (!res.ok) throw new Error("Could not save the candidate. Please try again.");
      setCandidateSaved(true);
      toast({
        title: "Candidate saved",
        description: `${rec.materialName} was added to your shortlist.`,
      });
    } catch (err) {
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingCandidate(false);
    }
  };

  const startTrial = async () => {
    if (!rec) return;
    setSavingTrial(true);
    try {
      const res = await apiFetch("/api/trials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materialId: rec.materialId,
          materialName: rec.materialName,
          commodity: wizardInput.commodityName,
          status: "planned",
        }),
      });
      if (!res.ok) throw new Error("Could not plan the trial. Please try again.");
      toast({
        title: "Trial planned",
        description: `${rec.materialName} was added to Trials with status “planned”.`,
      });
      setView("trials");
    } catch (err) {
      toast({
        title: "Could not plan trial",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingTrial(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:py-10">
      <BackButton label="Back to Analysis" fallback="analyze" />

      {/* ------------------------------------------------ 1. HEADER CARD */}
      <motion.section {...fadeUp} aria-label="Analysis summary">
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-forest-600">
                  Analysis result
                </p>
                <h1 className="mt-1 break-words text-2xl font-bold tracking-tight text-navy-950 sm:text-3xl">
                  {lastLabel || `${wizardInput.commodityName} packaging analysis`}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm text-navy-600">
                  <MaturityBadge status="available" label="Deterministic engine" />
                  <span aria-hidden>·</span>
                  <span>{result.engineMeta.engineVersion}</span>
                  <span aria-hidden>·</span>
                  <span>Generated {generatedLabel}</span>
                  <span aria-hidden>·</span>
                  <span className="font-medium text-navy-800">
                    Commodity: {wizardInput.commodityName}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setView("analyze")}>
                  <RotateCcw className="size-4" aria-hidden />
                  New Analysis
                </Button>
                <Button variant="outline" onClick={() => setView("simulator")}>
                  <FlaskConical className="size-4" aria-hidden />
                  Scenario Simulation
                </Button>
                <Button variant="outline" onClick={() => setView("matching")}>
                  <Layers className="size-4" aria-hidden />
                  Packaging Matching
                </Button>
                <Button
                  onClick={() => void saveAnalysis()}
                  disabled={savingAnalysis || analysisSaved}
                  className="bg-forest-700 hover:bg-forest-600"
                >
                  {savingAnalysis ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                  ) : (
                    <Save className="size-4" aria-hidden />
                  )}
                  {analysisSaved ? "Saved" : "Save Analysis"}
                </Button>
              </div>
            </div>

            <Alert className="mt-5 border-forest-600/25 bg-forest-50">
              <Info className="size-4 text-forest-700" />
              <AlertTitle className="sr-only">Disclaimer</AlertTitle>
              <AlertDescription className="text-sm leading-relaxed text-navy-800">
                {result.engineMeta.disclaimer}
              </AlertDescription>
            </Alert>
            <ValidationNote className="mt-3" />
          </CardContent>
        </Card>
      </motion.section>

      {/* ----------------------- 01 · SECTION 1: RECOMMENDED MATERIALS (TOP) */}
      <motion.section {...fadeUp} aria-label="Recommended packaging">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-forest-600">
          01 · Recommended Materials
        </p>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-navy-950">Recommended Packaging</h2>
        <p className="mt-1 text-sm text-navy-600">
          Top-ranked candidate from the deterministic engine — every number below traces back to the
          material knowledge base.
        </p>

        {rec && topMaterial ? (
          <Card className="mt-4">
            <CardContent className="grid gap-6 p-6 lg:grid-cols-[minmax(240px,320px)_1fr]">
              {/* Left column */}
              <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
                <Badge className="bg-forest-700 text-white">Recommended · Rank #1</Badge>
                <h3 className="mt-3 text-xl font-bold text-navy-950">{rec.materialName}</h3>
                <p className="mt-1 text-sm text-navy-600">
                  {topMaterial.family} · {topMaterial.structure}
                </p>
                <div className="my-5">
                  <ScoreRing value={rec.score} label="Overall Compatibility" />
                </div>
                <p className="text-xs leading-relaxed text-navy-600">
                  Relative engine score for shortlisting — not a guarantee of performance.
                </p>
              </div>

              {/* Right: 4 property sub-cards */}
              <div className="grid gap-4 sm:grid-cols-2">
                <SubCard
                  title={
                    <span>
                      Barrier Performance <Term k="barrier" />
                    </span>
                  }
                  icon={Droplets}
                >
                  <PropRow>
                    <span className="text-sm text-navy-700">
                      OTR <Term k="OTR" />
                    </span>
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          "text-sm font-semibold tabular-nums",
                          topMaterial.otr === null && "font-normal text-navy-600"
                        )}
                      >
                        {topMaterial.otr !== null
                          ? `≈ ${fmtNum(topMaterial.otr)} cc/m²/day`
                          : "Data not available"}
                      </span>
                      <ProvenanceBadge available={topMaterial.otrSourceAvailable} />
                    </span>
                  </PropRow>
                  <PropRow>
                    <span className="text-sm text-navy-700">
                      WVTR <Term k="WVTR" />
                    </span>
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          "text-sm font-semibold tabular-nums",
                          topMaterial.wvtr === null && "font-normal text-navy-600"
                        )}
                      >
                        {topMaterial.wvtr !== null
                          ? `≈ ${fmtNum(topMaterial.wvtr)} g/m²/day`
                          : "Data not available"}
                      </span>
                      <ProvenanceBadge available={topMaterial.wvtrSourceAvailable} />
                    </span>
                  </PropRow>
                  <PropRow>
                    <span className="text-sm text-navy-700">
                      CO₂TR <Term k="CO2TR" />
                    </span>
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          "text-sm font-semibold tabular-nums",
                          topMaterial.co2tr === null && "font-normal text-navy-600"
                        )}
                      >
                        {topMaterial.co2tr !== null
                          ? `≈ ${fmtNum(topMaterial.co2tr)} cc/m²/day`
                          : "Data not available"}
                      </span>
                      <ProvenanceBadge available={topMaterial.co2trSourceAvailable} />
                    </span>
                  </PropRow>
                </SubCard>

                <SubCard title="Physical Performance" icon={Layers}>
                  <PropRow>
                    <span className="text-sm text-navy-700">
                      Tensile strength <Term k="tensileStrength" />
                    </span>
                    <span
                      className={cn(
                        "text-sm font-semibold tabular-nums",
                        topMaterial.tensileStrengthMPa === null && "font-normal text-navy-600"
                      )}
                    >
                      {topMaterial.tensileStrengthMPa !== null
                        ? `${fmtNum(topMaterial.tensileStrengthMPa)} MPa`
                        : "Data not available"}
                    </span>
                  </PropRow>
                  <PropRow>
                    <span className="text-sm text-navy-700">
                      Thickness <Term k="micron" />
                    </span>
                    <span className="text-sm font-semibold tabular-nums">
                      {topMaterial.thicknessMicron} µm
                    </span>
                  </PropRow>
                  <PropRow note={topMaterial.sealNote}>
                    <span className="text-sm text-navy-700">
                      Sealability <Term k="sealability" />
                    </span>
                    <span className="text-sm font-semibold capitalize">
                      {INTENSITY_LABEL[topMaterial.sealability]}
                    </span>
                  </PropRow>
                </SubCard>

                <SubCard title="Compatibility" icon={Thermometer}>
                  <PropRow
                    note={
                      tempMinOk
                        ? `Covers your storage temperature of ${fmtTemp(wizardInput.storageTempC)} °C.`
                        : `Engine flagged: your storage temperature (${fmtTemp(
                            wizardInput.storageTempC
                          )} °C) is below the indicative service minimum — verify with the supplier.`
                    }
                  >
                    <span className="text-sm text-navy-700">Temperature suitability</span>
                    <span className="text-sm font-semibold tabular-nums">
                      {topMaterial.tempMinC !== null && topMaterial.tempMaxC !== null
                        ? `${fmtTemp(topMaterial.tempMinC)} to ${fmtTemp(topMaterial.tempMaxC)} °C`
                        : "Data not available"}
                    </span>
                  </PropRow>
                  <PropRow note={topMaterial.foodContactNote}>
                    <span className="text-sm text-navy-700">
                      Food contact <Term k="foodContactGrade" />
                    </span>
                    <span className="text-sm font-semibold">
                      {topMaterial.foodContactSuitable
                        ? "Suitable (verify grade)"
                        : "Not established"}
                    </span>
                  </PropRow>
                  <PropRow>
                    <span className="text-sm text-navy-700">Storage suitability</span>
                    <span
                      className={cn(
                        "text-sm font-semibold",
                        tempMinOk ? "text-forest-800" : "text-amber-800"
                      )}
                    >
                      {tempMinOk ? "Suitable for stated storage temperature" : "Check temperature range"}
                    </span>
                  </PropRow>
                </SubCard>

                <SubCard title="Business Factors" icon={Coins}>
                  <PropRow
                    note={`Indicative relative cost index ${topMaterial.relativeCostIndex} of 5 (5 = most expensive).`}
                  >
                    <span className="text-sm text-navy-700">
                      Relative cost{" "}
                      <span className="text-xs font-normal text-navy-600">
                        ({topMaterial.costCategory})
                      </span>
                    </span>
                    <CostDots index={topMaterial.relativeCostIndex} />
                  </PropRow>
                  <PropRow
                    note={`${RECYCLABLE_LABEL[topMaterial.sustainability.recyclable]} — ${topMaterial.sustainability.notes}`}
                  >
                    <span className="text-sm text-navy-700">Sustainability</span>
                    <span className="text-sm font-semibold tabular-nums">
                      {Math.round(topMaterial.sustainability.score * 100)}% ·{" "}
                      <span className="font-normal text-navy-600">
                        {RECYCLABLE_LABEL[topMaterial.sustainability.recyclable]}
                      </span>
                    </span>
                  </PropRow>
                  <PropRow note="Indicative supply availability in India.">
                    <span className="text-sm text-navy-700">Availability</span>
                    <span className="text-sm font-semibold">
                      {INTENSITY_LABEL[topMaterial.availability]}
                    </span>
                  </PropRow>
                </SubCard>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Alert variant="destructive" className="mt-4">
            <XCircle className="size-4" />
            <AlertTitle>No viable candidate</AlertTitle>
            <AlertDescription>
              Every material was excluded by hard constraints for this profile. Adjust storage
              temperature, shelf-life target or respiration inputs and run the analysis again.
            </AlertDescription>
          </Alert>
        )}
      </motion.section>

      {/* --------------------- 01 · RECOMMENDED MATERIALS — FULL RANKING */}
      <motion.section {...fadeUp} aria-label="Ranked candidates">
        <h2 className="text-xl font-bold tracking-tight text-navy-950">Ranked Candidates</h2>
        <p className="mt-1 text-sm text-navy-600">
          Viable candidates only, sorted by engine rank. Scores are relative compatibility
          indicators for shortlisting.
        </p>
        <div className="mt-4 max-h-96 overflow-y-auto rounded-xl border border-border bg-white scroll-slim">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-cream-100">
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Barrier fit</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Sustainability</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranked.map((c) => {
                const m = getMaterial(c.materialId);
                const inCompare = compareIds.includes(c.materialId);
                return (
                  <TableRow key={c.materialId}>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => openPassport(c.materialId)}
                        className="text-left text-sm font-medium text-navy-950 underline-offset-2 hover:text-forest-700 hover:underline"
                      >
                        {c.materialName}
                      </button>
                      <span className="block text-xs text-navy-600">{m?.family ?? ""}</span>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="text-sm font-semibold tabular-nums">
                          {c.score.toFixed(1)}
                        </span>
                        {c.status === "recommended" && (
                          <Badge className="bg-forest-700 text-[10px] text-white">Top</Badge>
                        )}
                      </span>
                    </TableCell>
                    <TableCell>
                      <MiniBar pct={c.breakdown.barrier} />
                    </TableCell>
                    <TableCell>
                      {m ? (
                        <span className="flex items-center gap-1.5">
                          <CostDots index={m.relativeCostIndex} />
                          <span className="text-xs capitalize text-navy-600">{m.costCategory}</span>
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <MiniBar pct={c.breakdown.sustainability} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant={inCompare ? "secondary" : "outline"}
                          onClick={() => toggleCompare(c.materialId)}
                        >
                          <Columns3 className="size-3.5" aria-hidden />
                          {inCompare ? "In Compare" : "Compare"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openPassport(c.materialId)}
                        >
                          Passport
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {ranked.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-sm text-navy-600">
                    No viable candidates — adjust your inputs and re-run the analysis.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </motion.section>

      {/* ------------------- 02 · SECTION 2: WHY THEY MATCH (requirements) */}
      <motion.section {...fadeUp} id="requirements" aria-label="Derived packaging requirements">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-forest-600">
          02 · Why They Match
        </p>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-navy-950">
          Derived Packaging Requirements
        </h2>
        <p className="mt-1 text-sm text-navy-600">
          Requirements derived from your food profile + storage environment — not arbitrary AI
          guesses.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {result.requirements.map((r) => {
            const evItem = evidence?.items.find((i) => i.id === `ev-req-${r.key}`);
            const primarySrc = evItem?.sourceIds[0] ? getSource(evItem.sourceIds[0]) : undefined;
            return (
            <div key={r.key} className="rounded-xl border border-border bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-navy-950">{r.label}</h3>
                <RequirementLevelBadge level={r.level} />
              </div>
              {r.unitNote ? (
                <p className="mt-1 text-[11px] text-navy-600">{r.unitNote}</p>
              ) : null}
              <p className="mt-2 text-sm leading-relaxed text-navy-700">{r.rationale}</p>
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <OriginBadge origin="ai_inferred" />
                {primarySrc && (
                  <InlineEvidence
                    sourceName={primarySrc.name}
                    title={primarySrc.title ?? primarySrc.fullName}
                    url={primarySrc.url}
                  />
                )}
              </div>
            </div>
            );
          })}
        </div>
      </motion.section>

      {/* ------------------- 02 · WHY THEY MATCH — explainable panels */}
      {rec && (
        <motion.section
          {...fadeUp}
          aria-label="Why recommended and potential limitations"
          className="grid gap-4 lg:grid-cols-2"
        >
          <div className="rounded-xl border border-forest-600/25 bg-forest-50 p-5">
            <h3 className="flex items-center gap-2 text-base font-semibold text-forest-800">
              <CheckCircle2 className="size-5 shrink-0" aria-hidden />
              Why PackVeda Recommended This
            </h3>

            {/* Structured why-chain (Food → Requirement → Storage → Material →
                Compliance → Supplier), each row carrying its information origin. */}
            <dl className="mt-3 space-y-2">
              {whyRows.map((row) => (
                <div
                  key={row.label}
                  className="rounded-lg border border-forest-700/15 bg-white/70 px-3 py-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
                    <dt className="text-[11px] font-bold uppercase tracking-wider text-forest-700">
                      {row.label}
                    </dt>
                    <OriginBadge origin={row.origin} />
                  </div>
                  <dd className="mt-0.5 text-[13px] leading-relaxed text-navy-800">{row.value}</dd>
                </div>
              ))}
            </dl>

            {/* The classic match list, kept from the original view. */}
            <p className="mt-4 text-[11px] font-bold uppercase tracking-wider text-forest-700">
              Requirement matches
            </p>
            <ul className="mt-1.5 space-y-2">
              {rec.matches.length > 0 ? (
                rec.matches.map((m) => (
                  <li key={m} className="flex items-start gap-2 text-sm text-navy-800">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-forest-700" aria-hidden />
                    <span>{m}</span>
                  </li>
                ))
              ) : (
                <li className="text-sm text-navy-600">
                  No direct requirement matches were recorded for this profile.
                </li>
              )}
            </ul>

            {/* Evidence supporting this reasoning (spec §6). */}
            {evidence && evidence.items.some((i) => i.sourceIds.length > 0) && (
              <div className="mt-4 border-t border-forest-700/15 pt-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-forest-700">
                  Evidence supporting this reasoning
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {Array.from(
                    new Set(evidence.items.flatMap((i) => i.sourceIds))
                  ).map((id) => {
                    const src = getSource(id);
                    if (!src) return null;
                    return (
                      <InlineEvidence
                        key={id}
                        sourceName={src.name}
                        title={src.title ?? src.fullName}
                        url={src.url}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-amber-600/25 bg-amber-50 p-5">
            <h3 className="flex items-center gap-2 text-base font-semibold text-amber-900">
              <TriangleAlert className="size-5 shrink-0" aria-hidden />
              Potential Limitations
            </h3>
            <ul className="mt-3 space-y-2">
              {[...rec.gaps, ...STANDARD_LIMITATIONS].map((g, i) => (
                <li
                  key={`${i}-${g.slice(0, 16)}`}
                  className="flex items-start gap-2 text-sm text-amber-950/90"
                >
                  <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-700" aria-hidden />
                  <span>{g}</span>
                </li>
              ))}
            </ul>
          </div>
        </motion.section>
      )}

      {/* ------------------- 02 · WHY THEY MATCH — alternatives explain */}
      {rec && alternatives.length > 0 && (
        <motion.section {...fadeUp} aria-label="Why alternatives were not selected">
          <h2 className="text-xl font-bold tracking-tight text-navy-950">
            Why Alternatives Were Not Selected
          </h2>
          <p className="mt-1 text-sm text-navy-600">
            Every candidate is explainable — open a row to see its exclusion reasons, watch-outs and
            remaining strengths.
          </p>
          <Accordion
            type="single"
            collapsible
            value={expandedCandidateId ?? undefined}
            onValueChange={(v) => setExpandedCandidateId(v || null)}
            className="mt-4 rounded-xl border border-border bg-white px-4"
          >
            {alternatives.map((c) => {
              const inCompare = compareIds.includes(c.materialId);
              return (
                <AccordionItem key={c.materialId} value={c.materialId} className="last:border-b-0">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex flex-1 flex-wrap items-center gap-2 pr-2 text-left">
                      <span className="text-sm font-semibold text-navy-950">{c.materialName}</span>
                      <Badge variant="outline" className="tabular-nums">
                        {c.score.toFixed(1)}
                      </Badge>
                      <StatusBadge status={c.status} />
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-3">
                    {c.exclusionReasons.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-red-700">
                          Excluded because
                        </p>
                        <ul className="mt-1.5 space-y-1.5">
                          {c.exclusionReasons.map((x) => (
                            <li key={x} className="flex items-start gap-2 text-sm text-navy-800">
                              <XCircle className="mt-0.5 size-4 shrink-0 text-red-600" aria-hidden />
                              <span>{x}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {c.gaps.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                          Watch-outs
                        </p>
                        <ul className="mt-1.5 space-y-1.5">
                          {c.gaps.map((g) => (
                            <li
                              key={g}
                              className="flex items-start gap-2 text-sm text-navy-800"
                            >
                              <TriangleAlert
                                className="mt-0.5 size-4 shrink-0 text-amber-600"
                                aria-hidden
                              />
                              <span>{g}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {c.matches.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-forest-700">
                          Where it still fits
                        </p>
                        <ul className="mt-1.5 space-y-1.5">
                          {c.matches.slice(0, 3).map((m) => (
                            <li key={m} className="flex items-start gap-2 text-sm text-navy-600">
                              <CheckCircle2
                                className="mt-0.5 size-4 shrink-0 text-forest-600"
                                aria-hidden
                              />
                              <span>{m}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        size="sm"
                        variant={inCompare ? "secondary" : "outline"}
                        onClick={() => toggleCompare(c.materialId)}
                      >
                        <Plus className="size-3.5" aria-hidden />
                        {inCompare ? "In Compare" : "Add to Compare"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openPassport(c.materialId)}
                      >
                        View Passport
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </motion.section>
      )}

      {/* ------------------------ 03 · SECTION 3: MATCHED SUPPLIERS */}
      <motion.section {...fadeUp} aria-label="Matched suppliers and manufacturers">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-forest-600">
            03 · Matched Suppliers / Manufacturers
          </p>
          <MaturityBadge status="prototype" label="Prototype — supplier network" />
        </div>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-navy-950">
          Who Can Provide These Materials
        </h2>
        <p className="mt-1 text-sm text-navy-600">
          Supplier matching connects your suitable materials with packaging
          manufacturers. Their declared properties are matched against{" "}
          <span className="font-semibold text-navy-800">your requirements</span> — sellers
          cannot alter scores, and every listing is marked &ldquo;verification
          required&rdquo;.
        </p>

        {supplierLoading ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-border bg-white px-4 py-6 text-sm text-navy-600">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Checking supplier matches…
          </div>
        ) : supplierMatches.length === 0 ? (
          <Alert className="mt-4 border-slate-pkv-500/25 bg-slate-pkv-100/50">
            <Store className="size-4" aria-hidden />
            <AlertTitle>No verified supplier matches available yet</AlertTitle>
            <AlertDescription className="text-sm leading-relaxed">
              No packaging manufacturer has listed a material matching these
              requirements in this prototype environment. Sellers can list materials
              from the Seller Studio; matched listings will appear here and in the
              Marketplace — where you can request samples and quotations.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {supplierMatches.map((s) => (
              <div key={s.id} className="flex flex-col rounded-xl border border-border bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-navy-950">{s.materialName}</p>
                    <p className="truncate text-xs text-navy-600">{s.companyName}</p>
                  </div>
                  <Badge variant="outline" className="shrink-0 border-forest-600/30 bg-forest-50 text-[10.5px] font-semibold text-forest-800">
                    {s.matched}/{s.total} matched
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-navy-600">
                  {s.moq ? `MOQ ${s.moq}` : "MOQ not provided"}
                  {s.location ? ` · ${s.location}` : ""}
                </p>
                <p className="mt-1 text-[10.5px] font-medium text-amber-warm-600">
                  Seller-declared · verification required
                </p>
                <div className="mt-auto flex gap-2 pt-3">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => openMarketplace(s.id)}>
                    View &amp; Request
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        <Button variant="link" className="mt-2 gap-1 px-0 text-forest-700" onClick={() => setView("marketplace")}>
          Open Marketplace
          <ArrowRight className="size-3.5" aria-hidden />
        </Button>
      </motion.section>

      {/* ------------------ 03.5 · REGULATORY & COMPLIANCE CHECK (spec §9) */}
      <motion.section {...fadeUp} aria-label="Regulatory and compliance check">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-forest-600">
          03.5 · Regulatory &amp; Compliance
        </p>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-navy-950">
          Regulatory &amp; Compliance Check
        </h2>
        <p className="mt-1 text-sm text-navy-600">
          Where regulatory context applies to this analysis. PackVeda is a
          decision-support system and does not itself certify packaging materials.
        </p>
        <div className="mt-4 space-y-3">
          {evidence?.regulatory.map((check) => (
            <RegulatoryRow key={check.authority} check={check} />
          ))}
          {topMaterial && (
            <div className="rounded-xl border border-border bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                <SourceTypeBadge category="database" label="MATERIAL DATA" />
                <p className="text-[13px] font-semibold text-navy-950">
                  {topMaterial.name} — material regulatory notes
                </p>
              </div>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-navy-700">
                {topMaterial.regulatoryNotes}
              </p>
              <p className="mt-1.5 text-[10.5px] text-navy-500">
                {topMaterial.dataConfidenceNote}
              </p>
            </div>
          )}
        </div>
      </motion.section>

      {/* ------------------------ 03.6 · EVIDENCE & SOURCES (spec §1, §16) */}
      <motion.section {...fadeUp} id="evidence" aria-label="Evidence and sources">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-forest-600">
          03.6 · Traceability
        </p>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-navy-950">Evidence &amp; Sources</h2>
        <p className="mt-1 text-sm text-navy-600">
          Technical and regulatory references supporting this analysis.
        </p>

        {evidence && (
          <>
            {/* Coverage — computed from actual evidence records (spec §16) */}
            <div className="mt-4 max-w-xl">
              <EvidenceCoverageBar coverage={evidence.coverage} />
            </div>

            {/* Origin legend — what each badge means (spec §8) */}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-border bg-white px-3 py-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-navy-600">
                Information origin
              </span>
              {(
                [
                  ["source_derived", "Directly from a referenced source/database"],
                  ["ai_inferred", "Generated by the recommendation engine"],
                  ["user_provided", "Entered by you in the wizard"],
                  ["estimated", "Unavailable — needs supplier/lab data"],
                ] as const
              ).map(([origin, desc]) => (
                <span key={origin} className="inline-flex items-center gap-1.5">
                  <OriginBadge origin={origin} />
                  <span className="text-[10.5px] text-navy-600">{desc}</span>
                </span>
              ))}
            </div>

            {/* Per-claim origin rows */}
            <p className="mt-5 text-[11px] font-bold uppercase tracking-wider text-navy-600">
              Claim-by-claim traceability
            </p>
            <div className="mt-2 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {evidence.items.map((item) => (
                <EvidenceItemRow key={item.id} item={item} />
              ))}
            </div>

            {/* Source cards */}
            <p className="mt-5 text-[11px] font-bold uppercase tracking-wider text-navy-600">
              Source registry
            </p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {sourceCardRecords.map(({ record, usedFor }) => (
                <EvidenceCard key={record.id} record={record} usedFor={usedFor} />
              ))}
            </div>

            <p className="mt-4 text-[11.5px] leading-relaxed text-navy-600">
              Values marked &ldquo;Not available&rdquo; are absent from the current knowledge
              base — PackVeda does not estimate them. Obtain supplier datasheets or
              laboratory results before adoption. Saved analyses persist these source
              records for later audit.
            </p>
          </>
        )}
      </motion.section>

      {/* ------------------------ 04 · SECTION 4: VALIDATION REQUIREMENTS */}
      <motion.section {...fadeUp} aria-label="Validation requirements">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-warm-600">
          04 · Validation Requirements
        </p>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-navy-950">
          Before Commercial Adoption
        </h2>
        <p className="mt-1 text-sm text-navy-600">
          Validation happens AFTER recommendation and selection — it is a real-world
          verification stage, not part of the AI workflow.
        </p>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <div className="rounded-xl border border-amber-warm-600/30 bg-amber-warm-50 p-5">
            <h3 className="flex items-center gap-2 text-base font-semibold text-navy-950">
              <ClipboardCheck className="size-5 shrink-0 text-amber-warm-600" aria-hidden />
              Validation checklist
            </h3>
            <ul className="mt-3 space-y-2.5">
              {[
                "Material verification against the supplier datasheet",
                "OTR / WVTR verification under lab or real conditions",
                "Seal integrity testing on production equipment",
                "Storage trial under your actual conditions",
                "Shelf-life validation study",
                "Expert review by a packaging technologist",
              ].map((v) => (
                <li key={v} className="flex items-start gap-2.5 text-sm text-navy-800">
                  <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border border-amber-warm-600/50" aria-hidden />
                  <span>{v}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 border-t border-amber-warm-600/20 pt-3 text-xs font-semibold uppercase tracking-wider text-amber-warm-600">
              AI recommends → Testing validates → Expert approves
            </p>
          </div>
          <div className="flex flex-col justify-between rounded-xl border border-border bg-white p-5">
            <div>
              <h3 className="text-base font-semibold text-navy-950">Start validating</h3>
              <p className="mt-2 text-sm leading-relaxed text-navy-600">
                Record your own trial results in Trial &amp; Validation — measured
                values you enter stay clearly separated from AI outputs.
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                onClick={() => void startTrial()}
                disabled={savingTrial}
                className="bg-forest-700 hover:bg-forest-600"
              >
                {savingTrial ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <FlaskConical className="size-4" aria-hidden />
                )}
                Start Trial
              </Button>
              <Button variant="outline" onClick={() => setView("trials")}>
                Open Trials
                <ArrowRight className="size-4" aria-hidden />
              </Button>
            </div>
          </div>
        </div>
      </motion.section>

      {/* ------------------------------------------ 7. ACTION BAR (STICKY) */}
      {rec && (
        <div className="sticky bottom-4 z-30 mt-2">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-navy-900/10 bg-white/95 p-4 shadow-lg shadow-navy-950/5 backdrop-blur">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant={topInCompare ? "secondary" : "outline"}
                onClick={() => toggleCompare(rec.materialId)}
              >
                <Plus className="size-3.5" aria-hidden />
                {topInCompare ? "Top pick in Compare" : "Add top to Compare"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => openPassport(rec.materialId)}>
                View Passport
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="rounded-full bg-cream-200 px-3 py-1 text-xs font-semibold text-navy-800"
                aria-live="polite"
              >
                {compareIds.length}/4 in compare
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setView("compare")}
                disabled={compareIds.length === 0}
              >
                Go to Compare
                <ArrowRight className="size-3.5" aria-hidden />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void saveCandidate()}
                disabled={savingCandidate || candidateSaved}
              >
                {savingCandidate ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <Save className="size-3.5" aria-hidden />
                )}
                {candidateSaved ? "Candidate Saved" : "Save Candidate"}
              </Button>
              <Button
                size="sm"
                onClick={() => void startTrial()}
                disabled={savingTrial}
                className="bg-forest-700 hover:bg-forest-600"
              >
                {savingTrial ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <FlaskConical className="size-3.5" aria-hidden />
                )}
                Start Trial
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
