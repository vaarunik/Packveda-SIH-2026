"use client";

// PACKVEDA — Packaging Passport view.
// A structured, honest factsheet per material: barrier/mechanical/food/thermal
// data with provenance, sustainability, regulatory caution, validation
// checklist and a QR traceability CONCEPT preview (no scannable code, no
// blockchain claims, no invented certifications).

import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Leaf,
  Ruler,
  ScanLine,
  ShieldAlert,
  Sparkles,
  Thermometer,
  TriangleAlert,
  UtensilsCrossed,
  XCircle,
} from "lucide-react";
import { usePackVeda } from "@/lib/store";
import { MATERIALS, getMaterial } from "@/lib/data/materials";
import type { PackagingMaterial, MaterialForm, SourceRef } from "@/lib/data/types";
import { Term } from "@/components/shared/term-tooltip";
import { MaturityBadge } from "@/components/shared/maturity-badge";
import { ScoreBar } from "@/components/shared/score-ring";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { BackButton } from "@/components/shared/back-button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const FORM_LABEL: Record<MaterialForm, string> = {
  film_flexible: "Flexible Film",
  laminate_flexible: "Flexible Laminate",
  semi_rigid: "Semi-Rigid",
  rigid: "Rigid Container",
  paper_based: "Paper-Based",
};

const RECYCLE_LABEL: Record<PackagingMaterial["sustainability"]["recyclable"], string> = {
  widely: "Widely recyclable",
  limited: "Limited recyclability",
  difficult: "Difficult to recycle",
  not_recyclable: "Not recyclable",
};

const SOURCE_KIND_LABEL: Record<SourceRef["kind"], string> = {
  reference_database: "Reference database",
  textbook: "Textbook",
  standard: "Standard",
  industry_publication: "Industry publication",
  internal_estimate: "Internal estimate",
};

const VALIDATION_CHECKS = [
  "Material verification against supplier datasheet",
  "Seal integrity testing",
  "OTR/WVTR laboratory testing",
  "Strength / puncture testing",
  "Storage trial under intended conditions",
  "Shelf-life study",
  "Expert / lab verification",
];

function fmtNum(n: number): string {
  if (n >= 100) return Math.round(n).toLocaleString("en-IN");
  if (n >= 10) return String(Math.round(n * 10) / 10);
  return String(Math.round(n * 100) / 100);
}

/** Deterministic PACKVEDA PACKAGING ID concept: PKV-{ID}-{yyMMdd} */
function conceptId(id: string): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `PKV-${id.toUpperCase().replace(/[^A-Z0-9]/g, "-")}-${yy}${mm}${dd}`;
}

// --- deterministic fake-QR pattern -----------------------------------------

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 21×21 deterministic module grid with QR-style finder markers (decorative only). */
function buildQrGrid(seed: string, size = 21): boolean[][] {
  const rand = mulberry32(hashString(seed));
  const grid: boolean[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => rand() > 0.52)
  );
  const placeFinder = (r0: number, c0: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const ring = Math.max(Math.abs(r - 3), Math.abs(c - 3));
        grid[r0 + r][c0 + c] = ring !== 2; // black border + 3×3 centre, white gap
      }
    }
  };
  placeFinder(0, 0);
  placeFinder(0, size - 7);
  placeFinder(size - 7, 0);
  return grid;
}

