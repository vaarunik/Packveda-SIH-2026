// PACKVEDA — Dashboard view: the user's packaging decision workspace.
// Aggregates saved analyses, saved candidates and trials; offers demo scenarios.
// This module orchestrates data; it never generates packaging test outcomes.

"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Bookmark,
  BookOpenCheck,
  Factory,
  FileSearch,
  FlaskConical,
  GitCompare,
  Layers,
  MessageSquareQuote,
  Package,
  PlayCircle,
  RotateCcw,
  Scale,
  Store,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";

import { usePackVeda, DEMO_SCENARIOS } from "@/lib/store";
import type { EngineOutput } from "@/lib/engine";
import { EmptyState } from "@/components/shared/empty-state";
import { MaturityBadge } from "@/components/shared/maturity-badge";
import {
  TrialStatusBadge,
  TRIAL_STATUSES,
  TRIAL_STATUS_BADGE,
  TRIAL_STATUS_LABELS,
  type TrialStatus,
} from "@/components/views/trials-view";

// ---------------------------------------------------------------------------
// API row shapes (mirror the Prisma models returned by the API routes)
// ---------------------------------------------------------------------------

interface AnalysisRow {
  id: string;
  label: string;
  commodity: string;
  inputsJson: string;
  resultJson: string;
  createdAt: string;
  updatedAt: string;
}

interface SavedRow {
  id: string;
  materialId: string;
  materialName: string;
  commodity: string;
  score: number | null;
  createdAt: string;
  updatedAt: string;
  trial?: {
    id: string;
    status: string;
    materialId: string;
    materialName: string;
    commodity: string;
    dataJson: string;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
  } | null;
}

