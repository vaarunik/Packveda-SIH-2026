"use client";

// PACKVEDA — 6-step guided packaging analysis wizard (Task 6-b).
// Flow: Food → Composition → Storage → Logistics → Priorities → Analysis.
// Collects an AnalysisInput and POSTs it to /api/analyze (deterministic engine).

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  Info,
  Loader2,
  Play,
  RotateCcw,
  Snowflake,
  TriangleAlert,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  DEMO_SCENARIOS,
  IMPORTANCE_LABEL,
  INTENSITY_LABEL,
  requireCommodity,
  usePackVeda,
} from "@/lib/store";
import type { AnalysisInput, EngineOutput, Importance } from "@/lib/engine";
import {
  COMMODITIES,
  COMMODITY_CATEGORY_LABELS,
  getCommodity,
} from "@/lib/data/commodities";
import type { CommodityCategory, Intensity } from "@/lib/data/types";
import { Term } from "@/components/shared/term-tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BackButton } from "@/components/shared/back-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type GlossaryKey = Parameters<typeof Term>[0]["k"];

// ---------------------------------------------------------------------------
// Step metadata & option lists
// ---------------------------------------------------------------------------

const STEPS = [
  { num: "01", label: "Food", title: "Food profile", description: "Pick your commodity from the knowledge base, or define a custom food." },
  { num: "02", label: "Composition", title: "Composition & sensitivities", description: "Tune the food-science inputs that drive barrier requirements." },
  { num: "03", label: "Storage", title: "Storage environment", description: "Shelf-life target and the conditions the pack must survive." },
  { num: "04", label: "Logistics", title: "Distribution profile", description: "Transport duration, mode, handling and light exposure." },
  { num: "05", label: "Priorities", title: "What matters most", description: "Weight the decision — the engine normalises your priorities." },
  { num: "06", label: "Analysis", title: "Review & run", description: "Verify the inputs, then run the deterministic engine." },
] as const;

const STATUS_LINES = [
  "Deriving packaging requirements…",
  "Matching material properties…",
  "Filtering constraints…",
  "Scoring candidates…",
];

const INTENSITY_OPTIONS: Intensity[] = ["none", "low", "moderate", "high", "very_high"];
const IMPORTANCE_OPTIONS: Importance[] = ["none", "low", "medium", "high"];

const STORAGE_TYPE_OPTIONS = [
  { value: "ambient", label: "Ambient (shelf / warehouse)" },
  { value: "chilled", label: "Chilled (0–10 °C)" },
  { value: "frozen", label: "Frozen (≤ −18 °C)" },
  { value: "cold_chain", label: "Cold chain (refrigerated logistics)" },
] as const;

const STORAGE_TYPE_SHORT: Record<AnalysisInput["storageType"], string> = {
  ambient: "Ambient",
  chilled: "Chilled",
  frozen: "Frozen",
  cold_chain: "Cold chain",
};

const TRANSPORT_MODE_OPTIONS = [
  { value: "road", label: "Road (truck)" },
  { value: "rail", label: "Rail" },
  { value: "sea", label: "Sea (container)" },
  { value: "air", label: "Air freight" },
  { value: "multimodal", label: "Multimodal (2+ modes)" },
] as const;

const SHELF_LIFE_PRESETS = [7, 30, 90, 180, 270, 365];
const TRANSPORT_PRESETS = [1, 3, 7, 14, 30];

const PRIORITY_ROWS: {
  key: keyof AnalysisInput["priorities"];
  label: string;
  hint: string;
}[] = [
  { key: "cost", label: "Cost", hint: "Material and conversion cost sensitivity." },
  { key: "sustainability", label: "Sustainability", hint: "Recyclability and environmental profile." },
  { key: "barrier", label: "Barrier Performance", hint: "Oxygen, moisture, aroma and light barriers." },
  { key: "shelfLife", label: "Shelf Life", hint: "Achieving the target shelf-life duration." },
  { key: "mechanical", label: "Mechanical Protection", hint: "Strength, puncture and crush resistance." },
];

// ---------------------------------------------------------------------------
// Small building blocks (local to this view)
// ---------------------------------------------------------------------------

function FieldShell({
  label,
  termKey,
  hint,
  children,
  className,
}: {
  label: string;
  termKey?: GlossaryKey;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center gap-1 text-sm font-medium text-navy-900">
        <span>{label}</span>
        {termKey ? <Term k={termKey} /> : null}
      </div>
      {children}
      {hint ? <p className="text-xs leading-relaxed text-navy-600">{hint}</p> : null}
    </div>
  );
}