function QrPlaceholder({ seed }: { seed: string }) {
  const size = 21;
  const grid = buildQrGrid(seed);
  return (
    <div className="rounded-xl border bg-white p-3 shadow-sm" aria-hidden>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="h-44 w-44"
        shapeRendering="crispEdges"
        role="presentation"
      >
        {grid.flatMap((row, r) =>
          row.map((on, c) =>
            on ? (
              <rect
                key={`${r}-${c}`}
                x={c}
                y={r}
                width={1}
                height={1}
                fill="var(--color-navy-950)"
              />
            ) : null
          )
        )}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-40px" },
  transition: { duration: 0.45, ease: "easeOut" as const },
};

function ProvenanceBadge({ ok }: { ok: boolean }) {
  return ok ? (
    <Badge
      variant="outline"
      className="gap-1 border-forest-600/30 bg-forest-50 px-1.5 py-0 text-[10px] text-forest-800"
    >
      <CheckCircle2 className="size-3" aria-hidden />
      source available
    </Badge>
  ) : (
    <Badge variant="outline" className="px-1.5 py-0 text-[10px] text-muted-foreground">
      No verified value available
    </Badge>
  );
}

function PassportSection({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("gap-3 py-5", className)}>
      <CardHeader className="pb-0">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-navy-950">
          <span className="flex size-6 items-center justify-center rounded-md bg-forest-50 text-forest-700">
            <Icon className="size-3.5" aria-hidden />
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm leading-relaxed">{children}</CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------

export default function PassportView() {
  const { passportMaterialId, openPassport, setView } = usePackVeda();
  const material = passportMaterialId ? getMaterial(passportMaterialId) : undefined;

  const handleSelect = (id: string) => openPassport(id); // sets store id + view (synced)

  // --------------------------------------------------------------- picker
  if (!material) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        {/* Selector bar */}
        <motion.div {...fadeUp} className="mb-6 flex flex-wrap items-center gap-3">
          <Label
            htmlFor="passport-select"
            className="text-sm font-medium text-navy-800"
          >
            Packaging material
          </Label>
          <Select value={passportMaterialId ?? ""} onValueChange={handleSelect}>
            <SelectTrigger id="passport-select" className="w-full bg-card sm:w-96">
              <SelectValue placeholder="Choose a material…" />
            </SelectTrigger>
            <SelectContent>
              {MATERIALS.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

        <motion.div {...fadeUp} className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-forest-600">
              Passport
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy-950 md:text-3xl">
              Packaging Passport
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-navy-600">
              A structured factsheet for each material — barrier, mechanical, food-compatibility
              and sustainability data with provenance, plus the validation steps needed before
              any commercial adoption. Select a material below or from the dropdown above.
            </p>
          </div>
          <MaturityBadge status="prototype" label="Packaging Passport — Prototype module" />
        </motion.div>

        <motion.div
          {...fadeUp}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          {MATERIALS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => openPassport(m.id)}
              aria-label={`Open packaging passport for ${m.name}`}
              className="group rounded-xl border bg-card p-4 text-left transition hover:border-forest-600 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest-600"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold leading-snug text-navy-950">{m.name}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {m.family} · {FORM_LABEL[m.form]}
                  </p>
                </div>
                <ArrowRight
                  className="mt-0.5 size-4 shrink-0 text-forest-600 opacity-0 transition group-hover:opacity-100"
                  aria-hidden
                />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge variant="secondary" className="text-[10px] font-normal tabular-nums">
                  OTR ≈ {m.otr === null ? "n/a" : fmtNum(m.otr)}
                </Badge>
                <Badge variant="secondary" className="text-[10px] font-normal tabular-nums">
                  WVTR ≈ {m.wvtr === null ? "n/a" : fmtNum(m.wvtr)}
                </Badge>
                <Badge
                  variant="outline"
                  className="border-forest-600/30 bg-forest-50 text-[10px] font-normal text-forest-800"
                >
                  {RECYCLE_LABEL[m.sustainability.recyclable]}
                </Badge>
              </div>
            </button>
          ))}
        </motion.div>

        <motion.p {...fadeUp} className="mt-8 text-center text-xs text-muted-foreground">
          Prefer guided selection?{" "}
          <button
            type="button"
            onClick={() => setView("explorer")}
            className="inline-flex items-center gap-1 font-medium text-forest-700 underline-offset-2 hover:underline"
          >
            Open the material explorer <ArrowRight className="size-3.5" aria-hidden />
          </button>
        </motion.p>
      </div>
    );
  }

  // --------------------------------------------------------------- passport
  const m = material;
  const tensileNA = m.tensileStrengthMPa === null && (m.form === "rigid" || m.form === "semi_rigid");

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      {/* Selector bar */}
      <motion.div {...fadeUp} className="mb-6 flex flex-wrap items-center gap-3">
        <Label htmlFor="passport-select" className="text-sm font-medium text-navy-800">
      <BackButton label="Back to Results" fallback="results" />
          Packaging material
        </Label>
        <Select value={m.id} onValueChange={handleSelect}>
          <SelectTrigger id="passport-select" className="w-full bg-card sm:w-96">
            <SelectValue placeholder="Choose a material…" />
          </SelectTrigger>
          <SelectContent>
            {MATERIALS.map((x) => (
              <SelectItem key={x.id} value={x.id}>
                {x.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </motion.div>

      {/* Header band */}
      <motion.div
        {...fadeUp}
        className="overflow-hidden rounded-2xl bg-navy-950 bg-grid-navy p-6 text-cream-50 md:p-8"
      >
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-400">
              Packaging Passport
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">{m.name}</h1>
            <p className="mt-1.5 text-sm text-cream-100/75">
              {m.family} · {m.structure} · {FORM_LABEL[m.form]}
            </p>
            <div className="mt-4">
              <MaturityBadge
                status="prototype"
                label="Packaging Passport — Prototype module"
                className="border-white/20 bg-white/10 text-cream-100 dark:border-white/20 dark:bg-white/10 dark:text-cream-100"
              />
            </div>
          </div>
          <div className="rounded-lg border border-white/20 bg-white/5 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-cream-100/60">
              Concept ID
            </p>
            <p className="mt-1 font-mono text-sm font-medium text-cream-50">{conceptId(m.id)}</p>
            <p className="mt-1 text-[10px] text-cream-100/50">PACKVEDA PACKAGING ID</p>
          </div>
        </div>
      </motion.div>

      {/* Sections */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {/* Key Barrier Properties */}
        <motion.div {...fadeUp}>
          <PassportSection title="Key Barrier Properties" icon={ShieldAlert}>
            <div>
              {(
                [
                  {
                    k: "OTR" as const,
                    label: "OTR",
                    unit: "cc/m²/day @ ~23 °C",
                    value: m.otr,
                    ok: m.otrSourceAvailable,
                  },
                  {
                    k: "WVTR" as const,
                    label: "WVTR",
                    unit: "g/m²/day @ 38 °C / 90 % RH",
                    value: m.wvtr,
                    ok: m.wvtrSourceAvailable,
                  },
                  {
                    k: "CO2TR" as const,
                    label: "CO₂TR",
                    unit: "cc/m²/day @ ~23 °C",
                    value: m.co2tr,
                    ok: m.co2trSourceAvailable,
                  },
                ] as const
              ).map((row, idx) => (
                <div
                  key={row.k}
                  className={cn(
                    "flex items-start justify-between gap-3 py-2.5",
                    idx < 2 && "border-b border-border/70"
                  )}
                >
                  <div>
                    <p className="text-sm font-medium text-navy-900">
                      <Term k={row.k}>{row.label}</Term>
                    </p>
                    <p className="text-[11px] text-muted-foreground">{row.unit}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {row.value === null ? (
                      <span className="text-xs italic text-muted-foreground">
                        Data not available
                      </span>
                    ) : (
                      <span className="text-sm font-semibold tabular-nums text-navy-950">
                        ≈ {fmtNum(row.value)}
                      </span>
                    )}
                    <ProvenanceBadge ok={row.ok} />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              Lower transmission rates mean stronger barriers. Values are indicative for the
              material class — actual films vary with grade, thickness and structure.
            </p>
          </PassportSection>
        </motion.div>

        {/* Mechanical Properties */}
        <motion.div {...fadeUp}>
          <PassportSection title="Mechanical Properties" icon={Ruler}>
            <dl className="space-y-2.5">
              <div className="flex items-start justify-between gap-3 border-b border-border/70 pb-2.5">
                <dt className="text-sm font-medium text-navy-900">
                  <Term k="tensileStrength">Tensile strength</Term>
                </dt>
                <dd className="text-right">
                  {m.tensileStrengthMPa === null ? (
                    <span className="text-xs italic text-muted-foreground">
                      {tensileNA ? "Not applicable" : "Data not available"}
                    </span>
                  ) : (
                    <span className="text-sm font-semibold tabular-nums text-navy-950">
                      ≈ {fmtNum(m.tensileStrengthMPa)} MPa
                    </span>
                  )}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3 border-b border-border/70 pb-2.5">
                <dt className="text-sm font-medium text-navy-900">
                  <Term k="micron">Thickness</Term>
                </dt>
                <dd className="text-sm font-semibold tabular-nums text-navy-950">
                  ≈ {fmtNum(m.thicknessMicron)} µm
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3 border-b border-border/70 pb-2.5">
                <dt className="text-sm font-medium text-navy-900">Puncture resistance</dt>
                <dd className="text-sm font-semibold capitalize text-navy-950">
                  {m.punctureResistance.replace("_", " ")}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-sm font-medium text-navy-900">
                  <Term k="sealability">Sealability</Term>
                </dt>
                <dd className="text-sm font-semibold capitalize text-navy-950">
                  {m.sealability.replace("_", " ")}
                </dd>
              </div>
            </dl>
            <p className="mt-2.5 rounded-md bg-cream-100 px-3 py-2 text-xs leading-relaxed text-navy-700">
              {m.sealNote}
            </p>
          </PassportSection>
        </motion.div>

        {/* Food Compatibility */}
        <motion.div {...fadeUp}>
          <PassportSection title="Food Compatibility" icon={UtensilsCrossed}>
            {m.foodContactSuitable ? (
              <p className="flex items-center gap-2 text-sm font-medium text-forest-700">
                <CheckCircle2 className="size-4 shrink-0" aria-hidden />
                Suitable as material class — verify grade
              </p>
            ) : (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <XCircle className="size-4 shrink-0" aria-hidden />
                Not indicated for direct food contact as a material class
              </p>
            )}
            <p className="mt-2 text-sm leading-relaxed text-navy-700">{m.foodContactNote}</p>
            <p className="mt-2 text-[11px] text-muted-foreground">
              See <Term k="foodContactGrade">food-contact grade</Term> — confirm the specific
              grade, migration compliance and declarations with your supplier.
            </p>
          </PassportSection>
        </motion.div>

        {/* Temperature Suitability */}
        <motion.div {...fadeUp}>
          <PassportSection title="Temperature Suitability" icon={Thermometer}>
            {m.tempMinC === null || m.tempMaxC === null ? (
              <p className="text-xs italic text-muted-foreground">Data not available</p>
            ) : (
              <p className="text-lg font-semibold tabular-nums text-navy-950">
                {m.tempMinC} – {m.tempMaxC} °C
              </p>
            )}
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              Indicative service-temperature range for the material class (freezing through
              hot-fill, where applicable). Confirm limits for the specific structure with the
              supplier datasheet — seals and coatings often fail before the base material.
            </p>
          </PassportSection>
        </motion.div>

        {/* Recommended Applications */}
        <motion.div {...fadeUp}>
          <PassportSection title="Recommended Applications" icon={Sparkles}>
            <ul className="flex flex-wrap gap-1.5">
              {m.typicalApplications.map((app) => (
                <li key={app}>
                  <Badge variant="secondary" className="font-normal">
                    {app}
                  </Badge>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Typical uses of this material class in Indian food packaging practice.
            </p>
          </PassportSection>
        </motion.div>

        {/* Limitations */}
        <motion.div {...fadeUp}>
          <PassportSection title="Limitations" icon={TriangleAlert}>
            <ul className="space-y-2">
              {m.limitations.map((lim) => (
                <li key={lim} className="flex items-start gap-2 text-sm text-navy-800">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
                  <span>{lim}</span>
                </li>
              ))}
            </ul>
          </PassportSection>
        </motion.div>

        {/* Sustainability */}
        <motion.div {...fadeUp}>
          <PassportSection title="Sustainability Information" icon={Leaf}>
            <ScoreBar label="Indicative sustainability score" value={m.sustainability.score} />
            <p className="mt-3">
              <Badge
                variant="outline"
                className="border-forest-600/30 bg-forest-50 text-forest-800"
              >
                {RECYCLE_LABEL[m.sustainability.recyclable]}
              </Badge>
            </p>
            <p className="mt-2 text-sm leading-relaxed text-navy-700">{m.sustainability.notes}</p>
            <p className="mt-2 text-[11px] text-muted-foreground">
              <Term k="compostable">Compostable</Term> claims depend on disposal infrastructure;
              recyclability depends on local collection systems.
            </p>
          </PassportSection>
        </motion.div>

        {/* Regulatory & Compliance */}
        <motion.div {...fadeUp}>
          <PassportSection title="Regulatory & Compliance" icon={FileText}>
            <p className="text-sm leading-relaxed text-navy-700">{m.regulatoryNotes}</p>
            <Alert className="mt-3 border-amber-600/30 bg-amber-50/70">
              <ShieldAlert className="text-amber-700" aria-hidden />
              <AlertTitle>Verification required</AlertTitle>
              <AlertDescription>
                Verification required against current applicable regulations and supplier
                documentation. PackVeda does not verify compliance status.
              </AlertDescription>
            </Alert>
          </PassportSection>
        </motion.div>

        {/* Data Sources */}
        <motion.div {...fadeUp}>
          <PassportSection title="Data Sources" icon={BookOpen}>
            <ul className="space-y-2">
              {m.sources.map((s) => (
                <li
                  key={s.label}
                  className="flex items-start justify-between gap-3 border-b border-border/70 pb-2 last:border-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-medium text-navy-900">{s.label}</p>
                    {s.note && <p className="text-[11px] text-muted-foreground">{s.note}</p>}
                  </div>
                  <Badge variant="outline" className="shrink-0 text-[10px] font-normal">
                    {SOURCE_KIND_LABEL[s.kind]}
                  </Badge>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs italic leading-relaxed text-muted-foreground">
              {m.dataConfidenceNote}
            </p>
          </PassportSection>
        </motion.div>

        {/* Validation Requirements */}
        <motion.div {...fadeUp}>
          <PassportSection title="Validation Requirements" icon={ClipboardCheck}>
            <ul className="space-y-2">
              {VALIDATION_CHECKS.map((item) => (
                <li key={item} className="flex items-center gap-2.5">
                  <Checkbox disabled checked={false} aria-label={`Pending: ${item}`} />
                  <span className="text-sm text-navy-800">{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
              <Badge variant="secondary" className="text-[10px]">AI recommends</Badge>
              <ArrowRight className="size-3" aria-hidden />
              <Badge variant="secondary" className="text-[10px]">Testing validates</Badge>
              <ArrowRight className="size-3" aria-hidden />
              <Badge variant="secondary" className="text-[10px]">Expert approves</Badge>
            </p>
          </PassportSection>
        </motion.div>

        {/* QR Traceability concept */}
        <motion.div {...fadeUp} className="md:col-span-2">
          <Card className="gap-3 py-5">
            <CardHeader className="pb-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-navy-950">
                  <span className="flex size-6 items-center justify-center rounded-md bg-forest-50 text-forest-700">
                    <ScanLine className="size-3.5" aria-hidden />
                  </span>
                  QR Traceability
                </CardTitle>
                <MaturityBadge status="future" label="Planned / Future Integration" />
              </div>
              <CardDescription>
                A concept record showing how a physical pack could link back to this Passport
                once QR generation is integrated.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid items-center gap-6 md:grid-cols-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-navy-600">
                    PACKVEDA PACKAGING ID
                  </p>
                  <dl className="mt-3 divide-y divide-border/70 rounded-lg border bg-cream-50/70">
                    {(
                      [
                        ["Material", m.name],
                        ["Food Application", "To be linked from an analysis"],
                        ["Batch / Version", "v1.0-prototype"],
                        [
                          "Recommendation Date",
                          new Date().toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          }),
                        ],
                        ["Validation Status", "Not linked in prototype"],
                        ["Source / Data Version", "PackVeda KB v1.0"],
                      ] as const
                    ).map(([label, value]) => (
                      <div
                        key={label}
                        className="flex items-center justify-between gap-3 px-3 py-2"
                      >
                        <dt className="text-xs font-medium text-navy-600">{label}</dt>
                        <dd className="text-right text-xs font-semibold text-navy-950">
                          {value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <div className="flex flex-col items-center gap-3">
                  <QrPlaceholder seed={m.id} />
                  <p className="max-w-xs text-center text-[11px] leading-relaxed text-muted-foreground">
                    Concept preview — QR generation connects a packaging record to its Passport
                    in a future integration. Not a scannable code.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Bottom disclaimer strip */}
      <motion.p
        {...fadeUp}
        className="mt-8 rounded-xl border border-dashed border-border bg-card/60 px-4 py-3 text-center text-xs leading-relaxed text-muted-foreground"
      >
        All values in this Passport are indicative literature data compiled for decision
        support — not certified laboratory results. Always confirm against supplier datasheets
        and appropriate testing before commercial use.
      </motion.p>
    </div>
  );
}
