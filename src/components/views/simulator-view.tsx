"use client";

// PACKVEDA — Scenario Simulation (What-If) view.
// Adjust storage / shelf-life / priority values and re-run the SAME live
// deterministic engine (/api/analyze) to see how the ranked candidates change.
// No new model, no LLM — identical engine, honest side-by-side diff.

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowDownRight,
  ArrowUpRight,
  FlaskConical,
  Info,
  Loader2,
  Minus,
  Play,
  RotateCcw,
  SlidersHorizontal,
  Thermometer,
} from "lucide-react";
import { usePackVeda, IMPORTANCE_LABEL, DEMO_SCENARIOS } from "@/lib/store";
import type { AnalysisInput, CandidateResult, EngineOutput, Importance, RequirementKey } from "@/lib/engine";
import { MaturityBadge } from "@/components/shared/maturity-badge";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { BackButton } from "@/components/shared/back-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const IMPORTANCE_KEYS = Object.keys(IMPORTANCE_LABEL) as Importance[];

const SHELF_CHIPS = [7, 30, 90, 180, 365];

function topCandidates(out: EngineOutput): CandidateResult[] {
  return out.candidates
    .filter((c) => c.status !== "excluded")
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 5);
}

function fmtLevel(level: string | undefined): string {
  return level ?? "—";
}

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-40px" },
  transition: { duration: 0.45, ease: "easeOut" as const },
};

// ---------------------------------------------------------------------------
// Sub components
// ---------------------------------------------------------------------------

function RankRow({
  candidate,
  index,
  diff,
}: {
  candidate: CandidateResult;
  index: number;
  diff?: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-2.5 rounded-lg border bg-cream-50/70 px-3 py-2">
      <span className="w-5 shrink-0 text-center text-xs font-bold tabular-nums text-navy-600">
        {index + 1}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-navy-900">
        {candidate.materialName}
      </span>
      <span className="shrink-0 text-sm font-semibold tabular-nums text-forest-700">
        {Math.round(candidate.score)}
      </span>
      {diff}
    </li>
  );
}

// ---------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------

