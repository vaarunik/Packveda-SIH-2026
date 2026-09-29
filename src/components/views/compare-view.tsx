"use client";

// PACKVEDA — Material Comparison view (2–4 materials side by side).
// Normalized radar chart + property table with best-value highlighting.
// All values are indicative literature data; never presented as certified.

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import {
  ArrowRight,
  BookOpen,
  Check,
  GitCompareArrows,
  Info,
  Minus,
  Plus,
  X,
} from "lucide-react";
import { usePackVeda, INTENSITY_LABEL } from "@/lib/store";
import { MATERIALS, getMaterial } from "@/lib/data/materials";
import type { PackagingMaterial, Intensity } from "@/lib/data/types";
import type { GlossaryKey } from "@/lib/glossary";
import { Term } from "@/components/shared/term-tooltip";
import { MaturityBadge } from "@/components/shared/maturity-badge";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BackButton } from "@/components/shared/back-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PALETTE = [
  "var(--color-forest-600)",
  "var(--color-navy-700)",
  "var(--color-chart-3)",
  "var(--color-sand-400)",
];

const SEAL_SCORE: Record<Intensity, number> = {
  none: 0,
  low: 25,
  moderate: 50,
  high: 75,
  very_high: 100,
};

const RECYCLE_LABEL: Record<PackagingMaterial["sustainability"]["recyclable"], string> = {
  widely: "Widely recyclable",
  limited: "Limited recyclability",
  difficult: "Difficult to recycle",
  not_recyclable: "Not recyclable",
};

/** Inverted, log-scaled 0–100 barrier score for OTR / WVTR (lower = better). */
function barrierAxisScore(v: number | null): number {
  if (v === null) return 0;
  return Math.max(0, Math.min(100, 100 - (Math.log10(v + 1) / 4) * 100));
}

function fmtNum(n: number): string {
  if (n >= 100) return Math.round(n).toLocaleString("en-IN");
  if (n >= 10) return String(Math.round(n * 10) / 10);
  return String(Math.round(n * 100) / 100);
}

function NotAvailable() {
  return <span className="text-xs italic text-muted-foreground">Data not available</span>;
}

