"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Database,
  FileSearch,
  FlaskConical,
  Loader2,
  Minus,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/shared/back-button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Term } from "@/components/shared/term-tooltip";
import { MATERIALS } from "@/lib/data/materials";
import type { SourceRef } from "@/lib/data/types";
import { SOURCE_REGISTRY, SOURCE_CATEGORY_LABEL } from "@/lib/data/sources";
import { usePackVeda } from "@/lib/store";
import { testSupabaseConnection } from "@/lib/supabase-test";

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
} as const;

// ---------------------------------------------------------------------------
// Live Supabase connection check (uses lib/supabase-test.ts)
// ---------------------------------------------------------------------------

type ConnState = "checking" | "ok" | "fail";

function SupabaseStatusCard() {
  const [state, setState] = useState<ConnState>("checking");
  const [checkedAt, setCheckedAt] = useState<string | null>(null);

  // Manual re-check from the button (event handler — sync setState allowed)
  const runCheck = async () => {
    setState("checking");
    const ok = await testSupabaseConnection();
    setState(ok ? "ok" : "fail");
    setCheckedAt(new Date().toLocaleTimeString());
  };

  // Auto-run once on mount (state updates only after the async call resolves)
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const ok = await testSupabaseConnection();
      if (cancelled) return;
      setState(ok ? "ok" : "fail");
      setCheckedAt(new Date().toLocaleTimeString());
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-navy-800/10 bg-white px-4 py-3">
      <span className="shrink-0" aria-hidden>
        {state === "checking" && <Loader2 className="size-4.5 animate-spin text-slate-pkv-600" />}
        {state === "ok" && <CheckCircle2 className="size-4.5 text-emerald-600" />}
        {state === "fail" && <XCircle className="size-4.5 text-amber-warm-600" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-navy-900">
          Supabase cloud database —{" "}
          {state === "checking" && "checking connection…"}
          {state === "ok" && "connected (commodities table reachable)"}
          {state === "fail" && "check failed — see browser console for the error"}
        </p>
        <p className="text-[11.5px] text-navy-600">
          Live check queries the public `commodities` table with the anon
          (publishable) key. Row Level Security governs all other data.
          {checkedAt ? ` Last checked ${checkedAt}.` : ""}
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => void runCheck()}
        disabled={state === "checking"}
        className="shrink-0"
      >
        Run check again
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Data handling principles (section cards)
// ---------------------------------------------------------------------------

const PRINCIPLES = [
  {
    icon: BookOpen,
    title: "Indicative literature values",
    desc: (
      <>
        Material properties are compiled from public food-science and
        packaging references: typical mid-range values for the material class
        under common <Term k="wvtrCondition">test conditions</Term> — not
        measurements of any specific commercial film.
      </>
    ),
  },
  {
    icon: FileSearch,
    title: "Provenance per property",
    desc: (
      <>
        Each OTR / WVTR / CO₂TR entry carries an explicit source-available
        flag. Where no verified value exists, PackVeda displays “No verified
        value available” instead of a guess — always check the supplier{" "}
        <Term k="datasheet" /> before adoption.
      </>
    ),
  },
  {
    icon: ShieldCheck,
    title: "No fabrication policy",
    desc: (
      <>
        No certifications, FSSAI approvals, laboratory results or supplier
        claims are invented. Capability statements stay strictly within what
        the dataset actually contains.
      </>
    ),
  },
  {
    icon: FlaskConical,
    title: "Verification required",
    desc: (
      <>
        Users must verify shortlisted materials against supplier datasheets
        and laboratory tests before commercial adoption. PackVeda is decision
        support — not a certification body.
      </>
    ),
  },
];

// ---------------------------------------------------------------------------
// Property availability — counts computed live from the MATERIALS dataset
// ---------------------------------------------------------------------------

const TOTAL = MATERIALS.length;

interface PropertyRow {
  property: string;
  termKey?: "OTR" | "WVTR" | "CO2TR" | "tensileStrength";
  unit: string;
  available: number;
}

const PROPERTY_ROWS: PropertyRow[] = [
  {
    property: "OTR — Oxygen Transmission Rate",
    termKey: "OTR",
    unit: "cc/m²·day @ ~23 °C",
    available: MATERIALS.filter((m) => m.otrSourceAvailable).length,
  },
  {
    property: "WVTR — Water Vapour Transmission Rate",
    termKey: "WVTR",
    unit: "g/m²·day @ 38 °C / 90 % RH",
    available: MATERIALS.filter((m) => m.wvtrSourceAvailable).length,
  },
  {
    property: "CO₂TR — CO₂ Transmission Rate",
    termKey: "CO2TR",
    unit: "cc/m²·day @ ~23 °C",
    available: MATERIALS.filter((m) => m.co2trSourceAvailable).length,
  },
  {
    property: "Tensile strength",
    termKey: "tensileStrength",
    unit: "MPa",
    available: MATERIALS.filter((m) => m.tensileStrengthMPa !== null).length,
  },
  {
    property: "Temperature range",
    unit: "°C service range",
    available: MATERIALS.filter(
      (m) => m.tempMinC !== null && m.tempMaxC !== null
    ).length,
  },
  {
    property: "Relative cost",
    unit: "index 1–5",
    available: MATERIALS.filter((m) => m.relativeCostIndex > 0).length,
  },
  {
    property: "Sustainability",
    unit: "score 0–1",
    available: MATERIALS.filter(
      (m) => typeof m.sustainability?.score === "number"
    ).length,
  },
];

type RowTone = "full" | "partial" | "none";

function statusFor(count: number, total: number): { tone: RowTone; label: string } {
  if (count >= total) return { tone: "full", label: "Source available" };
  if (count > 0) return { tone: "partial", label: "Partially available" };
  return { tone: "none", label: "Data not available" };
}

const TONE_STYLE: Record<
  RowTone,
  { icon: React.ElementType; pill: string; iconColor: string }
> = {
  full: {
    icon: CheckCircle2,
    pill: "border-forest-600/30 bg-forest-50 text-forest-800",
    iconColor: "text-forest-600",
  },
  partial: {
    icon: AlertCircle,
    pill: "border-amber-600/30 bg-amber-50 text-amber-900",
    iconColor: "text-amber-600",
  },
  none: {
    icon: Minus,
    pill: "border-navy-800/15 bg-cream-200 text-navy-600",
    iconColor: "text-navy-600",
  },
};

// ---------------------------------------------------------------------------
// References — rendered from the central source registry (single source of
// truth shared with the results view, the chatbot and the persistence layer).
// ---------------------------------------------------------------------------

const KIND_LABEL: Record<SourceRef["kind"], string> = {
  reference_database: "Reference database",
  textbook: "Textbook / literature",
  standard: "Standard",
  industry_publication: "Industry publication",
  internal_estimate: "Internal estimate",
};

function KindChip({ kind }: { kind: SourceRef["kind"] }) {
  return (
    <span className="rounded border border-border bg-cream-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-navy-600">
      {KIND_LABEL[kind]}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Per-material provenance helpers
// ---------------------------------------------------------------------------

function ProvenanceFlag({ label, ok }: { label: string; ok: boolean }) {
  return ok ? (
    <span className="inline-flex items-center gap-1 rounded-full border border-forest-600/30 bg-forest-50 px-2.5 py-0.5 text-[11px] font-medium text-forest-800">
      <CheckCircle2 className="size-3" aria-hidden />
      {label}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full border border-amber-600/30 bg-amber-50 px-2.5 py-0.5 text-[11px] font-medium text-amber-900">
      <Minus className="size-3" aria-hidden />
      {label}
    </span>
  );
}

const fmt = (n: number | null) => (n === null ? "—" : n.toLocaleString("en-US"));

export default function SourcesView() {
  const setView = usePackVeda((s) => s.setView);

  return (
    <div className="bg-cream-50">
      <section
        aria-labelledby="sources-heading"
        className="bg-cream-50 py-14 md:py-20"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* ---------- Header ---------- */}
            <BackButton label="Back to Dashboard" fallback="dashboard" />
          <motion.header
            {...fadeUp}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="max-w-3xl"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-forest-600">
              Transparency
            </p>
            <h1
              id="sources-heading"
              className="mt-3 text-4xl font-bold tracking-tight text-navy-950 md:text-5xl"
            >
              Data &amp; Sources
            </h1>
            <p className="mt-5 text-base leading-relaxed text-navy-700 md:text-lg">
              Every important material property in PackVeda should be
              traceable: its source dataset or document, version/date context,
              the property and unit, and a confidence / availability flag. This
              page is the transparency layer for the knowledge base behind
              every recommendation.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-navy-700">
                {TOTAL} materials
              </span>
              <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-navy-700">
                {PROPERTY_ROWS.length} property families
              </span>
              <span className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-navy-700">
                Provenance flags per barrier property
              </span>
            </div>
          </motion.header>

          {/* ---------- Platform data & persistence ---------- */}
          <div className="mt-10 rounded-xl border border-slate-pkv-500/25 bg-slate-pkv-100/40 p-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-navy-800">
              Platform data &amp; persistence
            </h2>
            <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-navy-700">
              <li>
                <span className="font-semibold text-navy-900">Knowledge base</span> —
                commodity and material property values are indicative literature ranges
                stored in versioned code datasets with per-property provenance. They are
                never generated by an LLM.
              </li>
              <li>
                <span className="font-semibold text-navy-900">User &amp; marketplace data</span> —
                analyses, saved candidates, trial records, profiles, seller listings and
                sample/quote requests are stored in a relational database with role-scoped
                access enforced server-side (a seller can only modify their own listings;
                request histories are scoped to their owner). The schema mirrors the
                production Supabase Postgres + Row Level Security structure.
              </li>
              <li>
                <span className="font-semibold text-navy-900">Supplier listings</span> —
                this prototype environment includes a small set of demo seller listings so
                the matching flow can be evaluated. They are fictional, clearly labelled
                &ldquo;seller-declared · verification required&rdquo;, and must not be
                treated as verified suppliers.
              </li>
              <li>
                <span className="font-semibold text-navy-900">AI assistant</span> — explains
                the data above in natural language. It cannot invent property values: when
                verified data is unavailable it says so.
              </li>
            </ul>

            <SupabaseStatusCard />
          </div>

          {/* ---------- How PackVeda handles data ---------- */}
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {PRINCIPLES.map((p, i) => {
              const Icon = p.icon;
              return (
                <motion.div
                  key={p.title}
                  {...fadeUp}
                  transition={{ duration: 0.45, delay: (i % 2) * 0.08, ease: "easeOut" }}
                  className="rounded-xl border border-border bg-card p-6 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-forest-100 text-forest-700">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <h2 className="text-base font-semibold text-navy-950">
                      {p.title}
                    </h2>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-navy-600">
                    {p.desc}
                  </p>
                </motion.div>
              );
            })}
          </div>

          {/* ---------- Property availability summary ---------- */}
          <motion.div {...fadeUp} transition={{ duration: 0.55, ease: "easeOut" }} className="mt-14">
            <h2 className="text-2xl font-bold tracking-tight text-navy-950">
              Property Availability at a Glance
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-navy-600">
              Counts are computed live from the current dataset of{" "}
              {TOTAL} materials. “Source available” means a literature-backed
              value exists; partial coverage is shown honestly, never padded.
            </p>
            <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
              <table className="w-full min-w-[640px] text-left text-sm">
                <caption className="sr-only">
                  Property availability across the PackVeda material dataset
                </caption>
                <thead>
                  <tr className="border-b border-border bg-cream-100/70">
                    <th
                      scope="col"
                      className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-navy-600"
                    >
                      Property
                    </th>
                    <th
                      scope="col"
                      className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-navy-600"
                    >
                      Typical unit
                    </th>
                    <th
                      scope="col"
                      className="px-5 py-3 text-center text-xs font-semibold uppercase tracking-wider text-navy-600"
                    >
                      Coverage
                    </th>
                    <th
                      scope="col"
                      className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wider text-navy-600"
                    >
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {PROPERTY_ROWS.map((row, i) => {
                    const status = statusFor(row.available, TOTAL);
                    const Icon = TONE_STYLE[status.tone].icon;
                    return (
                      <tr
                        key={row.property}
                        className={
                          i % 2 === 1
                            ? "border-b border-border/70 bg-cream-50/60 last:border-b-0"
                            : "border-b border-border/70 last:border-b-0"
                        }
                      >
                        <td className="px-5 py-3 font-medium text-navy-800">
                          {row.termKey ? <Term k={row.termKey} /> : row.property}
                        </td>
                        <td className="px-5 py-3 text-xs text-navy-600">
                          {row.unit}
                        </td>
                        <td className="px-5 py-3 text-center font-mono text-xs text-navy-700">
                          {row.available} / {TOTAL}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${TONE_STYLE[status.tone].pill}`}
                          >
                            <Icon
                              className={`size-3 ${TONE_STYLE[status.tone].iconColor}`}
                              aria-hidden
                            />
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* ---------- References + dataset version ---------- */}
          <div className="mt-14 grid gap-5 lg:grid-cols-5">
            <motion.div
              {...fadeUp}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="rounded-xl border border-border bg-card p-6 shadow-sm lg:col-span-3"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-forest-100 text-forest-700">
                  <BookOpen className="size-5" aria-hidden />
                </span>
                <h2 className="text-lg font-semibold text-navy-950">
                  Reference List
                </h2>
              </div>
              <ul className="mt-5 space-y-4">
                {SOURCE_REGISTRY.map((ref) => (
                  <li
                    key={ref.id}
                    className="flex flex-col gap-1 border-b border-border/60 pb-4 last:border-b-0 last:pb-0"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-navy-800">{ref.name}</span>
                      <span className="rounded border border-border bg-cream-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-navy-600">
                        {SOURCE_CATEGORY_LABEL[ref.category]}
                      </span>
                      {ref.url && (
                        <a
                          href={ref.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-forest-700 hover:underline"
                        >
                          Open official source
                          <ArrowUpRight className="size-3" aria-hidden />
                        </a>
                      )}
                    </div>
                    <span className="text-xs text-navy-600">
                      {ref.title ? `${ref.title}` : "No specific document cited"}
                      {ref.version ? ` · ${ref.version}` : ""}
                      {ref.publicationYear ? ` · ${ref.publicationYear}` : ""}
                      {" · "}Last checked {ref.lastChecked}
                    </span>
                    <span className="text-xs leading-relaxed text-navy-600">{ref.description}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              {...fadeUp}
              transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
              className="rounded-xl border border-forest-600/20 bg-forest-50 p-6 shadow-sm lg:col-span-2"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-forest-100 text-forest-700">
                  <Database className="size-5" aria-hidden />
                </span>
                <h2 className="text-lg font-semibold text-navy-950">
                  Dataset Version
                </h2>
              </div>
              <p className="mt-5 text-sm font-semibold leading-relaxed text-navy-900">
                PackVeda knowledge base v1.0 (prototype dataset, compiled 2026)
              </p>
              <p className="mt-3 text-[13px] leading-relaxed text-navy-700">
                All barrier, strength and cost values are class-level
                indicative ranges compiled for decision support — not measured
                results for any specific commercial film, grade or supplier.
              </p>
              <p className="mt-3 rounded-lg border border-forest-600/25 bg-white/70 p-3 text-xs leading-relaxed text-forest-800">
                Where a property shows “—”, the app renders it as “Data not
                available”. Nothing is estimated to fill the gap.
              </p>
            </motion.div>
          </div>

          {/* ---------- Per-material provenance ---------- */}
          <motion.div {...fadeUp} transition={{ duration: 0.55, ease: "easeOut" }} className="mt-14">
            <h2 className="text-2xl font-bold tracking-tight text-navy-950">
              Per-Material Provenance
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-navy-600">
              Expand any material to see which properties carry source data,
              the underlying reference list, and the dataset’s own confidence
              note.
            </p>
            <div className="mt-6 rounded-xl border border-border bg-card p-2 shadow-sm">
              <div className="scroll-slim max-h-[32rem] overflow-y-auto px-2">
                <Accordion type="single" collapsible>
                  {MATERIALS.map((m) => {
                    const flags = [
                      { label: "OTR", ok: m.otrSourceAvailable },
                      { label: "WVTR", ok: m.wvtrSourceAvailable },
                      { label: "CO₂TR", ok: m.co2trSourceAvailable },
                    ];
                    return (
                      <AccordionItem key={m.id} value={m.id}>
                        <AccordionTrigger className="hover:no-underline">
                          <span className="flex w-full items-center justify-between gap-3 pr-2">
                            <span className="min-w-0 text-left">
                              <span className="block truncate text-sm font-semibold text-navy-950">
                                {m.name}
                              </span>
                              <span className="block truncate text-xs font-normal text-navy-600">
                                {m.family} · {m.structure}
                              </span>
                            </span>
                            <span
                              className="flex shrink-0 items-center gap-1.5"
                              aria-hidden
                            >
                              {flags.map((f) => (
                                <span
                                  key={f.label}
                                  className={`size-2 rounded-full ${
                                    f.ok ? "bg-forest-500" : "bg-amber-400"
                                  }`}
                                />
                              ))}
                            </span>
                          </span>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-4 pt-1">
                            <div className="flex flex-wrap gap-1.5">
                              <ProvenanceFlag
                                label="OTR source available"
                                ok={m.otrSourceAvailable}
                              />
                              <ProvenanceFlag
                                label="WVTR source available"
                                ok={m.wvtrSourceAvailable}
                              />
                              <ProvenanceFlag
                                label="CO₂TR source available"
                                ok={m.co2trSourceAvailable}
                              />
                            </div>
                            <p className="text-xs leading-relaxed text-navy-600">
                              Indicative values in the app: OTR{" "}
                              <span className="font-mono">{fmt(m.otr)}</span> ·
                              WVTR <span className="font-mono">{fmt(m.wvtr)}</span> ·
                              CO₂TR <span className="font-mono">{fmt(m.co2tr)}</span>{" "}
                              (— = no verified value available)
                            </p>
                            <div>
                              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-navy-600">
                                Sources
                              </p>
                              {m.sources.length === 0 ? (
                                <p className="text-xs italic text-navy-600">
                                  No source entries recorded for this material.
                                </p>
                              ) : (
                                <ul className="space-y-2">
                                  {m.sources.map((s, idx) => (
                                    <li
                                      key={`${m.id}-src-${idx}`}
                                      className="flex flex-wrap items-center gap-2"
                                    >
                                      <span className="text-[13px] font-medium text-navy-800">
                                        {s.label}
                                      </span>
                                      <KindChip kind={s.kind} />
                                      {s.note && (
                                        <span className="text-xs text-navy-600">
                                          — {s.note}
                                        </span>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                            <p className="rounded-lg border border-border bg-cream-100 p-3 text-xs italic leading-relaxed text-navy-600">
                              {m.dataConfidenceNote}
                            </p>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </div>
            </div>
          </motion.div>

          {/* ---------- CTA to Data Explorer ---------- */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="mt-14 flex flex-col items-start justify-between gap-4 rounded-xl border border-border bg-card p-6 shadow-sm sm:flex-row sm:items-center md:p-8"
          >
            <div>
              <h2 className="text-lg font-semibold text-navy-950">
                Explore the full dataset
              </h2>
              <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-navy-600">
                Browse all {TOTAL} materials with properties, provenance flags
                and disclaimers in the Data Explorer.
              </p>
            </div>
            <Button
              size="lg"
              onClick={() => setView("explorer")}
              className="w-full shrink-0 bg-forest-700 text-white hover:bg-forest-600 sm:w-auto"
            >
              Open Data Explorer
              <ArrowUpRight className="size-4" aria-hidden />
            </Button>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