export default function SimulatorView() {
  const {
    result,
    wizardInput,
    simResult,
    setSimResult,
    simulating,
    setSimulating,
    setView,
    applyDemo,
  } = usePackVeda();

  // Local scenario state (base = wizardInput)
  const [temp, setTemp] = useState<number>(wizardInput.storageTempC ?? 25);
  const [rh, setRh] = useState<number>(wizardInput.storageRH ?? 60);
  const [shelf, setShelf] = useState<number>(wizardInput.targetShelfLifeDays ?? 90);
  const [cost, setCost] = useState<Importance>(wizardInput.priorities?.cost ?? "medium");
  const [sustain, setSustain] = useState<Importance>(
    wizardInput.priorities?.sustainability ?? "medium"
  );
  const [barrier, setBarrier] = useState<Importance>(wizardInput.priorities?.barrier ?? "medium");
  const [error, setError] = useState<string | null>(null);

  // Sync controls when the base analysis changes
  useEffect(() => {
    setTemp(wizardInput.storageTempC ?? 25);
    setRh(wizardInput.storageRH ?? 60);
    setShelf(wizardInput.targetShelfLifeDays ?? 90);
    setCost(wizardInput.priorities?.cost ?? "medium");
    setSustain(wizardInput.priorities?.sustainability ?? "medium");
    setBarrier(wizardInput.priorities?.barrier ?? "medium");
  }, [wizardInput]);

  const hasBase = Boolean(result);
  const hasInput = Boolean(wizardInput?.commodityId);

  const scenarioInput: AnalysisInput = useMemo(
    () => ({
      ...wizardInput,
      storageTempC: temp,
      storageRH: rh,
      targetShelfLifeDays: shelf,
      priorities: {
        ...wizardInput.priorities,
        cost,
        sustainability: sustain,
        barrier,
      },
    }),
    [wizardInput, temp, rh, shelf, cost, sustain, barrier]
  );

  async function runSimulation() {
    if (!wizardInput?.commodityId) {
      setError("Complete the analysis wizard first — the simulation re-runs it with new values.");
      return;
    }
    setSimulating(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scenarioInput),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error((data as { error?: string })?.error || "Simulation failed.");
      }
      setSimResult(data as EngineOutput);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Simulation failed. Please try again."
      );
    } finally {
      setSimulating(false);
    }
  }

  function resetToBase() {
    setTemp(wizardInput.storageTempC ?? 25);
    setRh(wizardInput.storageRH ?? 60);
    setShelf(wizardInput.targetShelfLifeDays ?? 90);
    setCost(wizardInput.priorities?.cost ?? "medium");
    setSustain(wizardInput.priorities?.sustainability ?? "medium");
    setBarrier(wizardInput.priorities?.barrier ?? "medium");
    setError(null);
  }

  // ------------------------------------------------------------- empty state
  if (!hasInput && !hasBase) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <BackButton label="Back to Results" fallback="results" />
        <EmptyState
          icon={SlidersHorizontal}
          title="Run an analysis first"
          description="Scenario Simulation re-runs your analysis with adjusted storage conditions, shelf-life targets or business priorities. Complete the wizard (or start from a demo) to unlock what-if comparisons."
          actionLabel="Go to analysis"
          onAction={() => setView("analyze")}
        />
        <motion.div {...fadeUp} className="mt-8">
          <h3 className="mb-3 text-center text-sm font-semibold text-navy-900">
            Or start from a demo scenario
          </h3>
          <div className="flex flex-wrap justify-center gap-2">
            {DEMO_SCENARIOS.map((s) => (
              <Button
                key={s.id}
                variant="outline"
                size="sm"
                onClick={() => applyDemo(s.id)}
                className="gap-1.5"
              >
                <FlaskConical className="size-3.5 text-forest-700" aria-hidden />
                <span className="text-xs">{s.label}</span>
              </Button>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  // ------------------------------------------------------------- diff models
  const baseTop = result ? topCandidates(result) : [];
  const simTop = simResult ? topCandidates(simResult) : [];
  const baseIdxById = new Map(baseTop.map((c, i) => [c.materialId, i]));
  const simIdxById = new Map(simTop.map((c, i) => [c.materialId, i]));

  const topChanged =
    baseTop.length > 0 && simTop.length > 0 && baseTop[0].materialId !== simTop[0].materialId;

  const reqDiff = (result && simResult
    ? (["moisture", "oxygen"] as RequirementKey[])
        .map((key) => {
          const b = result.requirements.find((r) => r.key === key);
          const s = simResult.requirements.find((r) => r.key === key);
          if (!b && !s) return null;
          const changed = fmtLevel(b?.level) !== fmtLevel(s?.level);
          return { key, label: (b ?? s)!.label, base: b?.level, sim: s?.level, changed };
        })
        .filter(Boolean as unknown as (v: unknown) => boolean)
    : []) as { key: RequirementKey; label: string; base?: string; sim?: string; changed: boolean }[];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      <BackButton label="Back to Results" fallback="results" />
      {/* Header */}
      <motion.div {...fadeUp} className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-forest-600">
            What-If
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy-950 md:text-3xl">
            Scenario Simulation
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-navy-600">
            What happens if storage temperature increases? Adjust storage conditions,
            shelf-life targets or business priorities and re-run the live engine to see how the
            ranked candidates change.
          </p>
        </div>
        <MaturityBadge status="available" label="Uses the live engine" />
      </motion.div>

      {/* Controls */}
      <motion.div {...fadeUp}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Scenario controls</CardTitle>
            <CardDescription>
              Base values come from your current analysis input. Every run uses the same
              deterministic engine — only the values you change are different.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {/* Temperature */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="sim-temp" className="flex items-center gap-1.5 text-sm">
                  <Thermometer className="size-3.5 text-forest-700" aria-hidden />
                  Storage temperature
                </Label>
                <span className="text-sm font-semibold tabular-nums text-navy-950">
                  {temp} °C
                </span>
              </div>
              <Slider
                id="sim-temp"
                min={-30}
                max={45}
                step={1}
                value={[temp]}
                onValueChange={(v) => setTemp(v[0] ?? temp)}
                aria-label="Storage temperature in degrees Celsius"
              />
              <p className="text-xs text-muted-foreground">
                Base: {wizardInput.storageTempC} °C
              </p>
            </div>

            {/* Relative humidity */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="sim-rh" className="text-sm">
                  Relative humidity
                </Label>
                <span className="text-sm font-semibold tabular-nums text-navy-950">{rh} %</span>
              </div>
              <Slider
                id="sim-rh"
                min={10}
                max={95}
                step={1}
                value={[rh]}
                onValueChange={(v) => setRh(v[0] ?? rh)}
                aria-label="Relative humidity in percent"
              />
              <p className="text-xs text-muted-foreground">Base: {wizardInput.storageRH} %</p>
            </div>

            {/* Target shelf life */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="sim-shelf" className="text-sm">
                  Target shelf life
                </Label>
                <span className="text-sm font-semibold tabular-nums text-navy-950">
                  {shelf} days
                </span>
              </div>
              <Input
                id="sim-shelf"
                type="number"
                min={1}
                max={1825}
                value={shelf}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  setShelf(Number.isFinite(n) && n >= 1 ? Math.min(1825, Math.round(n)) : 1);
                }}
                aria-label="Target shelf life in days"
              />
              <div className="flex flex-wrap items-center gap-1.5">
                {SHELF_CHIPS.map((d) => (
                  <Button
                    key={d}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShelf(d)}
                    className={cn(
                      "h-6 rounded-full px-2.5 text-[11px]",
                      shelf === d && "border-forest-600 bg-forest-50 text-forest-800"
                    )}
                  >
                    {d} d
                  </Button>
                ))}
                <span className="text-xs text-muted-foreground">
                  Base: {wizardInput.targetShelfLifeDays} days
                </span>
              </div>
            </div>

            {/* Cost priority */}
            <div className="space-y-2.5">
              <Label htmlFor="sim-cost" className="text-sm">
                Cost priority
              </Label>
              <Select value={cost} onValueChange={(v) => setCost(v as Importance)}>
                <SelectTrigger id="sim-cost" aria-label="Cost priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IMPORTANCE_KEYS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {IMPORTANCE_LABEL[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Base: {IMPORTANCE_LABEL[wizardInput.priorities?.cost ?? "medium"]}
              </p>
            </div>

            {/* Sustainability priority */}
            <div className="space-y-2.5">
              <Label htmlFor="sim-sustain" className="text-sm">
                Sustainability priority
              </Label>
              <Select value={sustain} onValueChange={(v) => setSustain(v as Importance)}>
                <SelectTrigger id="sim-sustain" aria-label="Sustainability priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IMPORTANCE_KEYS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {IMPORTANCE_LABEL[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Base: {IMPORTANCE_LABEL[wizardInput.priorities?.sustainability ?? "medium"]}
              </p>
            </div>

            {/* Barrier priority */}
            <div className="space-y-2.5">
              <Label htmlFor="sim-barrier" className="text-sm">
                Barrier priority
              </Label>
              <Select value={barrier} onValueChange={(v) => setBarrier(v as Importance)}>
                <SelectTrigger id="sim-barrier" aria-label="Barrier priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {IMPORTANCE_KEYS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {IMPORTANCE_LABEL[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Base: {IMPORTANCE_LABEL[wizardInput.priorities?.barrier ?? "medium"]}
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Run row */}
      <motion.div {...fadeUp} className="mt-5 flex flex-wrap items-center gap-3">
        <Button
          onClick={runSimulation}
          disabled={simulating || !wizardInput?.commodityId}
          className="gap-2 bg-forest-700 text-cream-50 hover:bg-forest-600"
        >
          {simulating ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Play className="size-4" aria-hidden />
          )}
          Run Simulation
        </Button>
        <Button
          variant="outline"
          onClick={resetToBase}
          disabled={simulating}
          className="gap-1.5 text-muted-foreground"
        >
          <RotateCcw className="size-3.5" aria-hidden />
          Reset to base values
        </Button>
        {!wizardInput?.commodityId && (
          <p className="text-xs text-muted-foreground">
            Complete the analysis wizard to unlock simulation.
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {error}
          </p>
        )}
      </motion.div>

      {/* Results region */}
      {(simulating || simResult) && (
        <motion.section {...fadeUp} className="relative mt-6" aria-live="polite">
          {simulating && (
            <div
              className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-xl bg-cream-50/80 backdrop-blur-sm"
              role="status"
            >
              <Loader2 className="size-8 animate-spin text-forest-700" aria-hidden />
              <p className="text-sm font-medium text-navy-800">Re-running the engine…</p>
            </div>
          )}

          {!simResult ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
                <FlaskConical className="size-7 text-forest-600" aria-hidden />
                <p className="text-sm font-medium text-navy-900">Running your first scenario…</p>
                <p className="text-xs text-muted-foreground">
                  Results will appear here as a side-by-side ranking diff.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Top pick alert */}
              {hasBase && baseTop.length > 0 && simTop.length > 0 && (
                <Alert
                  className={cn(
                    "mb-4",
                    topChanged
                      ? "border-amber-600/30 bg-amber-50/70"
                      : "border-forest-600/30 bg-forest-50/70"
                  )}
                >
                  <Info
                    className={topChanged ? "text-amber-700" : "text-forest-700"}
                    aria-hidden
                  />
                  <AlertTitle>
                    {topChanged
                      ? `Top recommendation changed: ${baseTop[0].materialName} → ${simTop[0].materialName}`
                      : "Top recommendation unchanged"}
                  </AlertTitle>
                  <AlertDescription>
                    {topChanged
                      ? "The adjusted scenario flips the engine's first pick — review both passports before deciding."
                      : "The adjusted scenario keeps the same first pick; scores below may still have shifted."}
                  </AlertDescription>
                </Alert>
              )}

              {/* Side-by-side top 5 */}
              <div
                className={cn(
                  "grid gap-4",
                  hasBase ? "md:grid-cols-2" : "mx-auto max-w-xl"
                )}
              >
                {hasBase && (
                  <Card className="gap-4 py-5">
                    <CardHeader className="pb-0">
                      <CardTitle className="text-sm font-semibold text-navy-950">
                        Base — Top 5
                      </CardTitle>
                      <CardDescription>Your original analysis ranking.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {baseTop.map((c, i) => {
                          const dropped = !simIdxById.has(c.materialId);
                          return (
                            <RankRow
                              key={c.materialId}
                              candidate={c}
                              index={i}
                              diff={
                                dropped ? (
                                  <Badge
                                    variant="outline"
                                    className="shrink-0 text-[10px] text-muted-foreground"
                                  >
                                    Dropped
                                  </Badge>
                                ) : (
                                  <Minus
                                    className="size-4 shrink-0 text-muted-foreground/60"
                                    aria-label="Rank unchanged"
                                  />
                                )
                              }
                            />
                          );
                        })}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                <Card className="gap-4 py-5">
                  <CardHeader className="pb-0">
                    <CardTitle className="text-sm font-semibold text-navy-950">
                      Scenario — Top 5
                    </CardTitle>
                    <CardDescription>
                      Re-run with the adjusted values: {temp} °C, {rh} % RH, {shelf}-day target.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {simTop.map((c, i) => {
                        const bIdx = baseIdxById.get(c.materialId);
                        let diff: React.ReactNode;
                        if (bIdx === undefined) {
                          diff = (
                            <Badge
                              variant="outline"
                              className="shrink-0 border-forest-600/30 bg-forest-50 text-[10px] text-forest-800"
                            >
                              New
                            </Badge>
                          );
                        } else if (i < bIdx) {
                          diff = (
                            <ArrowUpRight
                              className="size-4 shrink-0 text-forest-600"
                              aria-label={`Rank improved from ${bIdx + 1} to ${i + 1}`}
                            />
                          );
                        } else if (i > bIdx) {
                          diff = (
                            <ArrowDownRight
                              className="size-4 shrink-0 text-amber-600"
                              aria-label={`Rank dropped from ${bIdx + 1} to ${i + 1}`}
                            />
                          );
                        } else {
                          diff = (
                            <Minus
                              className="size-4 shrink-0 text-muted-foreground/60"
                              aria-label="Rank unchanged"
                            />
                          );
                        }
                        return <RankRow key={c.materialId} candidate={c} index={i} diff={diff} />;
                      })}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Requirements diff */}
              {hasBase && reqDiff.length > 0 && (
                <Card className="mt-4 gap-4 py-5">
                  <CardHeader className="pb-0">
                    <CardTitle className="text-sm font-semibold text-navy-950">
                      Derived requirements diff
                    </CardTitle>
                    <CardDescription>
                      How the engine's derived packaging requirements shift in this scenario.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="flex flex-wrap gap-2.5">
                      {reqDiff.map((r) => (
                        <li
                          key={r.key}
                          className="flex items-center gap-2 rounded-lg border bg-cream-50/70 px-3 py-2"
                        >
                          <span className="text-sm font-medium text-navy-900">{r.label}</span>
                          {r.changed ? (
                            <Badge
                              variant="outline"
                              className="gap-1.5 border-amber-600/30 bg-amber-50/80 font-mono text-[11px] text-amber-900"
                            >
                              {fmtLevel(r.base)} → {fmtLevel(r.sim)}
                            </Badge>
                          ) : (
                            <Badge
                              variant="outline"
                              className="font-mono text-[11px] text-muted-foreground"
                            >
                              {fmtLevel(r.sim)} (unchanged)
                            </Badge>
                          )}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {!hasBase && (
                <p className="mt-4 text-center text-xs text-muted-foreground">
                  Run the base analysis to unlock the side-by-side diff and requirements
                  comparison.
                </p>
              )}
            </>
          )}
        </motion.section>
      )}

      {/* Disclaimer */}
      <motion.p
        {...fadeUp}
        className="mt-8 rounded-xl border border-dashed border-border bg-card/60 px-4 py-3 text-center text-xs leading-relaxed text-muted-foreground"
      >
        Simulations use the same deterministic engine and indicative data — validate any
        scenario with trials before adoption.
      </motion.p>
    </div>
  );
}