function NumCell({ v, unitSuffix }: { v: number | null; unitSuffix?: string }) {
  if (v === null) return <NotAvailable />;
  return (
    <span className="text-sm font-medium tabular-nums text-navy-900">
      ≈ {fmtNum(v)}
      {unitSuffix && <span className="ml-0.5 text-xs font-normal text-muted-foreground">{unitSuffix}</span>}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Radar data
// ---------------------------------------------------------------------------

const RADAR_AXES: { key: string; label: string }[] = [
  { key: "oxygen", label: "Oxygen Barrier" },
  { key: "moisture", label: "Moisture Barrier" },
  { key: "strength", label: "Mechanical Strength" },
  { key: "seal", label: "Sealability" },
  { key: "cost", label: "Cost Efficiency" },
  { key: "sustain", label: "Sustainability" },
];

function axisValue(key: string, m: PackagingMaterial): number {
  switch (key) {
    case "oxygen":
      return barrierAxisScore(m.otr);
    case "moisture":
      return barrierAxisScore(m.wvtr);
    case "strength":
      return Math.min(100, m.tensileStrengthMPa ?? 0);
    case "seal":
      return SEAL_SCORE[m.sealability];
    case "cost":
      return (6 - m.relativeCostIndex) * 20;
    case "sustain":
      return Math.round(m.sustainability.score * 100);
    default:
      return 0;
  }
}

// ---------------------------------------------------------------------------
// Property table definition
// ---------------------------------------------------------------------------

interface RowDef {
  key: string;
  label: string;
  termKey?: GlossaryKey;
  unit?: string;
  /** raw numeric for best-value detection */
  numeric?: (m: PackagingMaterial) => number | null;
  dir?: "low" | "high";
  render: (m: PackagingMaterial) => React.ReactNode;
}

function CostDots({ idx }: { idx: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="text-sm font-medium tabular-nums text-navy-900">{idx}/5</span>
      <span aria-hidden className="text-[11px] tracking-[0.05em]">
        {Array.from({ length: 5 }).map((_, i) => (
          <span key={i} className={i < idx ? "text-amber-600" : "text-cream-300"}>
            ●
          </span>
        ))}
      </span>
      <span className="sr-only">Relative cost {idx} of 5 (5 = highest)</span>
    </span>
  );
}

const ROWS: RowDef[] = [
  {
    key: "otr",
    label: "OTR",
    termKey: "OTR",
    unit: "cc/m²/day · lower is better",
    numeric: (m) => m.otr,
    dir: "low",
    render: (m) => <NumCell v={m.otr} />,
  },
  {
    key: "wvtr",
    label: "WVTR",
    termKey: "WVTR",
    unit: "g/m²/day · lower is better",
    numeric: (m) => m.wvtr,
    dir: "low",
    render: (m) => <NumCell v={m.wvtr} />,
  },
  {
    key: "co2tr",
    label: "CO₂TR",
    termKey: "CO2TR",
    unit: "cc/m²/day · lower is better",
    numeric: (m) => m.co2tr,
    dir: "low",
    render: (m) => <NumCell v={m.co2tr} />,
  },
  {
    key: "tensile",
    label: "Tensile strength",
    termKey: "tensileStrength",
    unit: "MPa · higher is better",
    numeric: (m) => m.tensileStrengthMPa,
    dir: "high",
    render: (m) => <NumCell v={m.tensileStrengthMPa} unitSuffix="MPa" />,
  },
  {
    key: "thickness",
    label: "Thickness",
    termKey: "micron",
    unit: "µm",
    render: (m) => <NumCell v={m.thicknessMicron} unitSuffix="µm" />,
  },
  {
    key: "sealability",
    label: "Sealability",
    termKey: "sealability",
    render: (m) => <span className="text-sm text-navy-900">{INTENSITY_LABEL[m.sealability]}</span>,
  },
  {
    key: "puncture",
    label: "Puncture resistance",
    render: (m) => <span className="text-sm text-navy-900">{INTENSITY_LABEL[m.punctureResistance]}</span>,
  },
  {
    key: "temp",
    label: "Temperature range",
    unit: "indicative service range",
    render: (m) =>
      m.tempMinC === null || m.tempMaxC === null ? (
        <NotAvailable />
      ) : (
        <span className="text-sm font-medium tabular-nums text-navy-900">
          {m.tempMinC} – {m.tempMaxC} °C
        </span>
      ),
  },
  {
    key: "food",
    label: "Food contact",
    unit: "material class",
    render: (m) =>
      m.foodContactSuitable ? (
        <span className="inline-flex items-center gap-1 text-sm text-forest-700">
          <Check className="size-4" aria-hidden /> Suitable — verify grade
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
          <Minus className="size-4" aria-hidden /> Not indicated
        </span>
      ),
  },
  {
    key: "cost",
    label: "Relative cost",
    unit: "indicative index 1 (low) – 5 (high)",
    numeric: (m) => m.relativeCostIndex,
    dir: "low",
    render: (m) => <CostDots idx={m.relativeCostIndex} />,
  },
  {
    key: "sustain",
    label: "Sustainability",
    unit: "indicative score · higher is better",
    numeric: (m) => m.sustainability.score,
    dir: "high",
    render: (m) => (
      <span className="inline-flex flex-col">
        <span className="text-sm font-medium tabular-nums text-navy-900">
          {Math.round(m.sustainability.score * 100)}%
        </span>
        <span className="text-[11px] text-muted-foreground">{RECYCLE_LABEL[m.sustainability.recyclable]}</span>
      </span>
    ),
  },
  {
    key: "availability",
    label: "Availability",
    unit: "indicative supply, India",
    render: (m) => <span className="text-sm text-navy-900">{INTENSITY_LABEL[m.availability]}</span>,
  },
  {
    key: "confidence",
    label: "Data confidence",
    render: (m) => <span className="text-xs leading-relaxed text-muted-foreground">{m.dataConfidenceNote}</span>,
  },
];

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-40px" },
  transition: { duration: 0.45, ease: "easeOut" as const },
};

function StatusBadge({ status }: { status: "recommended" | "viable" | "excluded" }) {
  const cls =
    status === "recommended"
      ? "bg-forest-700 text-cream-50 border-transparent"
      : status === "viable"
        ? "bg-cream-200 text-navy-800 border-transparent"
        : "bg-amber-100 text-amber-900 border-amber-600/30";
  return (
    <Badge variant="outline" className={cn("capitalize", cls)}>
      {status}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------

export default function CompareView() {
  const { compareIds, toggleCompare, clearCompare, setView, result, openPassport } =
    usePackVeda();

  const materials = useMemo(
    () =>
      compareIds
        .map((id) => getMaterial(id))
        .filter((m): m is PackagingMaterial => Boolean(m)),
    [compareIds]
  );

  const topCandidates = useMemo(
    () =>
      result
        ? result.candidates
            .filter((c) => c.status !== "excluded")
            .sort((a, b) => a.rank - b.rank)
            .slice(0, 5)
        : [],
    [result]
  );

  // ------------------------------------------------------------------ empty
  if (materials.length === 0) {
    const full = compareIds.length >= 4;
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <EmptyState
          icon={GitCompareArrows}
          title="No materials selected"
          description="Pick 2–4 packaging materials to compare their barrier, mechanical, cost and sustainability properties side by side — with a normalized radar chart and best-value highlighting."
          actionLabel="Browse material explorer"
          onAction={() => setView("explorer")}
        />

        {result && topCandidates.length > 0 && (
          <motion.div {...fadeUp} className="mt-8">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-navy-900">
              <Info className="size-4 text-forest-700" aria-hidden />
              Add from your analysis
            </h3>
            <div className="flex flex-wrap gap-2">
              {topCandidates.map((c) => (
                <Button
                  key={c.materialId}
                  variant="outline"
                  size="sm"
                  onClick={() => toggleCompare(c.materialId)}
                  className="gap-1.5"
                >
                  <Plus className="size-3.5 text-forest-700" aria-hidden />
                  <span className="text-xs">
                    #{c.rank} {c.materialName}
                  </span>
                </Button>
              ))}
            </div>
          </motion.div>
        )}

        <motion.div {...fadeUp} className="mt-8">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-navy-900">Quick add — all materials</h3>
            <span className="text-xs text-muted-foreground">{compareIds.length} of 4 selected</span>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {MATERIALS.map((m) => {
              const disabled = full;
              return (
                <button
                  key={m.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleCompare(m.id)}
                  aria-label={`Add ${m.name} to comparison`}
                  className={cn(
                    "rounded-lg border bg-card p-3 text-left transition",
                    disabled
                      ? "cursor-not-allowed opacity-50"
                      : "hover:border-forest-600 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600"
                  )}
                >
                  <p className="line-clamp-2 text-xs font-semibold text-navy-950">{m.name}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{m.family}</p>
                  <p className="mt-1.5 text-[10px] tabular-nums text-muted-foreground">
                    OTR ≈ {m.otr === null ? "n/a" : fmtNum(m.otr)} · WVTR ≈{" "}
                    {m.wvtr === null ? "n/a" : fmtNum(m.wvtr)}
                  </p>
                </button>
              );
            })}
          </div>
        </motion.div>
      </div>
    );
  }

  // -------------------------------------------------------------- comparison
  const radarData = RADAR_AXES.map((axis) => {
    const row: Record<string, string | number> = { axis: axis.label };
    materials.forEach((m) => {
      row[m.name] = axisValue(axis.key, m);
    });
    return row;
  });

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      {/* Header */}
      <BackButton label="Back to Results" fallback="results" />
      <motion.div {...fadeUp} className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-forest-600">
            Comparison
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy-950 md:text-3xl">
            Material Comparison
          </h1>
          <p className="mt-1.5 flex items-center gap-2 text-sm text-navy-600">
            <Badge variant="secondary" className="tabular-nums">
              {materials.length} of 4 selected
            </Badge>
            Normalized radar scores (0–100, higher is better) and indicative property values.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={materials.length >= 4}>
                <Plus className="size-4" aria-hidden /> Add materials
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add a material to compare</DialogTitle>
                <DialogDescription>
                  Choose from the knowledge base — up to 4 materials can be compared
                  side by side.
                </DialogDescription>
              </DialogHeader>
              <div className="scroll-slim max-h-80 space-y-1.5 overflow-y-auto pr-1">
                {MATERIALS.filter((m) => !compareIds.includes(m.id)).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => toggleCompare(m.id)}
                    disabled={materials.length >= 4}
                    className="flex w-full items-center justify-between rounded-lg border border-border bg-card px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-forest-50 disabled:opacity-50"
                  >
                    <span className="font-medium text-navy-900">{m.name}</span>
                    <span className="text-xs text-navy-600">{m.family}</span>
                  </button>
                ))}
                {MATERIALS.filter((m) => !compareIds.includes(m.id)).length === 0 && (
                  <p className="py-6 text-center text-sm text-navy-600">
                    All knowledge-base materials are already in the comparison.
                  </p>
                )}
              </div>
            </DialogContent>
          </Dialog>
          <Button
            variant="outline"
            size="sm"
            onClick={clearCompare}
            className="gap-1.5 text-muted-foreground"
          >
            <X className="size-4" aria-hidden /> Clear
          </Button>
        </div>
      </motion.div>

      {/* Radar chart */}
      <motion.div {...fadeUp}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Normalized property profile</CardTitle>
            <CardDescription>
              Each axis is normalized to 0–100 so very different units can be compared at a
              glance. Barrier axes invert transmission rates (lower OTR/WVTR → higher score).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              role="img"
              aria-label={`Radar chart comparing ${materials.map((m) => m.name).join(", ")} across six normalized properties`}
              className="w-full"
            >
              <ResponsiveContainer width="100%" height={340}>
                <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="72%">
                  <PolarGrid stroke="var(--color-cream-300)" />
                  <PolarAngleAxis
                    dataKey="axis"
                    tick={{ fill: "var(--color-navy-700)", fontSize: 11 }}
                  />
                  <PolarRadiusAxis
                    domain={[0, 100]}
                    tick={{ fill: "var(--color-navy-600)", fontSize: 10 }}
                    tickCount={5}
                    axisLine={false}
                  />
                  {materials.map((m, i) => (
                    <Radar
                      key={m.id}
                      name={m.name}
                      dataKey={m.name}
                      stroke={PALETTE[i % PALETTE.length]}
                      fill={PALETTE[i % PALETTE.length]}
                      fillOpacity={0.15}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </RadarChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <ul className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
              {materials.map((m, i) => (
                <li key={m.id} className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="size-3 rounded-sm"
                    style={{ background: PALETTE[i % PALETTE.length] }}
                  />
                  <span className="text-xs font-medium text-navy-800">{m.name}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </motion.div>

      {/* Property table */}
      <motion.div {...fadeUp} className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Property comparison</CardTitle>
            <CardDescription>
              Indicative literature values. The best value per numeric row is highlighted —
              lower OTR/WVTR/CO₂TR/cost is better; higher tensile strength and sustainability
              are better.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="-mx-2 overflow-x-auto scroll-slim px-2 pb-1 [&_[data-slot=table-container]]:overflow-x-visible">
              <Table className="min-w-[760px]">
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-44 align-bottom">
                      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Property
                      </span>
                    </TableHead>
                    {materials.map((m, i) => (
                      <TableHead key={m.id} className="min-w-44 align-bottom">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-1.5">
                            <span
                              aria-hidden
                              className="size-2.5 shrink-0 rounded-full"
                              style={{ background: PALETTE[i % PALETTE.length] }}
                            />
                            <span className="text-sm font-semibold leading-snug text-navy-950">
                              {m.name}
                            </span>
                          </div>
                          <span className="text-[11px] font-normal text-muted-foreground">
                            {m.family}
                          </span>
                          <div className="mt-1 flex items-center gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 gap-1 px-2 text-[11px]"
                              onClick={() => openPassport(m.id)}
                            >
                              <BookOpen className="size-3" aria-hidden /> Passport
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-[11px] text-muted-foreground hover:text-destructive"
                              onClick={() => toggleCompare(m.id)}
                              aria-label={`Remove ${m.name} from comparison`}
                            >
                              <X className="size-3.5" aria-hidden /> Remove
                            </Button>
                          </div>
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ROWS.map((row) => {
                    // Best-value detection for numeric rows with a direction
                    let bestIds: Set<string> | null = null;
                    if (row.numeric && row.dir) {
                      const vals = materials
                        .map((m) => ({ id: m.id, v: row.numeric!(m) }))
                        .filter((x) => x.v !== null) as { id: string; v: number }[];
                      if (vals.length >= 2) {
                        const best =
                          row.dir === "low"
                            ? Math.min(...vals.map((x) => x.v))
                            : Math.max(...vals.map((x) => x.v));
                        bestIds = new Set(vals.filter((x) => x.v === best).map((x) => x.id));
                      }
                    }
                    return (
                      <TableRow key={row.key} className="hover:bg-cream-100/60">
                        <TableCell className="align-middle">
                          <div>
                            <p className="text-sm font-medium text-navy-900">
                              {row.termKey ? <Term k={row.termKey}>{row.label}</Term> : row.label}
                            </p>
                            {row.unit && (
                              <p className="text-[11px] text-muted-foreground">{row.unit}</p>
                            )}
                          </div>
                        </TableCell>
                        {materials.map((m) => {
                          const isBest = bestIds?.has(m.id) ?? false;
                          return (
                            <TableCell
                              key={m.id}
                              className={cn(
                                "align-middle",
                                isBest && "bg-forest-50"
                              )}
                            >
                              <span className="inline-flex items-center gap-1.5">
                                {isBest && (
                                  <Check
                                    className="size-3.5 shrink-0 text-forest-600"
                                    aria-label="Best value in this row"
                                  />
                                )}
                                {row.render(m)}
                              </span>
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Data provenance note */}
      <motion.div {...fadeUp} className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-600/30 bg-amber-50/70 px-4 py-3">
          <p className="flex items-start gap-2 text-sm text-amber-900">
            <Info className="mt-0.5 size-4 shrink-0 text-amber-700" aria-hidden />
            <span>
              Comparison uses indicative literature values — always verify with the supplier{" "}
              <Term k="datasheet">datasheet</Term> before any purchase or trial decision.
            </span>
          </p>
          <MaturityBadge status="available" />
        </div>
      </motion.div>

      {/* Recommendation context */}
      {result && (
        <motion.div {...fadeUp} className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recommendation context</CardTitle>
              <CardDescription>
                How the PackVeda engine currently ranks these materials for your last analysis —
                for comparison context only; property data above is independent of the engine.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {materials.map((m) => {
                const c = result.candidates.find((x) => x.materialId === m.id);
                return (
                  <div key={m.id} className="rounded-lg border bg-cream-50/70 p-3">
                    <p className="line-clamp-2 text-xs font-semibold text-navy-950">{m.name}</p>
                    {c ? (
                      <>
                        <div className="mt-2 flex items-center gap-2">
                          <StatusBadge status={c.status} />
                          {c.rank >= 1 && (
                            <span className="text-[11px] text-muted-foreground">
                              Rank #{c.rank}
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-2xl font-bold tabular-nums text-forest-700">
                          {Math.round(c.score)}
                          <span className="ml-0.5 text-xs font-medium text-muted-foreground">
                            /100 engine score
                          </span>
                        </p>
                        {c.exclusionReasons.length > 0 && (
                          <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-amber-800">
                            {c.exclusionReasons[0]}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="mt-2 text-xs italic text-muted-foreground">
                        Not part of this analysis run.
                      </p>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Footer hint */}
      <motion.p
        {...fadeUp}
        className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground"
      >
        Continue to the packaging passport for full detail per material
        <ArrowRight className="size-3.5" aria-hidden />
      </motion.p>
    </div>
  );
}