export interface TrialRow {
  id: string;
  savedCandidateId: string | null;
  materialId: string;
  materialName: string;
  commodity: string;
  status: string;
  dataJson: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

const dateFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function formatDate(iso: string): string {
  try {
    return dateFormatter.format(new Date(iso));
  } catch {
    return "—";
  }
}

function safeParseEngineOutput(json: string): EngineOutput | null {
  try {
    const parsed = JSON.parse(json);
    if (parsed && typeof parsed === "object" && "engineMeta" in parsed) {
      return parsed as EngineOutput;
    }
    return null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------

export default function DashboardView() {
  const { setView, applyDemo, openPassport, compareIds, profile } = usePackVeda();
  const { toast } = useToast();

  const [analyses, setAnalyses] = useState<AnalysisRow[]>([]);
  const [saved, setSaved] = useState<SavedRow[]>([]);
  const [trials, setTrials] = useState<TrialRow[]>([]);
  const [supplierCount, setSupplierCount] = useState<number | null>(null);
  const [requestCount, setRequestCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refreshAll = useCallback(async () => {
    let hadFailure = false;
    setLoading(true);

    const [analysesRes, savedRes, trialsRes] = await Promise.allSettled([
      apiFetch("/api/analyses", { cache: "no-store" }),
      apiFetch("/api/saved", { cache: "no-store" }),
      apiFetch("/api/trials", { cache: "no-store" }),
    ]);

    // Each endpoint degrades gracefully — a failure leaves an empty array.
    if (analysesRes.status === "fulfilled" && analysesRes.value.ok) {
      const data = await analysesRes.value.json().catch(() => ({}));
      setAnalyses(Array.isArray(data.analyses) ? data.analyses : []);
    } else {
      setAnalyses([]);
      hadFailure = true;
    }

    if (savedRes.status === "fulfilled" && savedRes.value.ok) {
      const data = await savedRes.value.json().catch(() => ({}));
      setSaved(Array.isArray(data.saved) ? data.saved : []);
    } else {
      setSaved([]);
      hadFailure = true;
    }

    if (trialsRes.status === "fulfilled" && trialsRes.value.ok) {
      const data = await trialsRes.value.json().catch(() => ({}));
      setTrials(Array.isArray(data.trials) ? data.trials : []);
    } else {
      setTrials([]);
      hadFailure = true;
    }

    // Marketplace layer (prototype) — supplier listings + buyer requests.
    // Failures here degrade silently: counts stay null and cards hide.
    try {
      const [supRes, reqRes] = await Promise.allSettled([
        apiFetch("/api/supplier-materials", { cache: "no-store" }),
        apiFetch(
          profile?.email
            ? `/api/requests?buyerEmail=${encodeURIComponent(profile.email)}`
            : "/api/requests?buyerEmail=none@packveda.local",
          { cache: "no-store" }
        ),
      ]);
      if (supRes.status === "fulfilled" && supRes.value.ok) {
        const data = await supRes.value.json().catch(() => ({}));
        setSupplierCount(Array.isArray(data.materials) ? data.materials.length : 0);
      }
      if (reqRes.status === "fulfilled" && reqRes.value.ok) {
        const data = await reqRes.value.json().catch(() => ({}));
        setRequestCount(Array.isArray(data.requests) ? data.requests.length : 0);
      }
    } catch {
      /* marketplace stats optional */ }

    if (hadFailure) {
      setError("Some workspace data could not be loaded. Showing what is available.");
      toast({
        title: "Could not load all workspace data",
        description: "One or more sections may be empty. Please try refreshing.",
        variant: "destructive",
      });
    } else {
      setError(null);
    }
    setLoading(false);
  }, [toast, profile?.email]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  // ---- actions ------------------------------------------------------------

  const openAnalysis = (row: AnalysisRow) => {
    const parsed = safeParseEngineOutput(row.resultJson);
    if (!parsed) {
      toast({
        title: "Result unavailable",
        description: "This analysis snapshot could not be read.",
        variant: "destructive",
      });
      return;
    }
    usePackVeda.getState().setResult(parsed, row.label);
    setView("results");
  };

  const deleteAnalysis = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await apiFetch(`/api/analyses?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("delete failed");
      setAnalyses((prev) => prev.filter((a) => a.id !== id));
      toast({ title: "Analysis deleted" });
    } catch {
      toast({
        title: "Delete failed",
        description: "The analysis could not be removed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const deleteSaved = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await apiFetch(`/api/saved?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("delete failed");
      setSaved((prev) => prev.filter((s) => s.id !== id));
      toast({ title: "Saved candidate removed" });
    } catch {
      toast({
        title: "Delete failed",
        description: "The saved candidate could not be removed.",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const startTrialForSaved = async (row: SavedRow) => {
    try {
      const res = await apiFetch("/api/trials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          savedCandidateId: row.id,
          materialId: row.materialId,
          materialName: row.materialName,
          commodity: row.commodity,
          status: "planned",
        }),
      });
      if (!res.ok) throw new Error("create failed");
      toast({
        title: "Trial planned",
        description: `${row.materialName} added to trials as "Planned". Enter real test results there.`,
      });
      await refreshAll();
    } catch {
      toast({
        title: "Could not create trial",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  // ---- derived ------------------------------------------------------------

  const validatedCount = trials.filter((t) => t.status === "validated").length;
  const statusCounts: Record<TrialStatus, number> = {
    not_tested: 0,
    planned: 0,
    in_progress: 0,
    validated: 0,
    rejected: 0,
  };
  for (const t of trials) {
    if ((TRIAL_STATUSES as string[]).includes(t.status)) {
      statusCounts[t.status as TrialStatus] += 1;
    }
  }

  const stats = [
    { label: "Analyses Run", value: analyses.length, icon: FileSearch, hint: "Recommendation runs completed" },
    { label: "Saved Candidates", value: saved.length, icon: Bookmark, hint: "Shortlisted packaging options" },
    { label: "Trials Tracked", value: trials.length, icon: FlaskConical, hint: "Packaging trials recorded" },
    { label: "Validated", value: validatedCount, icon: BadgeCheck, hint: "Trials marked validated" },
    ...(supplierCount !== null
      ? [{ label: "Supplier Listings", value: supplierCount, icon: Store, hint: "Materials in the marketplace" }]
      : []),
    ...(requestCount !== null
      ? [{ label: "Your Requests", value: requestCount, icon: MessageSquareQuote, hint: "Sample & quote requests" }]
      : []),
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* ---- Header ---- */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-forest-600">
            Workspace
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-navy-950 sm:text-4xl">
            Dashboard
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-navy-600 sm:text-base">
            Your packaging decision workspace — analyses, shortlisted materials,
            trial progress and demo scenarios in one place.
          </p>
        </div>
        <Button
          onClick={() => setView("analyze")}
          className="bg-forest-700 text-cream-50 hover:bg-forest-600 shrink-0"
        >
          <FileSearch className="size-4" aria-hidden />
          Start New Analysis
        </Button>
      </motion.div>

      {/* ---- Role banner: PackVeda serves buyers AND sellers ---- */}
      {!loading && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-terracotta-500/25 bg-terracotta-50 px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-terracotta-100 text-terracotta-700">
              {profile?.role === "seller" ? <Factory className="size-4.5" aria-hidden /> : <Package className="size-4.5" aria-hidden />}
            </span>
            <div>
              <p className="text-sm font-semibold text-navy-950">
                {profile
                  ? profile.role === "seller"
                    ? `Seller workspace — ${profile.company || profile.name}`
                    : `Buyer workspace — ${profile.company || profile.name}`
                  : "PackVeda works for both sides of packaging"}
              </p>
              <p className="mt-0.5 text-[13px] text-navy-700">
                {profile?.role === "seller"
                  ? "Manage your material listings and respond to buyer requests."
                  : "Are you a packaging manufacturer? List your materials and receive matched requests."}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-terracotta-500/40 text-terracotta-700 hover:bg-terracotta-50"
            onClick={() => setView(profile?.role === "seller" ? "seller" : "onboarding")}
          >
            {profile?.role === "seller" ? (
              <>Open Seller Studio <ArrowRight className="size-3.5" aria-hidden /></>
            ) : (
              <>For Manufacturers <ArrowRight className="size-3.5" aria-hidden /></>
            )}
          </Button>
        </div>
      )}

      {/* ---- Stat cards ---- */}
      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="border-border/80">
                <CardContent className="p-4 sm:p-6">
                  <Skeleton className="size-10 rounded-lg" />
                  <Skeleton className="mt-4 h-8 w-16" />
                  <Skeleton className="mt-2 h-3 w-32" />
                </CardContent>
              </Card>
            ))
          : stats.map((s, i) => {
              const Icon = s.icon;
              return (
                <motion.div
                  key={s.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.05 * i, ease: "easeOut" }}
                >
                  <Card className="border-border/80 transition-shadow hover:shadow-sm">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex size-10 items-center justify-center rounded-lg bg-forest-50 text-forest-700">
                          <Icon className="size-5" aria-hidden />
                        </div>
                        <span className="text-3xl font-bold tabular-nums text-navy-950">
                          {s.value}
                        </span>
                      </div>
                      <p className="mt-3 text-sm font-semibold text-navy-900">{s.label}</p>
                      <p className="mt-0.5 text-xs text-navy-600">{s.hint}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
      </div>

      {error && (
        <div
          role="alert"
          className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {/* ---- Recent analyses + saved candidates ---- */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Recent Analyses */}
        <Card className="border-border/80">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileSearch className="size-4 text-forest-700" aria-hidden />
                <CardTitle className="text-base text-navy-950">Recent Analyses</CardTitle>
              </div>
              {analyses.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setView("analyze")}
                  className="text-forest-700 hover:text-forest-600 hover:bg-forest-50"
                >
                  New
                  <ArrowRight className="size-3.5" aria-hidden />
                </Button>
              )}
            </div>
            <CardDescription>
              Saved recommendation runs — reopen results or clean up history.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : analyses.length === 0 ? (
              <EmptyState
                icon={FileSearch}
                title="No analyses yet"
                description="Run your first packaging analysis and it will appear here so you can reopen the results anytime."
                actionLabel="Start New Analysis"
                onAction={() => setView("analyze")}
              />
            ) : (
              <ul className="max-h-96 space-y-2 overflow-y-auto pr-1 scroll-slim" aria-label="Recent analyses">
                {analyses.map((row) => {
                  const parsed = safeParseEngineOutput(row.resultJson);
                  return (
                    <li
                      key={row.id}
                      className="rounded-lg border border-border/80 bg-cream-50/60 p-3 transition-colors hover:border-forest-600/40"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-navy-950">
                            {row.label}
                          </p>
                          <p className="mt-0.5 text-xs text-navy-600">
                            {row.commodity || "—"} · {formatDate(row.createdAt)}
                            {parsed?.engineMeta?.engineVersion && (
                              <>
                                {" · "}
                                <span className="font-mono text-[10px] text-navy-600">
                                  {parsed.engineMeta.engineVersion}
                                </span>
                              </>
                            )}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openAnalysis(row)}
                            className="h-7 border-forest-600/40 px-2 text-xs text-forest-700 hover:bg-forest-50 hover:text-forest-600"
                          >
                            <PlayCircle className="size-3.5" aria-hidden />
                            Open results
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`Delete analysis ${row.label}`}
                            disabled={deletingId === row.id}
                            onClick={() => void deleteAnalysis(row.id)}
                            className="h-7 px-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="size-3.5" aria-hidden />
                          </Button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Saved Candidates */}
        <Card className="border-border/80">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Bookmark className="size-4 text-forest-700" aria-hidden />
              <CardTitle className="text-base text-navy-950">Saved Candidates</CardTitle>
            </div>
            <CardDescription>
              Shortlisted materials with passport access and trial shortcuts.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : saved.length === 0 ? (
              <EmptyState
                icon={Bookmark}
                title="No saved candidates"
                description="Save materials from your analysis results to build a procurement shortlist and track trials."
                actionLabel="Run an Analysis"
                onAction={() => setView("analyze")}
              />
            ) : (
              <ul className="max-h-96 space-y-2 overflow-y-auto pr-1 scroll-slim" aria-label="Saved candidates">
                {saved.map((row) => (
                  <li
                    key={row.id}
                    className="rounded-lg border border-border/80 bg-cream-50/60 p-3 transition-colors hover:border-forest-600/40"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-navy-950">
                          {row.materialName}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-navy-600">
                          <span>{row.commodity || "—"}</span>
                          {typeof row.score === "number" && (
                            <Badge
                              variant="outline"
                              className="border-forest-600/30 bg-forest-50 text-[10px] text-forest-800"
                            >
                              Score {Math.round(row.score)}
                            </Badge>
                          )}
                          {row.trial ? (
                            <TrialStatusBadge status={row.trial.status} />
                          ) : (
                            <span className="text-[11px] italic text-navy-600/80">
                              No trial yet
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openPassport(row.materialId)}
                          className="h-7 border-navy-700/30 px-2 text-xs text-navy-800 hover:bg-cream-100"
                        >
                          <BookOpenCheck className="size-3.5" aria-hidden />
                          Passport
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!!row.trial}
                          onClick={() => void startTrialForSaved(row)}
                          className="h-7 border-forest-600/40 px-2 text-xs text-forest-700 hover:bg-forest-50 hover:text-forest-600"
                        >
                          <FlaskConical className="size-3.5" aria-hidden />
                          {row.trial ? "Trial exists" : "Start Trial"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`Remove saved candidate ${row.materialName}`}
                          disabled={deletingId === row.id}
                          onClick={() => void deleteSaved(row.id)}
                          className="h-7 px-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ---- Validation status summary ---- */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <Card className="mt-6 border-border/80">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <BadgeCheck className="size-4 text-forest-700" aria-hidden />
                <CardTitle className="text-base text-navy-950">Validation Status</CardTitle>
              </div>
              <Button
                size="sm"
                onClick={() => setView("trials")}
                className="bg-forest-700 text-cream-50 hover:bg-forest-600"
              >
                <FlaskConical className="size-3.5" aria-hidden />
                Go to Trials
              </Button>
            </div>
            <CardDescription>
              How your packaging trials are progressing. Only you can mark a
              material validated — after documented testing.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-full max-w-md rounded-full" />
                <Skeleton className="h-14 w-full rounded-lg" />
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  {TRIAL_STATUSES.map((status) => (
                    <Badge
                      key={status}
                      variant="outline"
                      className={`gap-1.5 text-[11px] ${TRIAL_STATUS_BADGE[status]}`}
                    >
                      <span
                        aria-hidden
                        className="inline-block size-1.5 rounded-full bg-current"
                      />
                      {TRIAL_STATUS_LABELS[status]}
                      <span className="font-bold tabular-nums">{statusCounts[status]}</span>
                    </Badge>
                  ))}
                </div>
                <Separator className="my-4" />
                {trials.length === 0 ? (
                  <p className="text-sm text-navy-600">
                    No trials tracked yet — plan one from a saved candidate or the
                    Trials module.
                  </p>
                ) : (
                  <ul className="max-h-96 space-y-2 overflow-y-auto pr-1 scroll-slim" aria-label="Trial status list">
                    {trials.slice(0, 10).map((t) => (
                      <li
                        key={t.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-cream-50/60 px-3 py-2"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-navy-950">
                            {t.materialName}
                          </p>
                          <p className="text-[11px] text-navy-600">
                            Updated {formatDate(t.updatedAt)}
                          </p>
                        </div>
                        <TrialStatusBadge status={t.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ---- Demo scenarios ---- */}
      <motion.div
        id="demo-scenarios"
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <Card className="mt-6 border-border/80">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Layers className="size-4 text-forest-700" aria-hidden />
                <CardTitle className="text-base text-navy-950">Demo Scenarios</CardTitle>
              </div>
              <MaturityBadge status="available" />
            </div>
            <CardDescription>
              One-click realistic cases covering grains, fresh produce, spices and
              oilseeds — inputs are prefilled and the engine runs instantly.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {DEMO_SCENARIOS.map((scenario, i) => (
                <motion.div
                  key={scenario.id}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.3, delay: 0.04 * i, ease: "easeOut" }}
                  className="flex flex-col rounded-xl border border-border/80 bg-cream-50/60 p-4 transition-colors hover:border-forest-600/40"
                >
                  <p className="text-sm font-semibold leading-snug text-navy-950">
                    {scenario.label}
                  </p>
                  <p className="mt-1.5 flex-1 text-xs leading-relaxed text-navy-600">
                    {scenario.description}
                  </p>
                  <Button
                    size="sm"
                    onClick={() => applyDemo(scenario.id)}
                    className="mt-3 w-full bg-forest-700 text-cream-50 hover:bg-forest-600"
                  >
                    <PlayCircle className="size-4" aria-hidden />
                    Run scenario
                  </Button>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ---- What-if + comparison mini cards ---- */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          <Card className="h-full border-border/80 bg-navy-950 text-cream-50">
            <CardContent className="flex h-full flex-col justify-between gap-3 bg-grid-navy p-4 sm:p-6">
              <div>
                <div className="flex items-center gap-2">
                  <Scale className="size-4 text-emerald-400" aria-hidden />
                  <p className="text-sm font-semibold text-cream-50">What-if Scenarios</p>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-cream-100/70">
                  Adjust storage, transport and priorities to see how the
                  recommendation responds — without rerunning the wizard.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setView("simulator")}
                className="w-full bg-cream-50 text-navy-950 hover:bg-cream-100 sm:w-auto"
              >
                Open Scenario Simulation
                <ArrowRight className="size-3.5" aria-hidden />
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.35, delay: 0.05, ease: "easeOut" }}
        >
          <Card className="h-full border-border/80">
            <CardContent className="flex h-full flex-col justify-between gap-3 p-4 sm:p-6">
              <div>
                <div className="flex items-center gap-2">
                  <GitCompare className="size-4 text-forest-700" aria-hidden />
                  <p className="text-sm font-semibold text-navy-950">Comparison History</p>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-navy-600">
                  Side-by-side barrier, cost and sustainability comparison of
                  shortlisted materials.
                </p>
                <p className="mt-2 text-xs font-medium text-forest-700">
                  {compareIds.length === 0
                    ? "No materials staged — add from results."
                    : `${compareIds.length} material${compareIds.length > 1 ? "s" : ""} staged for comparison.`}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setView("compare")}
                className="w-full bg-forest-700 text-cream-50 hover:bg-forest-600 sm:w-auto"
              >
                <GitCompare className="size-3.5" aria-hidden />
                Open Compare
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ---- Reset wizard helper ---- */}
      <div className="mt-6 flex justify-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => usePackVeda.getState().resetWizard()}
          className="text-xs text-navy-600 hover:text-navy-950"
        >
          <RotateCcw className="size-3.5" aria-hidden />
          Reset wizard inputs
        </Button>
      </div>
    </div>
  );
}