function NumberSlider({
  label,
  termKey,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  hint,
  className,
}: {
  label: string;
  termKey?: GlossaryKey;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (v: number) => void;
  hint?: React.ReactNode;
  className?: string;
}) {
  return (
    <FieldShell label={label} termKey={termKey} hint={hint} className={className}>
      <div className="flex items-center gap-3">
        <Slider
          value={[value]}
          min={min}
          max={max}
          step={step}
          onValueChange={(vals) => onChange(vals[0] ?? value)}
          className="flex-1"
          aria-label={label}
        />
        <div className="flex w-24 shrink-0 items-center gap-1">
          <Input
            type="number"
            value={value}
            min={min}
            max={max}
            step={step}
            aria-label={`${label} value`}
            className="h-9"
            onChange={(e) => {
              const n = e.target.valueAsNumber;
              if (!Number.isNaN(n)) onChange(Math.min(max, Math.max(min, n)));
            }}
          />
          {unit ? <span className="text-xs text-navy-600">{unit}</span> : null}
        </div>
      </div>
    </FieldShell>
  );
}

function IntensitySelect({
  label,
  termKey,
  value,
  onChange,
  disabled,
  disabledReason,
  hint,
  className,
}: {
  label: string;
  termKey?: GlossaryKey;
  value: Intensity;
  onChange: (v: Intensity) => void;
  disabled?: boolean;
  disabledReason?: string;
  hint?: React.ReactNode;
  className?: string;
}) {
  const select = (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as Intensity)}
      disabled={disabled}
    >
      <SelectTrigger className={cn("w-full", disabled && "pointer-events-none")} aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {INTENSITY_OPTIONS.map((o) => (
          <SelectItem key={o} value={o}>
            {INTENSITY_LABEL[o]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
  return (
    <FieldShell label={label} termKey={termKey} hint={hint} className={className}>
      {disabled ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <div tabIndex={0} role="note" aria-label={disabledReason}>
              {select}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-64 text-xs">
            {disabledReason}
          </TooltipContent>
        </Tooltip>
      ) : (
        select
      )}
    </FieldShell>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
        active
          ? "border-forest-700 bg-forest-700 text-white"
          : "border-border bg-white text-navy-700 hover:border-forest-600 hover:bg-forest-50"
      )}
    >
      {children}
    </button>
  );
}

function SummaryItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-cream-50 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-navy-600">{label}</p>
      <p className="mt-0.5 break-words text-sm font-semibold text-navy-950">{value}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AnalyzeView — the wizard
// ---------------------------------------------------------------------------

