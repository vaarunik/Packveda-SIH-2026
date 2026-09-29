"use client";

import { motion } from "framer-motion";
import {
  Apple,
  ClipboardList,
  ShieldCheck,
  BrainCircuit,
  Boxes,
  Store,
  FlaskConical,
  Handshake,
  BookMarked,
  ArrowDown,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * The PACKVEDA end-to-end workflow (PS 26236).
 *
 * ARCHITECTURE NOTE:
 * The AI's responsibility ends at RECOMMEND + MATCH + EXPLAIN. The platform
 * then connects buyers with suppliers (sample/quote requests). PHYSICAL
 * TESTING & VALIDATION is a REAL-WORLD stage — the AI recommends, testing
 * validates, experts approve. The workflow ends at the PACKAGING PASSPORT,
 * which stores the validated packaging decision and its supporting evidence.
 */

export interface PipelineStep {
  icon: React.ElementType;
  label: string;
  sub: string;
  tone?: "engine" | "realworld" | "record" | "default";
}

export const PIPELINE_STEPS: PipelineStep[] = [
  { icon: Apple, label: "Food Commodity", sub: "What are you packaging?" },
  { icon: ClipboardList, label: "Food & Storage Profile", sub: "Composition + environment" },
  {
    icon: ShieldCheck,
    label: "Packaging Requirements",
    sub: "Derived from food science & storage",
  },
  {
    icon: BrainCircuit,
    label: "AI Recommendation",
    sub: "Multi-criteria filtering + explainable scoring",
    tone: "engine",
  },
  {
    icon: Boxes,
    label: "Material Matching",
    sub: "Requirements vs material properties",
    tone: "engine",
  },
  { icon: Store, label: "Supplier Matching", sub: "Materials ↔ relevant suppliers" },
  { icon: Handshake, label: "Sample / Quote Request", sub: "Connects buyer with supplier" },
  {
    icon: FlaskConical,
    label: "Physical Testing & Validation",
    sub: "Real-world trial — testing validates the recommendation",
    tone: "realworld",
  },
  {
    icon: BookMarked,
    label: "Packaging Passport",
    sub: "Stores the validated packaging decision",
    tone: "record",
  },
];

export function RecommendationPipeline({ compact = false }: { compact?: boolean }) {
  return (
    <div className="w-full max-w-full lg:max-w-md lg:mx-0" aria-label="PackVeda end-to-end workflow">
      <ol className="relative mx-auto flex w-full flex-col gap-1">
        {PIPELINE_STEPS.map((step, i) => {
          const Icon = step.icon;
          const isEngine = step.tone === "engine";
          const isRealWorld = step.tone === "realworld";
          const isRecord = step.tone === "record";
          return (
            <motion.li
              key={step.label}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.06, ease: "easeOut" }}
              className="relative"
            >
              <div
                className={cn(
                  "flex items-center gap-3.5 rounded-xl border px-4 py-2.5 transition-colors",
                  isEngine &&
                    "border-emerald-400/40 bg-emerald-400/10 shadow-[0_0_24px_rgba(52,211,153,0.15)]",
                  isRealWorld && "border-amber-400/35 bg-amber-400/[0.08]",
                  isRecord && "border-emerald-400/50 bg-emerald-400/[0.14]",
                  !step.tone && "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"
                )}
              >
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg border",
                    isEngine && "border-emerald-400/40 bg-emerald-400/20 text-emerald-300",
                    isRealWorld && "border-amber-400/40 bg-amber-400/15 text-amber-300",
                    isRecord && "border-emerald-400/50 bg-emerald-400/20 text-emerald-200",
                    !step.tone && "border-white/10 bg-white/5 text-cream-100/80"
                  )}
                >
                  <Icon className="size-4.5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-cream-50">
                    {step.label}
                    {isRealWorld && (
                      <span className="ml-2 hidden rounded-full border border-amber-400/40 px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wider text-amber-300 sm:inline">
                        Real world
                      </span>
                    )}
                  </p>
                  {!compact && (
                    <p className="truncate text-xs text-cream-100/55">{step.sub}</p>
                  )}
                </div>
                <span
                  aria-hidden
                  className={cn(
                    "ml-auto font-mono text-[10px] font-semibold",
                    isRealWorld ? "text-amber-300/80" : "text-cream-100/35"
                  )}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              {i < PIPELINE_STEPS.length - 1 && (
                <motion.span
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06 + 0.18 }}
                  className={cn(
                    "flex justify-center py-0.5",
                    i === 6 ? "text-amber-300/70" : "text-cream-100/40"
                  )}
                  aria-hidden
                >
                  <ArrowDown className="size-4" />
                </motion.span>
              )}
            </motion.li>
          );
        })}
      </ol>

      {/* Distinction that matters for PS 26236 — printed under the pipeline */}
      <p className="mt-3 text-center text-[11px] font-medium leading-relaxed text-amber-100/80">
        AI recommends → physical testing validates → expert approves. PackVeda
        never replaces laboratory validation.
      </p>
    </div>
  );
}

const TRADITIONAL = [
  "Food Identification",
  "Storage Assessment",
  "Expert / Supplier Consultation",
  "Material & Datasheet Search",
  "OTR / WVTR / Strength Comparison",
  "Candidate Selection",
  "Trial & Testing",
  "Final Packaging Decision",
];

/** The traditional manual workflow shown in the problem section. */
export function TraditionalFlow() {
  return (
    <div
      className="flex flex-wrap items-center justify-center gap-y-3"
      aria-label="Traditional packaging selection workflow"
    >
      {TRADITIONAL.map((label, i) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, scale: 0.94 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35, delay: i * 0.06 }}
          className="flex items-center"
        >
          <div className="rounded-lg border border-border bg-card px-3.5 py-2 text-center text-xs font-medium text-navy-800 shadow-sm sm:text-[13px]">
            {label}
          </div>
          {i < TRADITIONAL.length - 1 && (
            <ArrowRight className="mx-1 size-4 shrink-0 text-terracotta-500" aria-hidden />
          )}
        </motion.div>
      ))}
    </div>
  );
}

/** Compact end-to-end ecosystem pillars: Recommend → Match → Compare → Connect → Validate */
export function EcosystemPillars({ className }: { className?: string }) {
  const pillars = [
    { icon: BrainCircuit, label: "Recommend", desc: "AI-ranked, explainable candidates" },
    { icon: Boxes, label: "Match", desc: "Requirements vs declared properties" },
    { icon: CheckCircle2, label: "Compare", desc: "Side-by-side materials" },
    { icon: Store, label: "Connect", desc: "Suppliers, samples & quotes" },
    { icon: FlaskConical, label: "Validate", desc: "Physical testing before adoption" },
  ];
  return (
    <div className={cn("flex flex-wrap justify-center gap-2.5", className)}>
      {pillars.map((p, i) => {
        const Icon = p.icon;
        return (
          <div key={p.label} className="flex items-center">
            <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3.5 py-2 shadow-sm">
              <Icon className="size-4 text-forest-600" aria-hidden />
              <div className="leading-tight">
                <p className="text-[13px] font-semibold text-navy-900">{p.label}</p>
                <p className="text-[10.5px] text-navy-600">{p.desc}</p>
              </div>
            </div>
            {i < pillars.length - 1 && (
              <ArrowRight className="mx-1.5 size-4 shrink-0 text-navy-600/50" aria-hidden />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default RecommendationPipeline;
