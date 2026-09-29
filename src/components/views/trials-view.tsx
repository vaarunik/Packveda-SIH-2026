// PACKVEDA — Packaging Trial & Validation module.
//
// DATA INTEGRITY RULE (by design): this module stores USER-ENTERED test
// results only. PackVeda never generates or simulates test outcomes. The AI
// recommendation and the measured results are always shown separately, and
// differences are expected (test conditions differ from engine assumptions).

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  ChevronDown,
  FlaskConical,
  Info,
  Plus,
  ShieldAlert,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/shared/back-button";
import { apiFetch } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

import { usePackVeda } from "@/lib/store";
import { MATERIALS, getMaterial } from "@/lib/data/materials";
import { EmptyState } from "@/components/shared/empty-state";
import { MaturityBadge } from "@/components/shared/maturity-badge";
import { Term } from "@/components/shared/term-tooltip";

// ---------------------------------------------------------------------------
// Trial status configuration (canonical — also used by the dashboard view)
// ---------------------------------------------------------------------------

export type TrialStatus =
  | "not_tested"
  | "planned"
  | "in_progress"
  | "validated"
  | "rejected";

export const TRIAL_STATUSES: TrialStatus[] = [
  "not_tested",
  "planned",
  "in_progress",
  "validated",
  "rejected",
];

export const TRIAL_STATUS_LABELS: Record<TrialStatus, string> = {
  not_tested: "Not Tested",
  planned: "Planned",
  in_progress: "In Progress",
  validated: "Validated",
  rejected: "Rejected",
};

// Trial status badge colours — navy/cream/amber/forest/destructive only.
export const TRIAL_STATUS_BADGE: Record<TrialStatus, string> = {
  not_tested: "bg-navy-800/10 text-navy-700 border-navy-800/20 hover:bg-navy-800/10",
  planned: "bg-cream-100 text-navy-800 border-navy-700/40 hover:bg-cream-200",
  in_progress: "bg-amber-100 text-amber-900 border-amber-600/30 hover:bg-amber-100",
  validated: "bg-forest-700 text-cream-50 border-forest-700 hover:bg-forest-700",
  rejected: "bg-destructive text-white border-destructive hover:bg-destructive",
};