export default function AnalyzeView() {
  const {
    wizardStep,
    setWizardStep,
    wizardInput,
    setWizardInput,
    applyDemo,
    resetWizard,
    setResult,
    setAnalyzing,
    analyzing,
    setView,
  } = usePackVeda();
  const { toast } = useToast();

  const [stepErrorMsg, setStepErrorMsg] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [statusIdx, setStatusIdx] = useState(0);

  const isCustom = wizardInput.commodityId === "custom";
  const kbCommodity = !isCustom ? getCommodity(wizardInput.commodityId) : undefined;
  const hasCommodity = isCustom || Boolean(kbCommodity);

  const chillingWarning = Boolean(
    kbCommodity?.chillingSensitive &&
      kbCommodity.minSafeStorageTempC !== null &&
      wizardInput.storageTempC < (kbCommodity.minSafeStorageTempC as number)
  );

  // Rotating engine status lines while the analysis request is in flight.
  useEffect(() => {
    if (!analyzing) {
      setStatusIdx(0);
      return;
    }
    const t = window.setInterval(
      () => setStatusIdx((i) => (i + 1) % STATUS_LINES.length),
      700
    );
    return () => window.clearInterval(t);
  }, [analyzing]);

  // Commodities grouped by category for the Select.
  const commodityGroups = useMemo(() => {
    const groups: { category: CommodityCategory; label: string; items: typeof COMMODITIES }[] = [];
    for (const [cat, label] of Object.entries(COMMODITY_CATEGORY_LABELS) as [
      CommodityCategory,
      string
    ][]) {
      const items = COMMODITIES.filter((c) => c.category === cat);
      if (items.length > 0) groups.push({ category: cat, label, items });
    }
    return groups;
  }, []);

  const clearTransientErrors = () => {
    setStepErrorMsg(null);
    setRunError(null);
  };

  const loadDemo = (id: string) => {
    applyDemo(id);
    clearTransientErrors();
    const s = DEMO_SCENARIOS.find((d) => d.id === id);
    toast({ title: "Scenario loaded", description: s?.label });
  };

  const handleCommoditySelect = (v: string) => {
    clearTransientErrors();
    if (v === "custom") {
      setWizardInput({
        commodityId: "custom",
        commodityName: "",
        foodCategory: "",
        processing: "processed",
        moisturePercent: 12,
        fatPercent: 2,
        ph: 6,
        waterActivity: null,
        respiration: "none",
        oxygenSensitivity: "low",
        aromaSensitivity: "low",
        lightSensitivity: "low",
        hygroscopic: false,
        fragile: false,
        storageTempC: 25,
        storageRH: 60,
        targetShelfLifeDays: 90,
      });
    } else {
      setWizardInput(requireCommodity(v));
    }
  };

  const computeStepError = (step: number): string | null => {
    if (step === 1) {
      if (!hasCommodity) {
        return "Select a commodity from the knowledge base, or choose “Custom commodity” to define your own food.";
      }
      if (isCustom && !wizardInput.commodityName.trim()) {
        return "Give your custom commodity a name.";
      }
      if (isCustom && !wizardInput.foodCategory) {
        return "Select a food category for your custom commodity.";
      }
    }
    if (step === 3 && wizardInput.targetShelfLifeDays < 1) {
      return "Target shelf life must be at least 1 day.";
    }
    return null;
  };

  const runAnalysis = async () => {
    // Sanity-check every step before firing the request.
    for (let s = 1; s <= 6; s++) {
      const err = computeStepError(s);
      if (err) {
        setStepErrorMsg(err);
        setWizardStep(s);
        return;
      }
    }
    clearTransientErrors();
    setAnalyzing(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(wizardInput),
      });
      const data = (await res.json()) as EngineOutput & { error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Analysis failed. Please try again.");
      }
      const label = `${wizardInput.commodityName} · ${new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })}`;
      setResult(data, label);
      setAnalyzing(false);
      setView("results");
    } catch (err) {
      setAnalyzing(false);
      const msg = err instanceof Error ? err.message : "Analysis failed. Please try again.";
      setRunError(msg);
      toast({ title: "Analysis failed", description: msg, variant: "destructive" });
    }
  };

  const goNext = () => {
    const err = computeStepError(wizardStep);
    if (err) {
      setStepErrorMsg(err);
      return;
    }
    setStepErrorMsg(null);
    if (wizardStep < 6) {
      setWizardStep(wizardStep + 1);
    } else {
      void runAnalysis();
    }
  };

  const goBack = () => {
    setStepErrorMsg(null);
    if (wizardStep > 1) setWizardStep(wizardStep - 1);
  };

  // ---- Step 6 review summary ---------------------------------------------
  const p = wizardInput.priorities;
  const summaryItems: { label: string; value: React.ReactNode }[] = [
    { label: "Commodity", value: wizardInput.commodityName || "—" },
    { label: "Food category", value: wizardInput.foodCategory || "—" },
    { label: "Processing", value: wizardInput.processing === "fresh" ? "Fresh" : "Processed" },
    { label: "Moisture content", value: `${wizardInput.moisturePercent}%` },
    { label: "Fat / oil content", value: `${wizardInput.fatPercent}%` },
    { label: "pH", value: wizardInput.ph.toFixed(1) },
    {
      label: "Water activity",
      value:
        wizardInput.waterActivity !== null
          ? wizardInput.waterActivity.toFixed(2)
          : "Data not available",
    },
    { label: "Respiration", value: INTENSITY_LABEL[wizardInput.respiration] },
    { label: "Oxygen sensitivity", value: INTENSITY_LABEL[wizardInput.oxygenSensitivity] },
    { label: "Aroma sensitivity", value: INTENSITY_LABEL[wizardInput.aromaSensitivity] },
    { label: "Light sensitivity", value: INTENSITY_LABEL[wizardInput.lightSensitivity] },
    { label: "Hygroscopic", value: wizardInput.hygroscopic ? "Yes" : "No" },
    { label: "Fragile", value: wizardInput.fragile ? "Yes" : "No" },
    { label: "Target shelf life", value: `${wizardInput.targetShelfLifeDays} days` },
    { label: "Storage temperature", value: `${wizardInput.storageTempC} °C` },
    { label: "Storage RH", value: `${wizardInput.storageRH}%` },
    { label: "Storage type", value: STORAGE_TYPE_SHORT[wizardInput.storageType] },
    {
      label: "Transport",
      value: `${wizardInput.transportDurationDays} d · ${wizardInput.transportMode}`,
    },
    { label: "Handling", value: wizardInput.handlingIntensity },
    { label: "Light exposure", value: wizardInput.lightExposure },
    {
      label: "Priorities",
      value: `Cost ${IMPORTANCE_LABEL[p.cost]} · Sustainability ${IMPORTANCE_LABEL[p.sustainability]} · Barrier ${IMPORTANCE_LABEL[p.barrier]} · Shelf life ${IMPORTANCE_LABEL[p.shelfLife]} · Mechanical ${IMPORTANCE_LABEL[p.mechanical]}`,
    },
  ];

  const renderStep = () => {
    switch (wizardStep) {
      // ------------------------------------------------------------------
      // STEP 1 — FOOD
      // ------------------------------------------------------------------
      case 1:
        return (
          <div>
            {/* Demo scenarios strip */}
            <div className="mb-6">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-navy-600">
                <FlaskConical className="size-3.5 text-forest-600" aria-hidden />
                Try a demo scenario
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {DEMO_SCENARIOS.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => loadDemo(s.id)}
                    title={s.description}
                    className="rounded-full border border-border bg-white px-3 py-1.5 text-xs font-medium text-navy-800 transition-colors hover:border-forest-600 hover:bg-forest-50"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <FieldShell
              label="Commodity"
              hint="12 Indian food commodities with indicative food-science values — or define your own."
            >
              <Select
                value={wizardInput.commodityId}
                onValueChange={handleCommoditySelect}
              >
                <SelectTrigger className="w-full sm:w-96" aria-label="Commodity">
                  <SelectValue placeholder="Select a commodity…" />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {commodityGroups.map((g) => (
                    <SelectGroup key={g.category}>
                      <SelectLabel>{g.label}</SelectLabel>
                      {g.items.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                  <SelectGroup>
                    <SelectLabel>Custom</SelectLabel>
                    <SelectItem value="custom">Custom commodity (not in knowledge base)</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </FieldShell>

            {kbCommodity && (
              <div className="mt-4 space-y-4">
                <Alert className="border-forest-600/30 bg-forest-50">
                  <Info className="size-4 text-forest-700" />
                  <AlertTitle className="text-forest-800">
                    Auto-filled from the commodity knowledge base
                  </AlertTitle>
                  <AlertDescription className="text-forest-800/85">
                    Adjust values in the next steps if your data differs.
                  </AlertDescription>
                </Alert>

                <div className="rounded-lg border border-border bg-cream-50 p-4">
                  <p className="text-sm leading-relaxed text-navy-700">{kbCommodity.description}</p>
                  {kbCommodity.notes.length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {kbCommodity.notes.map((n) => (
                        <li key={n} className="flex items-start gap-2 text-sm text-navy-800">
                          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-forest-700" aria-hidden />
                          <span>{n}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {kbCommodity.sources.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {kbCommodity.sources.map((s) => (
                        <Badge
                          key={s.label}
                          variant="outline"
                          className="gap-1 bg-white text-[10px] font-normal text-navy-700"
                        >
                          <BookOpen className="size-3" aria-hidden />
                          {s.label}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {isCustom && (
              <div className="mt-4 grid gap-4 rounded-lg border border-dashed border-forest-600/40 bg-forest-50/50 p-4 sm:grid-cols-2">
                <FieldShell label="Custom commodity name">
                  <Input
                    value={wizardInput.commodityName}
                    onChange={(e) => setWizardInput({ commodityName: e.target.value })}
                    placeholder="e.g. Millet Flakes"
                    aria-label="Custom commodity name"
                  />
                </FieldShell>
                <FieldShell label="Food category">
                  <Select
                    value={wizardInput.foodCategory}
                    onValueChange={(v) => setWizardInput({ foodCategory: v })}
                  >
                    <SelectTrigger className="w-full" aria-label="Food category">
                      <SelectValue placeholder="Select category…" />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.entries(COMMODITY_CATEGORY_LABELS) as [CommodityCategory, string][]).map(
                        ([key, label]) => (
                          <SelectItem key={key} value={label}>
                            {label}
                          </SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </FieldShell>
                <FieldShell
                  label="Processing state"
                  hint="Fresh produce respires; processed foods do not."
                  className="sm:col-span-2"
                >
                  <RadioGroup
                    value={wizardInput.processing}
                    onValueChange={(v) =>
                      setWizardInput({
                        processing: v as AnalysisInput["processing"],
                        ...(v === "processed" ? { respiration: "none" as Intensity } : {}),
                      })
                    }
                    className="flex gap-5"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="fresh" id="proc-fresh" />
                      <Label htmlFor="proc-fresh" className="font-normal">
                        Fresh
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="processed" id="proc-processed" />
                      <Label htmlFor="proc-processed" className="font-normal">
                        Processed
                      </Label>
                    </div>
                  </RadioGroup>
                </FieldShell>
              </div>
            )}
          </div>
        );

      // ------------------------------------------------------------------
      // STEP 2 — COMPOSITION
      // ------------------------------------------------------------------
      case 2:
        return (
          <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
            <NumberSlider
              label="Moisture content"
              value={wizardInput.moisturePercent}
              min={0}
              max={100}
              step={0.5}
              unit="%"
              onChange={(v) => setWizardInput({ moisturePercent: v })}
              hint="Wet-basis moisture — low-moisture foods need strong moisture barriers."
            />
            <NumberSlider
              label="Fat / oil content"
              value={wizardInput.fatPercent}
              min={0}
              max={100}
              step={0.5}
              unit="%"
              onChange={(v) => setWizardInput({ fatPercent: v })}
              hint={
                <span>
                  Drives <Term k="rancidity" /> risk — higher fat raises the oxygen-barrier need.
                </span>
              }
            />
            <NumberSlider
              label="pH"
              value={wizardInput.ph}
              min={0}
              max={14}
              step={0.1}
              onChange={(v) => setWizardInput({ ph: v })}
              hint="Acidity influences microbial spoilage routes."
            />

            {/* Water activity — optional */}
            <FieldShell
              label="Water activity"
              termKey="waterActivity"
              hint={
                wizardInput.waterActivity === null
                  ? "Data not available — leave unchecked and the engine treats it as unknown."
                  : "Free water available for spoilage reactions (0–1)."
              }
            >
              <div className="flex items-center gap-2">
                <Checkbox
                  id="has-aw"
                  checked={wizardInput.waterActivity !== null}
                  onCheckedChange={(c) =>
                    setWizardInput({ waterActivity: c === true ? 0.5 : null })
                  }
                />
                <Label htmlFor="has-aw" className="text-sm font-normal">
                  I have water activity data
                </Label>
              </div>
              {wizardInput.waterActivity !== null && (
                <div className="mt-2 flex items-center gap-3">
                  <Slider
                    value={[wizardInput.waterActivity]}
                    min={0}
                    max={1}
                    step={0.01}
                    onValueChange={(vals) =>
                      setWizardInput({ waterActivity: vals[0] ?? wizardInput.waterActivity })
                    }
                    className="flex-1"
                    aria-label="Water activity"
                  />
                  <Input
                    type="number"
                    value={wizardInput.waterActivity}
                    min={0}
                    max={1}
                    step={0.01}
                    aria-label="Water activity value"
                    className="h-9 w-20"
                    onChange={(e) => {
                      const n = e.target.valueAsNumber;
                      if (!Number.isNaN(n))
                        setWizardInput({ waterActivity: Math.min(1, Math.max(0, n)) });
                    }}
                  />
                </div>
              )}
            </FieldShell>

            <IntensitySelect
              label="Respiration"
              termKey="respiration"
              value={wizardInput.respiration}
              onChange={(v) => setWizardInput({ respiration: v })}
              disabled={wizardInput.processing === "processed"}
              disabledReason="Processed foods do not respire — respiration is fixed to “None”. It applies to fresh produce only."
              hint="Only fresh produce respires post-harvest."
            />
            <IntensitySelect
              label="Oxygen sensitivity"
              termKey="rancidity"
              value={wizardInput.oxygenSensitivity}
              onChange={(v) => setWizardInput({ oxygenSensitivity: v })}
              hint="How badly oxygen ingress damages quality."
            />
            <IntensitySelect
              label="Aroma sensitivity"
              value={wizardInput.aromaSensitivity}
              onChange={(v) => setWizardInput({ aromaSensitivity: v })}
              hint="Retention of desirable aromas, blocking of foreign odours."
            />
            <IntensitySelect
              label="Light sensitivity"
              value={wizardInput.lightSensitivity}
              onChange={(v) => setWizardInput({ lightSensitivity: v })}
              hint="Colour, vitamins and fats degrade under light."
            />

            <div className="flex flex-wrap gap-4 sm:col-span-2">
              <div className="flex flex-1 items-center gap-3 rounded-lg border border-border bg-cream-50 px-4 py-3">
                <Switch
                  id="sw-hyg"
                  checked={wizardInput.hygroscopic}
                  onCheckedChange={(c) => setWizardInput({ hygroscopic: c })}
                />
                <div>
                  <Label htmlFor="sw-hyg" className="text-sm font-medium">
                    Hygroscopic <Term k="hygroscopic" />
                  </Label>
                  <p className="text-xs text-navy-600">Absorbs moisture from air — caking risk.</p>
                </div>
              </div>
              <div className="flex flex-1 items-center gap-3 rounded-lg border border-border bg-cream-50 px-4 py-3">
                <Switch
                  id="sw-frg"
                  checked={wizardInput.fragile}
                  onCheckedChange={(c) => setWizardInput({ fragile: c })}
                />
                <div>
                  <Label htmlFor="sw-frg" className="text-sm font-medium">
                    Fragile
                  </Label>
                  <p className="text-xs text-navy-600">Needs crush/impact protection in transit.</p>
                </div>
              </div>
            </div>
          </div>
        );

      // ------------------------------------------------------------------
      // STEP 3 — STORAGE
      // ------------------------------------------------------------------
      case 3:
        return (
          <div className="space-y-5">
            <FieldShell
              label="Target shelf life"
              termKey="shelfLife"
              hint="How many days the packaged food should stay acceptable."
            >
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="number"
                  value={wizardInput.targetShelfLifeDays}
                  min={1}
                  max={1825}
                  aria-label="Target shelf life in days"
                  className="h-9 w-28"
                  onChange={(e) => {
                    const n = e.target.valueAsNumber;
                    if (!Number.isNaN(n))
                      setWizardInput({ targetShelfLifeDays: Math.min(1825, Math.max(1, n)) });
                  }}
                />
                <span className="text-sm text-navy-600">days</span>
                <div className="flex flex-wrap gap-1.5">
                  {SHELF_LIFE_PRESETS.map((d) => (
                    <Chip
                      key={d}
                      active={wizardInput.targetShelfLifeDays === d}
                      onClick={() => setWizardInput({ targetShelfLifeDays: d })}
                    >
                      {d}d
                    </Chip>
                  ))}
                </div>
              </div>
            </FieldShell>

            <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
              <NumberSlider
                label="Storage temperature"
                value={wizardInput.storageTempC}
                min={-30}
                max={45}
                step={1}
                unit="°C"
                onChange={(v) => setWizardInput({ storageTempC: v })}
                hint="Typical storage/retail temperature for this product."
              />
              <NumberSlider
                label="Relative humidity"
                termKey="rh"
                value={wizardInput.storageRH}
                min={10}
                max={95}
                step={1}
                unit="%"
                onChange={(v) => setWizardInput({ storageRH: v })}
                hint="High RH raises moisture-uptake risk for hygroscopic foods."
              />
            </div>

            <FieldShell label="Storage type" hint="Where and how the packed food is held.">
              <Select
                value={wizardInput.storageType}
                onValueChange={(v) =>
                  setWizardInput({ storageType: v as AnalysisInput["storageType"] })
                }
              >
                <SelectTrigger className="w-full sm:w-96" aria-label="Storage type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STORAGE_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldShell>

            {chillingWarning && (
              <Alert className="border-amber-600/30 bg-amber-50">
                <TriangleAlert className="size-4 text-amber-700" />
                <AlertTitle className="text-amber-900">Below the safe storage minimum</AlertTitle>
                <AlertDescription className="text-amber-900/85">
                  {wizardInput.storageTempC} °C is below the safe minimum for this commodity (
                  {kbCommodity?.minSafeStorageTempC} °C) — chilling injury risk.{" "}
                  <Term k="chillingInjury" /> Packaging cannot prevent it; raise the storage
                  temperature.
                </AlertDescription>
              </Alert>
            )}

            {wizardInput.storageType === "frozen" && (
              <Alert className="border-forest-600/30 bg-forest-50">
                <Snowflake className="size-4 text-forest-700" />
                <AlertDescription className="text-forest-800/90">
                  Frozen storage: keep seal integrity high and water-vapour transmission low —
                  sublimation inside the pack causes <Term k="freezeBurn" /> (surface drying).
                </AlertDescription>
              </Alert>
            )}
          </div>
        );

      // ------------------------------------------------------------------
      // STEP 4 — LOGISTICS
      // ------------------------------------------------------------------
      case 4:
        return (
          <div className="space-y-5">
            <FieldShell
              label="Transport duration"
              hint="Total time in transit across the distribution chain."
            >
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="number"
                  value={wizardInput.transportDurationDays}
                  min={0}
                  max={60}
                  aria-label="Transport duration in days"
                  className="h-9 w-24"
                  onChange={(e) => {
                    const n = e.target.valueAsNumber;
                    if (!Number.isNaN(n))
                      setWizardInput({ transportDurationDays: Math.min(60, Math.max(0, n)) });
                  }}
                />
                <span className="text-sm text-navy-600">days</span>
                <div className="flex flex-wrap gap-1.5">
                  {TRANSPORT_PRESETS.map((d) => (
                    <Chip
                      key={d}
                      active={wizardInput.transportDurationDays === d}
                      onClick={() => setWizardInput({ transportDurationDays: d })}
                    >
                      {d}d
                    </Chip>
                  ))}
                </div>
              </div>
            </FieldShell>

            <FieldShell label="Transport mode" hint="Primary mode used in distribution.">
              <Select
                value={wizardInput.transportMode}
                onValueChange={(v) =>
                  setWizardInput({ transportMode: v as AnalysisInput["transportMode"] })
                }
              >
                <SelectTrigger className="w-full sm:w-80" aria-label="Transport mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRANSPORT_MODE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldShell>

            <FieldShell
              label="Handling intensity"
              hint="Rough handling raises the mechanical-protection requirement."
            >
              <RadioGroup
                value={wizardInput.handlingIntensity}
                onValueChange={(v) =>
                  setWizardInput({ handlingIntensity: v as AnalysisInput["handlingIntensity"] })
                }
                className="mt-1.5 flex flex-wrap gap-5"
              >
                {(["gentle", "normal", "rough"] as const).map((opt) => (
                  <div key={opt} className="flex items-center gap-2">
                    <RadioGroupItem value={opt} id={`handling-${opt}`} />
                    <Label htmlFor={`handling-${opt}`} className="font-normal capitalize">
                      {opt}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </FieldShell>

            <FieldShell
              label="Light exposure"
              hint="Direct sunlight or shopfront lighting raises light-protection needs."
            >
              <RadioGroup
                value={wizardInput.lightExposure}
                onValueChange={(v) =>
                  setWizardInput({ lightExposure: v as AnalysisInput["lightExposure"] })
                }
                className="mt-1.5 flex flex-wrap gap-5"
              >
                {(["none", "partial", "direct"] as const).map((opt) => (
                  <div key={opt} className="flex items-center gap-2">
                    <RadioGroupItem value={opt} id={`light-${opt}`} />
                    <Label htmlFor={`light-${opt}`} className="font-normal capitalize">
                      {opt}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </FieldShell>
          </div>
        );

      // ------------------------------------------------------------------
      // STEP 5 — PRIORITIES
      // ------------------------------------------------------------------
      case 5:
        return (
          <div className="space-y-4">
            <div className="space-y-3">
              {PRIORITY_ROWS.map((row) => (
                <div
                  key={row.key}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-white p-3.5"
                >
                  <div>
                    <p className="text-sm font-semibold text-navy-900">{row.label}</p>
                    <p className="text-xs text-navy-600">{row.hint}</p>
                  </div>
                  <Select
                    value={wizardInput.priorities[row.key]}
                    onValueChange={(v) =>
                      setWizardInput({
                        priorities: { ...wizardInput.priorities, [row.key]: v as Importance },
                      })
                    }
                  >
                    <SelectTrigger
                      className="w-44"
                      aria-label={`${row.label} importance`}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {IMPORTANCE_OPTIONS.map((imp) => (
                        <SelectItem key={imp} value={imp}>
                          {IMPORTANCE_LABEL[imp]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <Alert className="border-forest-600/30 bg-forest-50">
              <Info className="size-4 text-forest-700" />
              <AlertDescription className="text-forest-800/90">
                Weights normalise automatically; leave “Not a priority” for balanced weighting.
              </AlertDescription>
            </Alert>
          </div>
        );

      // ------------------------------------------------------------------
      // STEP 6 — ANALYSIS
      // ------------------------------------------------------------------
      case 6:
      default:
        return (
          <div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {summaryItems.map((it) => (
                <SummaryItem key={it.label} label={it.label} value={it.value} />
              ))}
            </div>
            <p className="mt-3 text-xs text-navy-600">
              Anything look wrong? Use the step pills above or the Back button to adjust.
            </p>

            <div className="mt-6 flex flex-col items-center gap-3 rounded-xl border border-forest-600/25 bg-forest-50 p-6 text-center">
              <p className="max-w-xl text-sm leading-relaxed text-navy-700">
                The deterministic engine will derive packaging requirements from your food profile,
                filter materials against hard constraints and score every material in the knowledge
                base — explainable, reproducible, no AI guessing.
              </p>
              <Button
                size="lg"
                onClick={() => void runAnalysis()}
                disabled={analyzing}
                className="bg-forest-700 px-8 text-base hover:bg-forest-600"
              >
                <Play className="size-4" aria-hidden />
                Run Analysis
              </Button>
            </div>

            {runError && (
              <Alert variant="destructive" className="mt-4 text-left">
                <AlertCircle className="size-4" />
                <AlertTitle>Analysis failed</AlertTitle>
                <AlertDescription className="flex flex-wrap items-center gap-3">
                  <span>{runError}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void runAnalysis()}
                    disabled={analyzing}
                    className="ml-auto"
                  >
                    <RotateCcw className="size-3.5" aria-hidden />
                    Retry
                  </Button>
                </AlertDescription>
              </Alert>
            )}
          </div>
        );
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:py-10">
      {/* Header row */}
      <BackButton label="Back to Dashboard" fallback="dashboard" />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy-950 sm:text-3xl">
            Packaging Analysis
          </h1>
          <p className="mt-1 text-sm text-navy-600">Decision support in six guided steps</p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            resetWizard();
            clearTransientErrors();
          }}
          disabled={analyzing}
        >
          <RotateCcw className="size-4" aria-hidden />
          Reset
        </Button>
      </div>

      {/* Step segments */}
      <nav aria-label="Wizard steps" className="mt-6">
        <div className="flex flex-wrap gap-2">
          {STEPS.map((s, i) => {
            const idx = i + 1;
            const isActive = idx === wizardStep;
            const isCompleted = idx < wizardStep;
            const clickable = (isCompleted || isActive) && !analyzing;
            return (
              <button
                key={s.num}
                type="button"
                onClick={() => clickable && setWizardStep(idx)}
                disabled={!clickable}
                aria-current={isActive ? "step" : undefined}
                aria-label={`Step ${idx}: ${s.label}`}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                  isActive && "bg-forest-700 text-white",
                  isCompleted && "bg-forest-100 text-forest-800 hover:bg-forest-100/80",
                  !isActive && !isCompleted && "bg-cream-200 text-navy-600",
                  !clickable && "cursor-default"
                )}
              >
                {isCompleted && <Check className="size-3.5" aria-hidden />}
                <span className="tabular-nums">{s.num}</span>
                <span className="hidden sm:inline">{s.label}</span>
              </button>
            );
          })}
        </div>
        {/* Thin progress bar */}
        <div
          className="mt-3 h-1.5 overflow-hidden rounded-full bg-cream-200"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={6}
          aria-valuenow={wizardStep}
          aria-label={`Step ${wizardStep} of 6`}
        >
          <div
            className="h-full rounded-full bg-forest-600 transition-[width] duration-500 ease-out"
            style={{ width: `${(wizardStep / STEPS.length) * 100}%` }}
          />
        </div>
      </nav>

      {/* Wizard card */}
      <Card className="relative mt-5 overflow-hidden" aria-busy={analyzing}>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg text-navy-950">
            <span className="text-forest-700">{STEPS[wizardStep - 1].num}</span>
            {STEPS[wizardStep - 1].title}
          </CardTitle>
          <CardDescription>{STEPS[wizardStep - 1].description}</CardDescription>
        </CardHeader>
        <CardContent className="min-h-[280px]">
          <motion.div
            key={wizardStep}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            {renderStep()}
          </motion.div>

          {/* Inline step validation error */}
          {stepErrorMsg && !analyzing && (
            <Alert variant="destructive" className="mt-5">
              <AlertCircle className="size-4" />
              <AlertDescription>{stepErrorMsg}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t bg-cream-50/60 p-4">
          <p className="text-xs text-navy-600">
            Step {wizardStep} of {STEPS.length} — {STEPS[wizardStep - 1].label}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={goBack} disabled={wizardStep === 1 || analyzing}>
              <ChevronLeft className="size-4" aria-hidden />
              Back
            </Button>
            <Button
              onClick={goNext}
              disabled={analyzing}
              className="bg-forest-700 hover:bg-forest-600"
            >
              {wizardStep === 6 ? (
                <>
                  <Play className="size-4" aria-hidden />
                  Run Analysis
                </>
              ) : (
                <>
                  Continue
                  <ChevronRight className="size-4" aria-hidden />
                </>
              )}
            </Button>
          </div>
        </CardFooter>

        {/* Analyzing overlay */}
        {analyzing && (
          <div
            className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-cream-50/90 backdrop-blur-sm"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="size-8 animate-spin text-forest-700" aria-hidden />
            <p className="text-sm font-semibold text-navy-900">{STATUS_LINES[statusIdx]}</p>
            <p className="text-xs text-navy-600">
              Deterministic rule engine — no AI guessing, results in seconds.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