export function TrialStatusBadge({ status }: { status: string }) {
  const key = (TRIAL_STATUSES as string[]).includes(status)
    ? (status as TrialStatus)
    : "not_tested";
  return (
    <Badge
      variant="outline"
      className={`gap-1 px-2 text-[11px] font-medium ${TRIAL_STATUS_BADGE[key]}`}
    >
      {TRIAL_STATUS_LABELS[key]}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// API row shapes
// ---------------------------------------------------------------------------

interface TrialRow {
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

interface SavedRow {
  id: string;
  materialId: string;
  materialName: string;
  commodity: string;
  score: number | null;
}

interface TrialData {
  otrResult?: string | number;
  wvtrResult?: string | number;
  sealStrength?: string | number;
  compression?: string | number;
  weightLoss?: string | number;
  moistureChange?: string | number;
  oxidationIndicator?: string | number;
  microbialIndicator?: string | number;
  shelfLifeObservation?: string | number;
  [key: string]: unknown;
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

function parseTrialData(json: string): TrialData {
  try {
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === "object" ? (parsed as TrialData) : {};
  } catch {
    return {};
  }
}

// ---------------------------------------------------------------------------
// Workflow stepper (static graphic, horizontally scrollable on mobile)
// ---------------------------------------------------------------------------

const WORKFLOW_STEPS = [
  "Recommended Candidate",
  "Prototype Packaging",
  "Lab / Storage Trial",
  "Measure Performance",
  "Compare Against Target",
  "Validation Status",
];

function WorkflowStepper() {
  return (
    <div className="overflow-x-auto pb-2 scroll-slim" role="img" aria-label="Trial workflow: from recommended candidate to validation status">
      <ol className="flex min-w-max items-stretch gap-0">
        {WORKFLOW_STEPS.map((step, i) => (
          <li key={step} className="flex items-center">
            <div className="flex flex-col items-center px-1 text-center sm:px-2">
              <div
                className={`flex size-9 items-center justify-center rounded-full border-2 text-sm font-bold ${
                  i === WORKFLOW_STEPS.length - 1
                    ? "border-forest-700 bg-forest-700 text-cream-50"
                    : "border-forest-600/50 bg-cream-50 text-forest-700"
                }`}
              >
                {i === WORKFLOW_STEPS.length - 1 ? (
                  <BadgeCheck className="size-4" aria-hidden />
                ) : (
                  i + 1
                )}
              </div>
              <p className="mt-1.5 max-w-[7rem] text-[11px] font-medium leading-tight text-navy-800">
                {step}
              </p>
            </div>
            {i < WORKFLOW_STEPS.length - 1 && (
              <div
                aria-hidden
                className="mb-5 h-0.5 w-8 shrink-0 rounded bg-forest-600/40 sm:w-12"
              />
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Test-data form field definitions (all user-entered, all optional)
// ---------------------------------------------------------------------------

interface DraftField {
  key: keyof TrialData;
  label: string;
  hint: string;
  kind: "number" | "text";
}

const DRAFT_FIELDS: DraftField[] = [
  { key: "otrResult", label: "OTR result", hint: "cc/m²/day", kind: "number" },
  { key: "wvtrResult", label: "WVTR result", hint: "g/m²/day", kind: "number" },
  { key: "sealStrength", label: "Seal strength", hint: "N/15mm", kind: "number" },
  { key: "compression", label: "Compression / burst", hint: "kPa or N", kind: "number" },
  { key: "weightLoss", label: "Weight loss", hint: "%", kind: "number" },
  { key: "moistureChange", label: "Moisture change", hint: "%", kind: "number" },
  { key: "oxidationIndicator", label: "Oxidation indicator", hint: "e.g. peroxide value", kind: "text" },
  { key: "microbialIndicator", label: "Microbial indicator", hint: "where applicable", kind: "text" },
  { key: "shelfLifeObservation", label: "Shelf-life observation", hint: "text observation", kind: "text" },
];

// ---------------------------------------------------------------------------
// Single trial card (own draft state, keyed by id + updatedAt upstream)
// ---------------------------------------------------------------------------

function TrialCard({
  trial,
  aiOTR,
  aiWVTR,
  onSaved,
  onStatusChange,
  onDelete,
  onPassport,
}: {
  trial: TrialRow;
  aiOTR: { value: number | null; sourceAvailable: boolean };
  aiWVTR: { value: number | null; sourceAvailable: boolean };
  onSaved: (id: string, data: TrialData, notes: string) => Promise<void>;
  onStatusChange: (id: string, status: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onPassport: (materialId: string) => void;
}) {
  const initial = useMemo(() => parseTrialData(trial.dataJson), [trial.dataJson]);
  const [draft, setDraft] = useState<Record<string, string>>(() => {
    const d: Record<string, string> = {};
    for (const f of DRAFT_FIELDS) {
      const v = initial[f.key];
      d[f.key as string] = v === undefined || v === null ? "" : String(v);
    }
    return d;
  });
  const [notes, setNotes] = useState<string>(trial.notes ?? "");
  const [saving, setSaving] = useState(false);

  const setField = (key: string, value: string) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const collectData = (): TrialData => {
    const out: TrialData = {};
    for (const f of DRAFT_FIELDS) {
      const raw = (draft[f.key as string] ?? "").trim();
      if (raw === "") continue;
      out[f.key] = f.kind === "number" ? Number(raw) : raw;
    }
    return out;
  };

  const hasAnyEntry = Object.values(draft).some((v) => v.trim() !== "");

  const handleSave = async () => {
    setSaving(true);
    await onSaved(trial.id, collectData(), notes);
    setSaving(false);
  };

  const formatNumber = (v: unknown): string =>
    typeof v === "number" && Number.isFinite(v) ? v.toLocaleString("en-IN") : String(v ?? "");

  const showCompare = aiOTR.value !== null || aiWVTR.value !== null;

  return (
    <Card className="border-border/80">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base leading-snug text-navy-950">
              {trial.materialName}
            </CardTitle>
            <CardDescription className="mt-1">
              {trial.commodity || "—"} · Created {formatDate(trial.createdAt)} · Updated{" "}
              {formatDate(trial.updatedAt)}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="gap-1 border-amber-600/30 bg-amber-50 px-2 text-[10px] text-amber-900 hover:bg-amber-50"
            >
              <ShieldAlert className="size-3" aria-hidden />
              User-entered test result ≠ AI recommendation
            </Badge>
            <TrialStatusBadge status={trial.status} />
            <Button
              size="sm"
              variant="outline"
              onClick={() => onPassport(trial.materialId)}
              className="h-6 border-navy-700/30 px-2 text-[11px] text-navy-800 hover:bg-cream-100"
            >
              <BookOpenCheck className="size-3" aria-hidden />
              Passport
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Accordion type="single" collapsible>
          <AccordionItem value={`trial-${trial.id}`} className="border-b-0">
            <AccordionTrigger className="rounded-lg bg-cream-100/70 px-4 py-2.5 text-sm font-medium text-navy-900 hover:bg-cream-200 hover:no-underline">
              <span className="flex items-center gap-2">
                <ChevronDown className="size-4 text-forest-700" aria-hidden />
                Open trial record — test data, status & comparison
              </span>
            </AccordionTrigger>
            <AccordionContent className="pt-4">
              {/* ---- User-entered test data form ---- */}
              <section aria-label="User-entered test data">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold text-navy-950">
                    Test data <span className="font-normal text-navy-600">(user-entered, all optional)</span>
                  </h4>
                  {hasAnyEntry && (
                    <span className="text-[10px] font-medium uppercase tracking-wide text-forest-700">
                      User measurements
                    </span>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {DRAFT_FIELDS.map((f) => (
                    <div key={f.key as string} className="space-y-1.5">
                      <Label htmlFor={`${trial.id}-${f.key as string}`} className="text-xs text-navy-800">
                        {f.label}{" "}
                        <span className="font-normal text-navy-600">({f.hint})</span>
                      </Label>
                      <Input
                        id={`${trial.id}-${f.key as string}`}
                        value={draft[f.key as string] ?? ""}
                        inputMode={f.kind === "number" ? "decimal" : "text"}
                        placeholder="—"
                        onChange={(e) => setField(f.key as string, e.target.value)}
                        className="h-9 bg-white text-sm"
                      />
                    </div>
                  ))}
                  <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                    <Label htmlFor={`${trial.id}-notes`} className="text-xs text-navy-800">
                      Trial notes
                    </Label>
                    <Textarea
                      id={`${trial.id}-notes`}
                      value={notes}
                      placeholder="Conditions, lot/batch, duration, anything a reviewer would need…"
                      onChange={(e) => setNotes(e.target.value)}
                      className="min-h-16 bg-white text-sm"
                    />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    disabled={saving}
                    onClick={() => void handleSave()}
                    className="bg-forest-700 text-cream-50 hover:bg-forest-600"
                  >
                    {saving ? "Saving…" : "Save test data"}
                  </Button>
                  <p className="text-xs text-navy-600">
                    Saved on your device database — never generated by the AI.
                  </p>
                </div>
              </section>

              <Separator className="my-4" />

              {/* ---- Status control ---- */}
              <section aria-label="Validation status control">
                <h4 className="text-sm font-semibold text-navy-950">Validation status</h4>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <Select
                    value={trial.status}
                    onValueChange={(v) => void onStatusChange(trial.id, v)}
                  >
                    <SelectTrigger className="h-9 w-48 bg-white text-sm" aria-label="Trial status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRIAL_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {TRIAL_STATUS_LABELS[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-amber-800">
                    Only mark <span className="font-semibold">&ldquo;Validated&rdquo;</span> after documented testing.
                  </p>
                </div>
              </section>

              {/* ---- Compare against AI recommendation ---- */}
              {showCompare && (
                <>
                  <Separator className="my-4" />
                  <section aria-label="Comparison against AI recommendation">
                    <h4 className="text-sm font-semibold text-navy-950">
                      Compare against AI recommendation
                    </h4>
                    <div className="mt-2 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-border/80 bg-navy-950 p-3 text-cream-50">
                        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400">
                          AI recommendation (indicative)
                        </p>
                        <dl className="mt-2 space-y-1.5 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <dt><Term k="OTR" className="text-cream-100/80 border-cream-100/40">OTR</Term></dt>
                            <dd className="font-mono text-xs">
                              {aiOTR.value !== null
                                ? `${aiOTR.value.toLocaleString("en-IN")} cc/m²/day`
                                : "Data not available"}
                            </dd>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <dt><Term k="WVTR" className="text-cream-100/80 border-cream-100/40">WVTR</Term></dt>
                            <dd className="font-mono text-xs">
                              {aiWVTR.value !== null
                                ? `${aiWVTR.value.toLocaleString("en-IN")} g/m²/day`
                                : "Data not available"}
                            </dd>
                          </div>
                        </dl>
                      </div>
                      <div className="rounded-lg border border-forest-600/30 bg-forest-50 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-forest-800">
                          User-entered test result
                        </p>
                        <dl className="mt-2 space-y-1.5 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <dt className="text-navy-700">OTR (measured)</dt>
                            <dd className="font-mono text-xs">
                              {draft.otrResult?.trim()
                                ? `${draft.otrResult} cc/m²/day`
                                : "Not recorded"}
                            </dd>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <dt className="text-navy-700">WVTR (measured)</dt>
                            <dd className="font-mono text-xs">
                              {draft.wvtrResult?.trim()
                                ? `${draft.wvtrResult} g/m²/day`
                                : "Not recorded"}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    </div>
                    <p className="mt-2 flex items-start gap-1.5 text-xs text-navy-600">
                      <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                      Differences between the two columns are expected — test
                      conditions (temperature, RH, thickness, grade) differ from
                      the engine&rsquo;s indicative class-level assumptions.
                    </p>
                  </section>
                </>
              )}

              {/* ---- Danger zone ---- */}
              <div className="mt-4 flex justify-end">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => void onDelete(trial.id)}
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  Delete trial
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------

export default function TrialsView() {
  const { setView, wizardInput, result, openPassport } = usePackVeda();
  const { toast } = useToast();

  const [trials, setTrials] = useState<TrialRow[]>([]);
  const [saved, setSaved] = useState<SavedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formMaterial, setFormMaterial] = useState<string>("");
  const [formCommodity, setFormCommodity] = useState<string>("");
  const [formStatus, setFormStatus] = useState<TrialStatus>("planned");
  const [formNotes, setFormNotes] = useState<string>("");

  const refresh = useCallback(async () => {
    setLoading(true);
    let hadFailure = false;

    const [trialsRes, savedRes] = await Promise.allSettled([
      apiFetch("/api/trials", { cache: "no-store" }),
      apiFetch("/api/saved", { cache: "no-store" }),
    ]);

    if (trialsRes.status === "fulfilled" && trialsRes.value.ok) {
      const data = await trialsRes.value.json().catch(() => ({}));
      setTrials(Array.isArray(data.trials) ? data.trials : []);
    } else {
      setTrials([]);
      hadFailure = true;
    }
    if (savedRes.status === "fulfilled" && savedRes.value.ok) {
      const data = await savedRes.value.json().catch(() => ({}));
      setSaved(Array.isArray(data.saved) ? data.saved : []);
    } else {
      setSaved([]);
      hadFailure = true;
    }

    if (hadFailure) {
      setError("Trial data could not be loaded. Please refresh to try again.");
    } else {
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const openNewTrialDialog = () => {
    setFormCommodity(wizardInput.commodityName || "");
    setFormMaterial(saved.length > 0 ? `saved:${saved[0].id}` : `mat:${MATERIALS[0].id}`);
    setFormStatus("planned");
    setFormNotes("");
    setDialogOpen(true);
  };

  const createTrial = async () => {
    // Resolve the selected option ("saved:<id>" or "mat:<materialId>")
    let savedCandidateId: string | undefined;
    let materialId = "";
    let materialName = "";
    let commodity = formCommodity;

    if (formMaterial.startsWith("saved:")) {
      const s = saved.find((x) => x.id === formMaterial.slice(6));
      if (s) {
        savedCandidateId = s.id;
        materialId = s.materialId;
        materialName = s.materialName;
        commodity = commodity || s.commodity;
      }
    } else if (formMaterial.startsWith("mat:")) {
      const m = getMaterial(formMaterial.slice(4));
      if (m) {
        materialId = m.id;
        materialName = m.name;
      }
    }

    if (!materialId || !materialName) {
      toast({
        title: "Select a material",
        description: "Choose a saved candidate or a knowledge-base material.",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);
    try {
      const res = await apiFetch("/api/trials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          savedCandidateId: savedCandidateId ?? null,
          materialId,
          materialName,
          commodity,
          status: formStatus,
          notes: formNotes.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("create failed");
      toast({
        title: "Trial created",
        description: `${materialName} added. Enter measured results only — the AI never fills these.`,
      });
      setDialogOpen(false);
      await refresh();
    } catch {
      toast({
        title: "Could not create trial",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const saveTrialData = async (id: string, data: TrialData, notes: string) => {
    try {
      const res = await apiFetch("/api/trials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, data, notes }),
      });
      if (!res.ok) throw new Error("save failed");
      toast({ title: "Saved as user-entered result" });
      await refresh();
    } catch {
      toast({
        title: "Save failed",
        description: "Test data could not be saved. Please try again.",
        variant: "destructive",
      });
    }
  };

  const changeStatus = async (id: string, status: string) => {
    try {
      const res = await apiFetch("/api/trials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error("status update failed");
      const next = (TRIAL_STATUSES as string[]).includes(status)
        ? TRIAL_STATUS_LABELS[status as TrialStatus]
        : status;
      toast({ title: `Status updated — ${next}` });
      await refresh();
    } catch {
      toast({
        title: "Status update failed",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const deleteTrial = async (id: string) => {
    try {
      const res = await apiFetch(`/api/trials?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("delete failed");
      setTrials((prev) => prev.filter((t) => t.id !== id));
      toast({ title: "Trial deleted" });
    } catch {
      toast({
        title: "Delete failed",
        description: "The trial could not be removed.",
        variant: "destructive",
      });
    }
  };

  const aiRecommendedId = result?.recommended?.materialId ?? null;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* ---- Header ---- */}
      <BackButton label="Back to Dashboard" fallback="dashboard" />
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-forest-600">
            Validation
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-navy-950 sm:text-4xl">
            Packaging Trial &amp; Validation
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-navy-600 sm:text-base">
            Plan prototype trials, record measured performance, and track
            validation status — with a strict separation between AI
            recommendations and your laboratory evidence.
          </p>
        </div>
        <Button
          onClick={openNewTrialDialog}
          className="bg-forest-700 text-cream-50 hover:bg-forest-600 shrink-0"
        >
          <Plus className="size-4" aria-hidden />
          New Trial
        </Button>
      </motion.div>

      {/* ---- Data-integrity banner ---- */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05, ease: "easeOut" }}
        className="mt-6"
      >
        <Alert className="border-amber-600/30 bg-amber-50 text-amber-950">
          <ShieldAlert className="size-4 text-amber-700" aria-hidden />
          <AlertTitle className="flex flex-wrap items-center gap-2 text-amber-950">
            Your measurements, clearly separated
            <MaturityBadge status="prototype" />
          </AlertTitle>
          <AlertDescription className="text-amber-900">
            <span className="inline">
              This module stores{" "}
              <strong className="inline font-semibold">user-entered test results</strong>.
              PackVeda never generates or simulates test outcomes. AI
              recommendation and measured results are always shown separately.
            </span>
          </AlertDescription>
        </Alert>
      </motion.div>

      {/* ---- Workflow stepper ---- */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
        className="mt-6"
      >
        <Card className="border-border/80">
          <CardContent className="p-4 sm:p-6">
            <h2 className="mb-3 text-sm font-semibold text-navy-950">
              Trial workflow
            </h2>
            <WorkflowStepper />
          </CardContent>
        </Card>
      </motion.div>

      {error && (
        <div
          role="alert"
          className="mt-6 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {/* ---- Trials list ---- */}
      <div className="mt-8 space-y-4">
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="border-border/80">
              <CardContent className="p-4 sm:p-6">
                <Skeleton className="h-5 w-64" />
                <Skeleton className="mt-2 h-3 w-80" />
                <Skeleton className="mt-4 h-10 w-full rounded-lg" />
              </CardContent>
            </Card>
          ))
        ) : trials.length === 0 ? (
          <EmptyState
            icon={FlaskConical}
            title="No trials tracked yet"
            description="PackVeda shortlists candidates and explains why — but real-world validation is how a material earns trust. Create a trial, build a prototype pack, and record your measured results here. Test values are never produced by the AI."
            actionLabel="Plan Your First Trial"
            onAction={openNewTrialDialog}
          />
        ) : (
          trials.map((trial) => {
            const material = getMaterial(trial.materialId);
            return (
              <TrialCard
                key={`${trial.id}:${trial.updatedAt}`}
                trial={trial}
                aiOTR={{
                  value: material?.otr ?? null,
                  sourceAvailable: material?.otrSourceAvailable ?? false,
                }}
                aiWVTR={{
                  value: material?.wvtr ?? null,
                  sourceAvailable: material?.wvtrSourceAvailable ?? false,
                }}
                onSaved={saveTrialData}
                onStatusChange={changeStatus}
                onDelete={deleteTrial}
                onPassport={openPassport}
              />
            );
          })
        )}
      </div>

      {/* ---- Footer helper ---- */}
      {!loading && trials.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/80 bg-cream-100/70 px-4 py-3">
          <p className="text-xs text-navy-700">
            Reminder: a <span className="font-semibold">validated</span> badge on
            PackVeda always means a human documented real testing — not an AI
            prediction.
          </p>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setView("dashboard")}
            className="text-forest-700 hover:bg-forest-50 hover:text-forest-600"
          >
            Back to Dashboard
            <ArrowRight className="size-3.5" aria-hidden />
          </Button>
        </div>
      )}

      {/* ---- New Trial dialog ---- */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Plan a New Trial</DialogTitle>
            <DialogDescription>
              Register a prototype to test. You record measured results later —
              PackVeda never pre-fills them.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="trial-material" className="text-sm">
                Material{" "}
                <span className="text-xs font-normal text-navy-600">
                  {saved.length > 0
                    ? "— your saved candidates first"
                    : "— from the knowledge base"}
                </span>
              </Label>
              <Select value={formMaterial} onValueChange={setFormMaterial}>
                <SelectTrigger id="trial-material" className="bg-white" aria-label="Trial material">
                  <SelectValue placeholder="Select material" />
                </SelectTrigger>
                <SelectContent className="max-h-64 scroll-slim">
                  {saved.length > 0
                    ? saved.map((s) => (
                        <SelectItem key={s.id} value={`saved:${s.id}`}>
                          {s.materialName}
                          {s.commodity ? ` — ${s.commodity}` : ""}
                        </SelectItem>
                      ))
                    : MATERIALS.map((m) => (
                        <SelectItem key={m.id} value={`mat:${m.id}`}>
                          {m.name}
                        </SelectItem>
                      ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trial-commodity" className="text-sm">
                Commodity
              </Label>
              <Input
                id="trial-commodity"
                value={formCommodity}
                placeholder="e.g. Fresh Tomato"
                onChange={(e) => setFormCommodity(e.target.value)}
                className="bg-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trial-status" className="text-sm">
                Initial status
              </Label>
              <Select
                value={formStatus}
                onValueChange={(v) => setFormStatus(v as TrialStatus)}
              >
                <SelectTrigger id="trial-status" className="bg-white" aria-label="Initial status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRIAL_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {TRIAL_STATUS_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="trial-notes" className="text-sm">
                Notes <span className="text-xs font-normal text-navy-600">(optional)</span>
              </Label>
              <Textarea
                id="trial-notes"
                value={formNotes}
                placeholder="Trial objective, batch details, planned duration…"
                onChange={(e) => setFormNotes(e.target.value)}
                className="min-h-16 bg-white"
              />
            </div>
            <p className="text-xs text-navy-600">
              Test values are entered later from the trial record. Only you can
              mark a trial validated after documented testing.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void createTrial()}
              disabled={creating}
              className="bg-forest-700 text-cream-50 hover:bg-forest-600"
            >
              {creating ? "Creating…" : "Create Trial"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
