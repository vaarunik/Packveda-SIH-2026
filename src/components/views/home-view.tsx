"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowDown,
  ArrowRight,
  Award,
  BarChart3,
  Beaker,
  Boxes,
  BrainCircuit,
  Building2,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  CloudDrizzle,
  Database,
  Droplets,
  Factory,
  FlaskConical,
  Handshake,
  Layers,
  Leaf,
  Lock,
  Microscope,
  Sparkles,
  Recycle,
  SearchCheck,
  ShieldAlert,
  ShieldCheck,
  Sprout,
  Store,
  Thermometer,
  Trash2,
  TriangleAlert,
  Truck,
  Waves,
  Wheat,
  Wind,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MaturityBadge } from "@/components/shared/maturity-badge";
import { SectionHeading } from "@/components/shared/section-heading";
import { Term } from "@/components/shared/term-tooltip";
import {
  RecommendationPipeline,
  TraditionalFlow,
  EcosystemPillars,
} from "@/components/shared/workflow-diagram";
import { usePackVeda, type View } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import type { GlossaryKey } from "@/lib/glossary";

// ---------------------------------------------------------------------------
// Shared motion preset — subtle reveal, fires once
// ---------------------------------------------------------------------------

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
} as const;

// ---------------------------------------------------------------------------
// Section 2 data — 11 factors that make packaging selection difficult
// ---------------------------------------------------------------------------

interface Factor {
  icon: React.ElementType;
  label: string;
  termKey?: GlossaryKey;
}

const FACTORS: Factor[] = [
  { icon: Droplets, label: "Moisture content" },
  { icon: Beaker, label: "Fat / oil content" },
  { icon: FlaskConical, label: "Acidity (pH)" },
  { icon: Waves, label: "Water Activity", termKey: "waterActivity" },
  { icon: Leaf, label: "Respiration", termKey: "respiration" },
  { icon: Wind, label: "Oxygen sensitivity" },
  { icon: CalendarClock, label: "Desired Shelf Life", termKey: "shelfLife" },
  { icon: Thermometer, label: "Storage temperature" },
  { icon: CloudDrizzle, label: "Relative Humidity", termKey: "rh" },
  { icon: Truck, label: "Transportation conditions" },
  { icon: Boxes, label: "Mechanical protection" },
];

// ---------------------------------------------------------------------------
// Section 3 data — the 9-step "How PackVeda works" workflow (PS 26236)
// ---------------------------------------------------------------------------

interface StepDef {
  num: string;
  title: string;
  desc: string;
  bullets?: string[];
  extra?: ReactNode;
  tone?: "realworld" | "record";
}

const REQUIREMENT_CALLOUT: ReactNode = (
  <div className="mt-4 rounded-lg border border-forest-600/25 bg-forest-50 p-3">
    <MaturityBadge status="available" />
    <p className="mt-2 text-[13px] font-medium leading-relaxed text-forest-800">
      Requirements are derived from food + environment — not arbitrary AI
      guesses.
    </p>
  </div>
);

const VALIDATION_STAGES = [
  "Material verification",
  "Seal integrity testing",
  "OTR / WVTR testing",
  "Strength testing",
  "Storage trial",
  "Shelf-life study",
  "Microbiological validation (where applicable)",
  "Expert / lab verification",
];

const VALIDATION_CALLOUT: ReactNode = (
  <div className="mt-4 rounded-xl border border-navy-950/10 bg-cream-100 p-4">
    <p className="text-sm font-bold text-navy-950">
      Recommendation ≠ Final Approval
    </p>
    <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[13px] font-semibold text-forest-700">
      AI recommends
      <ArrowRight className="size-3.5" aria-hidden />
      <span className="text-navy-800">Testing validates</span>
      <ArrowRight className="size-3.5" aria-hidden />
      Expert approves
    </p>
    <div className="mt-3 flex flex-wrap gap-1.5">
      {VALIDATION_STAGES.map((stage) => (
        <span
          key={stage}
          className="rounded-full border border-forest-600/25 bg-forest-50 px-2.5 py-1 text-[11px] font-medium text-forest-800"
        >
          {stage}
        </span>
      ))}
    </div>
  </div>
);

const STEPS: StepDef[] = [
  {
    num: "01",
    title: "Food Commodity",
    desc: "What are you packaging? Tell PackVeda the commodity, its category and whether it is fresh or processed — the scientific baseline for everything that follows.",
    bullets: [
      "Commodity & category selection",
      "Moisture, fat/oil content and pH",
      "Water activity where available",
      "Respiration for fresh produce",
    ],
  },
  {
    num: "02",
    title: "Food & Storage Profile",
    desc: "Composition plus environment. The same food can demand very different packaging on a shelf, in a cold chain or in a freezer — so the profile captures both.",
    bullets: [
      "Target shelf life in days",
      "Storage temperature & relative humidity",
      "Ambient, chilled, frozen or cold chain",
      "Transport duration, mode & light exposure",
    ],
  },
  {
    num: "03",
    title: "Packaging Requirements",
    desc: "Requirements are derived from food science and the storage conditions — eight dimensions, each with an intensity level and a written rationale you can read and challenge.",
    bullets: [
      "Moisture & oxygen barrier levels",
      "CO₂ management for respiring produce",
      "Light, aroma & mechanical protection",
      "Sealability & thermal resistance",
    ],
    extra: REQUIREMENT_CALLOUT,
  },
  {
    num: "04",
    title: "AI Recommendation",
    desc: "Multi-criteria filtering plus explainable scoring produces a ranked shortlist — not a black box. Every score is broken down, with reasons for wins and rejections.",
    bullets: [
      "Constraint filtering on hard limits",
      "Weighted scoring by your priorities",
      "Why recommended / why not",
      "No invented values — ever",
    ],
    extra: (
      <div className="mt-4 space-y-2.5">
        <div className="rounded-lg border border-forest-600/25 bg-forest-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-forest-700">
            Why recommended
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-navy-700">
            Meets oxygen barrier · Suitable for moisture sensitivity ·
            Compatible with storage · Meets shelf-life target · Fits your
            priorities
          </p>
        </div>
        <div className="rounded-lg border border-amber-600/25 bg-amber-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-800">
            Why alternatives were not selected
          </p>
          <p className="mt-1 text-[13px] leading-relaxed text-navy-700">
            Insufficient moisture barrier · Higher oxygen transmission · Poor
            temperature suitability · Higher estimated cost
          </p>
        </div>
      </div>
    ),
  },
  {
    num: "05",
    title: "Material Matching",
    desc: "Your requirements are checked property-by-property against actual packaging material properties — OTR, WVTR, CO₂ transmission, strength, temperature range — with a visible verdict per requirement.",
    bullets: [
      "MATCH / PARTIAL / NOT MATCHED verdicts",
      "Indicative values with documented provenance",
      "Verification flags on unverified data",
      "Same rules power results & matching views",
    ],
  },
  {
    num: "06",
    title: "Supplier Matching",
    desc: "Suitable materials are matched with relevant suppliers listing them on the marketplace — so the shortlist becomes actionable.",
    bullets: [
      "Matched supplier listings per requirement",
      "Seller-declared data flagged for verification",
      "Active listings only",
      "Honest empty states when no match exists",
    ],
  },
  {
    num: "07",
    title: "Sample / Quote Request",
    desc: "Connect the buyer with the supplier: request samples or quotes against a matched listing and track every request from your dashboard.",
    bullets: [
      "Request samples or quotes in one click",
      "Requests scoped to your account",
      "Sellers respond from their studio",
      "Full request history retained",
    ],
  },
  {
    num: "08",
    title: "Physical Testing & Validation",
    desc: "A recommendation is decision support, not approval. Real-world packaging trials validate the recommendation before commercial adoption — the AI never replaces the laboratory.",
    tone: "realworld",
    extra: VALIDATION_CALLOUT,
  },
  {
    num: "09",
    title: "Packaging Passport",
    desc: "Store the validated packaging decision and its supporting information — requirements, matched materials, trial results and provenance — as a documented, traceable record.",
    tone: "record",
    bullets: [
      "Complete decision record",
      "Trial data entered by real testing",
      "Provenance for every value",
      "Shareable with your team or auditors",
    ],
  },
];

// ---------------------------------------------------------------------------
// Section 4 data — engine pipeline (9 numbered nodes)
// ---------------------------------------------------------------------------

const ENGINE_FLOW = [
  "User Inputs",
  "Food Characteristics",
  "Storage & Environment",
  "Shelf-Life Target",
  "Packaging Requirements",
  "Material Property Matching",
  "Constraint Filtering",
  "Multi-Criteria Scoring",
  "Explainable Recommendation",
];

const INTEL_LAYERS = [
  "Food-science rules",
  "Packaging property data",
  "Requirement thresholds",
  "Constraint filtering",
  "Multi-factor scoring",
  "Explainable reasoning",
  "Optional LLM layer for natural-language explanation only",
];

// ---------------------------------------------------------------------------
// Section 5 & 6 data
// ---------------------------------------------------------------------------

const AUDIENCE = [
  {
    icon: Sprout,
    title: "Farmers",
    desc: "Understand packaging options without needing advanced packaging expertise.",
  },
  {
    icon: Building2,
    title: "MSMEs & Food Startups",
    desc: "Shortlist suitable packaging faster — before committing budget to trials.",
  },
  {
    icon: Factory,
    title: "Packaging Manufacturers",
    desc: "Understand food-specific packaging requirements behind every enquiry.",
  },
  {
    icon: Microscope,
    title: "Food Technologists / Experts",
    desc: "Use as a decision-support and comparison tool alongside your own expertise.",
  },
];

const PILLARS = [
  {
    icon: Wheat,
    title: "Reduce Food Loss",
    desc: "Better packaging decisions can help protect food quality and shelf life.",
  },
  {
    icon: ClipboardCheck,
    title: "Reduce Trial-and-Error",
    desc: "Shortlist candidate materials before committing to physical testing.",
  },
  {
    icon: Store,
    title: "Support MSMEs",
    desc: "Make packaging knowledge more accessible to smaller food businesses.",
  },
  {
    icon: Recycle,
    title: "Encourage Sustainable Choices",
    desc: "Sustainability becomes part of selection, not an afterthought.",
  },
];

// ---------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------

export default function HomeView() {
  const setView = usePackVeda((s) => s.setView);
  const openAuthDialog = usePackVeda((s) => s.openAuthDialog);
  const { status } = useAuth();
  const authed = status === "authenticated";

  /** Navigate to an application view — or open the auth gate when logged out. */
  const run = (v: View, mode: "signin" | "signup" = "signin") => {
    if (authed) setView(v);
    else openAuthDialog({ mode });
  };

  const scrollToHowItWorks = () => {
    document
      .getElementById("how-it-works")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="bg-cream-50">
      {/* ================= 1. HERO ================= */}
      <section
        aria-label="PackVeda introduction"
        className="relative overflow-hidden bg-navy-950 bg-grid-navy"
      >
        {/* subtle radial emerald glows */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 right-[-6rem] h-96 w-96 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="absolute bottom-[-8rem] left-1/4 h-80 w-80 rounded-full bg-forest-500/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24 lg:px-8 lg:py-28">
          <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-14 lg:grid-cols-2 lg:gap-12">
            {/* LEFT — copy + CTAs */}
            <div className="flex min-w-0 flex-col items-start gap-6">
              <motion.div
                {...fadeUp}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-1.5"
              >
                <Award className="size-3.5 text-emerald-300" aria-hidden />
                <span className="text-xs font-medium tracking-wide text-emerald-300">
                  Smart India Hackathon 2026 · PS 26236
                </span>
              </motion.div>

              <motion.div
                {...fadeUp}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="flex size-16 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg shadow-black/25 ring-1 ring-white/25 sm:size-20"
              >
                <Image
                  src="/packveda-icon.png"
                  alt="PackVeda logo — intelligent food packaging"
                  width={80}
                  height={80}
                  priority
                  className="size-full object-contain"
                />
              </motion.div>

              <motion.h1
                {...fadeUp}
                transition={{ duration: 0.55, delay: 0.06, ease: "easeOut" }}
                className="text-5xl font-bold tracking-wide text-cream-50 sm:text-6xl lg:text-7xl"
              >
                PACK
                <span className="bg-gradient-to-r from-emerald-400 to-sand-400 bg-clip-text text-transparent">
                  VEDA
                </span>
              </motion.h1>

              <motion.p
                {...fadeUp}
                transition={{ duration: 0.55, delay: 0.12, ease: "easeOut" }}
                className="text-xl font-medium text-cream-100/90 md:text-2xl"
              >
                AI-Powered Food Packaging Intelligence
              </motion.p>

              <motion.p
                {...fadeUp}
                transition={{ duration: 0.55, delay: 0.18, ease: "easeOut" }}
                className="text-base font-semibold tracking-wide text-emerald-400 md:text-lg"
              >
                Smarter Packaging. Safer Food. Longer Shelf Life.
              </motion.p>

              <motion.p
                {...fadeUp}
                transition={{ duration: 0.55, delay: 0.24, ease: "easeOut" }}
                className="max-w-xl text-base leading-relaxed text-cream-100/70 md:text-lg"
              >
                PackVeda converts food composition and storage conditions into
                science-based packaging requirements, then shortlists suitable
                packaging materials with explainable reasoning — before you
                spend on physical trials.
              </motion.p>

              <motion.div
                {...fadeUp}
                transition={{ duration: 0.55, delay: 0.3, ease: "easeOut" }}
                className="flex flex-col gap-3 sm:flex-row sm:items-center"
              >
                <Button
                  size="lg"
                  onClick={() => run("analyze")}
                  className="bg-forest-600 text-white hover:bg-forest-500"
                >
                  Start Packaging Analysis
                  <ArrowRight className="size-4" aria-hidden />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={scrollToHowItWorks}
                  className="border-white/25 bg-transparent text-cream-50 hover:bg-white/10 hover:text-cream-50"
                >
                  See How It Works
                  <ArrowDown className="size-4" aria-hidden />
                </Button>
              </motion.div>

              <motion.p
                {...fadeUp}
                transition={{ duration: 0.55, delay: 0.33, ease: "easeOut" }}
                className="text-xs font-medium tracking-wide text-cream-100/55"
              >
                Free to explore — {authed ? "you're signed in" : "create a free account"} to run
                analyses, match suppliers and build Packaging Passports.
              </motion.p>

              <motion.p
                {...fadeUp}
                transition={{ duration: 0.55, delay: 0.36, ease: "easeOut" }}
                className="flex max-w-xl items-start gap-2.5 text-xs leading-relaxed text-cream-100/60"
              >
                <ShieldCheck
                  className="mt-0.5 size-4 shrink-0 text-emerald-400"
                  aria-hidden
                />
                Decision support powered by food-science rules, packaging
                properties, and explainable recommendation logic. Not
                laboratory-validated output.
              </motion.p>
            </div>

            {/* RIGHT — pipeline diagram */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
              className="w-full min-w-0"
            >
              <RecommendationPipeline />
            </motion.div>
          </div>
        </div>
      </section>

      {/* ================= 2. WHY PACKAGING SELECTION IS STILL DIFFICULT ================= */}
      <section
        aria-labelledby="why-heading"
        className="bg-cream-100 py-16 md:py-24"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="The Problem"
            title="Why Packaging Selection Is Still Difficult"
            description="The right package is not one-size-fits-all. It depends on the food itself, the environment it lives in, and the journey it takes — at least eleven factors at once."
          />

          <div className="mt-12 grid gap-8 lg:grid-cols-2 lg:items-start lg:gap-10">
            {/* LEFT — factor chips */}
            <motion.div {...fadeUp} transition={{ duration: 0.5, ease: "easeOut" }}>
              <p className="max-w-xl text-base leading-relaxed text-navy-700">
                Packaging requirements change with every product, because every
                product interacts differently with oxygen, moisture, light and
                time. A high-fat food fears rancidity; a hygroscopic powder
                fears caking; fresh produce needs to keep breathing. Getting
                this wrong shortens shelf life and wastes food.
              </p>
              <ul className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                {FACTORS.map((factor, i) => {
                  const Icon = factor.icon;
                  return (
                    <motion.li
                      key={factor.label}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.35, delay: i * 0.04 }}
                      className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5 shadow-sm"
                    >
                      <Icon
                        className="size-4 shrink-0 text-forest-600"
                        aria-hidden
                      />
                      <span className="text-[13px] font-medium text-navy-800">
                        {factor.termKey ? (
                          <Term k={factor.termKey} />
                        ) : (
                          factor.label
                        )}
                      </span>
                    </motion.li>
                  );
                })}
              </ul>
            </motion.div>

            {/* RIGHT — traditional workflow card */}
            <motion.div
              {...fadeUp}
              transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
              className="rounded-xl border border-border bg-card p-6 shadow-sm"
            >
              <h3 className="text-sm font-semibold uppercase tracking-wider text-navy-600">
                The traditional workflow today
              </h3>
              <div className="mt-5">
                <TraditionalFlow />
              </div>
              <div className="my-5 flex justify-center" aria-hidden>
                <ArrowDown className="size-5 text-forest-600" />
              </div>
              <div className="rounded-lg border border-forest-600/25 bg-forest-50 p-4 text-center">
                <p className="text-sm font-semibold leading-relaxed text-forest-800">
                  PackVeda simplifies this workflow into an intelligent
                  decision-support process.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ================= 3. HOW PACKVEDA WORKS ================= */}
      <section
        id="how-it-works"
        aria-labelledby="how-heading"
        className="bg-white py-16 md:py-24"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="The Workflow"
            title="How PackVeda Works"
            description="Nine structured steps — from describing your food to a validated, documented packaging decision. Every step is transparent, and none of them replaces testing."
          />

          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {STEPS.map((step, i) => {
              const isRealWorld = step.tone === "realworld";
              const isRecord = step.tone === "record";
              return (
                <motion.article
                  key={step.num}
                  {...fadeUp}
                  transition={{ duration: 0.45, delay: (i % 3) * 0.08, ease: "easeOut" }}
                  className={cn(
                    "flex flex-col rounded-xl border p-6 shadow-sm",
                    isRealWorld
                      ? "border-amber-600/30 bg-amber-50/60"
                      : isRecord
                        ? "border-forest-600/35 bg-forest-50/70"
                        : "border-border bg-card"
                  )}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span
                      aria-hidden
                      className={cn(
                        "font-mono text-3xl font-bold",
                        isRealWorld
                          ? "text-amber-warm-600/40"
                          : isRecord
                            ? "text-forest-600/35"
                            : "text-forest-600/25"
                      )}
                    >
                      {step.num}
                    </span>
                    {isRealWorld ? (
                      <span className="rounded-full border border-amber-warm-600/40 bg-amber-warm-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-warm-600">
                        Real-world stage
                      </span>
                    ) : isRecord ? (
                      <span className="rounded-full border border-forest-600/35 bg-forest-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-forest-700">
                        Outcome
                      </span>
                    ) : (
                      <span className="sr-only">Step {step.num}</span>
                    )}
                  </div>
                  <h3 className="text-base font-semibold text-navy-950">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-navy-600">
                    {step.desc}
                  </p>
                  {step.bullets && (
                    <ul className="mt-4 space-y-1.5">
                      {step.bullets.map((b) => (
                        <li
                          key={b}
                          className="flex items-start gap-2 text-[13px] leading-relaxed text-navy-700"
                        >
                          <CheckCircle2
                            className={cn(
                              "mt-0.5 size-3.5 shrink-0",
                              isRealWorld ? "text-amber-warm-600" : "text-forest-600"
                            )}
                            aria-hidden
                          />
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}
                  {step.extra}
                </motion.article>
              );
            })}
          </div>

          {/* End-to-end ecosystem: Recommend → Match → Compare → Connect → Validate */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mt-10"
          >
            <EcosystemPillars />
            <p className="mt-4 text-center text-xs text-navy-600">
              Physical Testing &amp; Validation runs after selection — a real-world verification
              stage, not an AI step. The Packaging Passport records the validated decision.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ================= 4. INSIDE THE ENGINE ================= */}
      <section
        aria-labelledby="engine-heading"
        className="relative overflow-hidden bg-navy-950 bg-grid-navy py-16 md:py-24"
      >
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute left-[-6rem] top-1/3 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Inside the Engine"
            title="Inside the PackVeda Intelligence Engine"
            description="A deterministic pipeline — from your inputs to an explainable recommendation. No hidden steps, no invented numbers."
            align="left"
            dark
          />

          <div className="mt-12 grid gap-10 lg:grid-cols-2 lg:gap-12">
            {/* LEFT — numbered pipeline */}
            <div>
              <div
                className="grid grid-cols-1 gap-2.5 sm:grid-cols-2"
                role="list"
                aria-label="PackVeda engine pipeline"
              >
                {ENGINE_FLOW.map((label, i) => {
                  const isFinal = i === ENGINE_FLOW.length - 1;
                  return (
                    <motion.div
                      key={label}
                      initial={{ opacity: 0, x: -14 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: i * 0.06, ease: "easeOut" }}
                      role="listitem"
                      className={
                        isFinal
                          ? "flex items-center gap-3 rounded-xl border border-emerald-400/40 bg-emerald-400/10 px-4 py-3 shadow-[0_0_24px_rgba(52,211,153,0.12)] sm:col-span-2"
                          : "flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3"
                      }
                    >
                      <span
                        className={
                          isFinal
                            ? "flex size-7 shrink-0 items-center justify-center rounded-md border border-emerald-400/40 bg-emerald-400/20 font-mono text-xs font-semibold text-emerald-300"
                            : "flex size-7 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/5 font-mono text-xs font-semibold text-cream-100/70"
                        }
                        aria-hidden
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span
                        className={
                          isFinal
                            ? "text-sm font-semibold text-emerald-200"
                            : "text-sm font-medium text-cream-50/90"
                        }
                      >
                        {label}
                      </span>
                      {isFinal && (
                        <Sparkles
                          className="ml-auto size-4 shrink-0 text-emerald-300"
                          aria-hidden
                        />
                      )}
                    </motion.div>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-cream-100/50">
                Steps run in numeric order — your inputs first, the explainable
                recommendation last.
              </p>
            </div>

            {/* RIGHT — Not just an LLM */}
            <motion.div
              {...fadeUp}
              transition={{ duration: 0.55, delay: 0.15, ease: "easeOut" }}
              className="rounded-xl border border-white/10 bg-white/[0.04] p-6 md:p-8"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-lg border border-emerald-400/30 bg-emerald-400/10">
                  <BrainCircuit className="size-5 text-emerald-300" aria-hidden />
                </span>
                <h3 className="text-lg font-semibold text-cream-50">
                  Not just an LLM
                </h3>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-cream-100/70">
                The intelligence layer is a combination of structured,
                checkable components — the language model is only an optional
                narrator:
              </p>
              <ol className="mt-5 space-y-2.5">
                {INTEL_LAYERS.map((layer, i) => (
                  <li key={layer} className="flex items-start gap-3">
                    <span
                      aria-hidden
                      className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/5 font-mono text-[11px] font-semibold text-cream-100/70"
                    >
                      {i + 1}
                    </span>
                    <span
                      className={
                        i === INTEL_LAYERS.length - 1
                          ? "text-[13px] italic leading-relaxed text-cream-100/60"
                          : "text-sm leading-relaxed text-cream-50/90"
                      }
                    >
                      {layer}
                    </span>
                  </li>
                ))}
              </ol>
              <div className="mt-6 rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-3.5">
                <p className="flex items-start gap-2 text-[13px] font-medium leading-relaxed text-emerald-200">
                  <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                  The LLM never invents OTR/WVTR values or scientific facts.
                </p>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <MaturityBadge status="available" label="Deterministic core" />
                <MaturityBadge
                  status="future"
                  label="Optional LLM explanation layer"
                  className="bg-white/10 text-cream-100 border-white/25"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ================= 4b. HOW THE MATCHING WORKS ================= */}
      <section
        aria-labelledby="matching-heading"
        className="bg-white py-16 md:py-24"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Matching, not guessing"
            title="How the Matching Works"
            description="PackVeda is an actual matching system — not an LLM wrapper. Derived packaging requirements are checked property-by-property against each material's real values, with a visible reason for every verdict."
          />

          <div className="mt-12 grid items-stretch gap-6 lg:grid-cols-[1fr_auto_1fr]">
            {/* Requirements side */}
            <motion.div
              {...fadeUp}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="rounded-xl border border-forest-600/25 bg-forest-50 p-6"
            >
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-forest-700">
                Your packaging requirements
              </p>
              <ul className="mt-4 space-y-3">
                {[
                  ["Oxygen barrier", "HIGH"],
                  ["Moisture barrier", "HIGH"],
                  ["Mechanical strength", "MEDIUM"],
                  ["Temperature", "AMBIENT"],
                  ["Shelf life", "12 MONTHS"],
                ].map(([k, v]) => (
                  <li key={k} className="flex items-center justify-between gap-3 border-b border-forest-600/15 pb-2.5 last:border-0">
                    <span className="text-sm font-medium text-navy-900">{k}</span>
                    <span className="rounded bg-forest-700 px-2 py-0.5 text-[10.5px] font-bold tracking-wide text-white">{v}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-[11.5px] leading-relaxed text-navy-600">
                Example profile — yours are derived from your food &amp; storage inputs by
                science rules, not templates.
              </p>
            </motion.div>

            {/* Engine in the middle */}
            <div className="flex flex-row items-center justify-center gap-3 lg:flex-col">
              <motion.div
                {...fadeUp}
                transition={{ duration: 0.45, delay: 0.1, ease: "easeOut" }}
                className="flex flex-col items-center gap-1.5 rounded-xl bg-navy-950 px-5 py-4 text-center shadow-lg"
              >
                <BrainCircuit className="size-6 text-emerald-400" aria-hidden />
                <p className="text-[11px] font-bold uppercase tracking-wider text-cream-50">Matching</p>
                <p className="text-[10px] text-cream-100/60">engine</p>
              </motion.div>
              <ArrowRight className="size-5 rotate-180 text-navy-600/40 lg:rotate-90" aria-hidden />
            </div>

            {/* Materials side */}
            <motion.div
              {...fadeUp}
              transition={{ duration: 0.45, delay: 0.15, ease: "easeOut" }}
              className="rounded-xl border border-border bg-card p-6 shadow-sm"
            >
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-navy-800">
                Matched packaging options
              </p>
              <div className="mt-4 space-y-4">
                {[
                  { name: "Material A — high-barrier laminate", rows: [["Oxygen", "match"], ["Moisture", "match"], ["Temperature", "match"]] },
                  { name: "Material B — metallised film", rows: [["Oxygen", "match"], ["Moisture", "partial"], ["Temperature", "match"]] },
                  { name: "Material C — mono PE film", rows: [["Oxygen", "partial"], ["Moisture", "match"], ["Temperature", "match"]] },
                ].map((m) => (
                  <div key={m.name} className="rounded-lg border border-border bg-cream-50 p-3.5">
                    <p className="text-[13px] font-semibold text-navy-950">{m.name}</p>
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {m.rows.map(([k, st]) => (
                        <li
                          key={k}
                          className={
                            st === "match"
                              ? "flex items-center gap-1 rounded-full border border-forest-600/30 bg-forest-50 px-2 py-0.5 text-[10.5px] font-semibold text-forest-800"
                              : "flex items-center gap-1 rounded-full border border-amber-warm-600/35 bg-amber-warm-50 px-2 py-0.5 text-[10.5px] font-semibold text-amber-warm-600"
                          }
                        >
                          {st === "match" ? (
                            <CheckCircle2 className="size-3" aria-hidden />
                          ) : (
                            <TriangleAlert className="size-3" aria-hidden />
                          )}
                          {k}: {st === "match" ? "MATCH" : "PARTIAL"}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[11.5px] leading-relaxed text-navy-600">
                Every ✓ and △ comes with an explanation — the same rules power your
                results page and the Packaging Matching view.
              </p>
            </motion.div>
          </div>

          <motion.div
            {...fadeUp}
            transition={{ duration: 0.45, delay: 0.2, ease: "easeOut" }}
            className="mt-8 flex flex-wrap justify-center gap-3"
          >
            <Button
              variant="outline"
              onClick={() => run("matching")}
              className="border-forest-700/30 text-forest-800 hover:bg-forest-50"
            >
              <Layers className="size-4" aria-hidden />
              See Packaging Matching
            </Button>
            <Button
              variant="outline"
              onClick={() => run("marketplace")}
              className="border-terracotta-500/40 text-terracotta-700 hover:bg-terracotta-50"
            >
              <Store className="size-4" aria-hidden />
              Browse Marketplace
            </Button>
          </motion.div>
          {!authed && (
            <p className="mt-3 text-center text-xs text-navy-600">
              Sign in to explore matching with your own requirements.
            </p>
          )}
        </div>
      </section>

      {/* ================= 5. WHO IS PACKVEDA FOR ================= */}
      <section
        aria-labelledby="who-heading"
        className="bg-cream-100 py-16 md:py-24"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Audience"
            title="Who Is PackVeda For?"
            description="One knowledge base, four kinds of decision-makers — each getting the same transparent shortlisting process."
          />

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {AUDIENCE.map((a, i) => {
              const Icon = a.icon;
              return (
                <motion.div
                  key={a.title}
                  {...fadeUp}
                  transition={{ duration: 0.45, delay: i * 0.08, ease: "easeOut" }}
                  className="rounded-xl border border-border bg-card p-6 shadow-sm"
                >
                  <span className="flex size-11 items-center justify-center rounded-lg bg-forest-100 text-forest-700">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-navy-950">
                    {a.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-navy-600">
                    {a.desc}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= 6. WHY PACKVEDA MATTERS ================= */}
      <section
        aria-labelledby="matters-heading"
        className="bg-white py-16 md:py-24"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Impact"
            title="Why PackVeda Matters"
            description="Food loss, wasted trials and inaccessible expertise are packaging problems before they are storage problems."
          />

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PILLARS.map((p, i) => {
              const Icon = p.icon;
              return (
                <motion.div
                  key={p.title}
                  {...fadeUp}
                  transition={{ duration: 0.45, delay: i * 0.08, ease: "easeOut" }}
                  className="rounded-xl border border-border bg-card p-6 shadow-sm"
                >
                  <span className="flex size-11 items-center justify-center rounded-lg bg-forest-100 text-forest-700">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-4 text-base font-semibold text-navy-950">
                    {p.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-navy-600">
                    {p.desc}
                  </p>
                </motion.div>
              );
            })}
          </div>

          <motion.p
            {...fadeUp}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="mx-auto mt-10 max-w-2xl text-center text-xs italic leading-relaxed text-navy-600/80"
          >
            No specific reduction percentages are claimed; outcomes depend on
            implementation and testing.
          </motion.p>
        </div>
      </section>

      {/* ================= 6a. CONNECT WITH PACKAGING SUPPLIERS ================= */}
      <section
        aria-labelledby="suppliers-heading"
        className="relative overflow-hidden bg-navy-900 bg-grid-navy py-16 md:py-24"
      >
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute right-[-5rem] top-[-4rem] h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-10 lg:grid-cols-2 lg:gap-14">
            <div>
              <SectionHeading
                eyebrow="Marketplace"
                title="Connect with Packaging Suppliers"
                description="After analysis, PackVeda matches your derived requirements with packaging materials listed by suppliers — then lets you request samples or quotes directly. Buyer and seller stay connected through one transparent, science-first workflow."
                align="left"
                dark
              />
              <motion.ul
                {...fadeUp}
                transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
                className="mt-8 space-y-3.5"
              >
                {[
                  {
                    icon: Boxes,
                    title: "Matched, not searched",
                    desc: "Listings are scored against your actual requirements — barrier, strength, temperature, shelf life.",
                  },
                  {
                    icon: Handshake,
                    title: "Samples & quotes",
                    desc: "Request a sample or a quote against a matched listing and track the response in your dashboard.",
                  },
                  {
                    icon: ShieldCheck,
                    title: "Honest provenance",
                    desc: "Seller-declared properties are always labelled and flagged for verification — never merged into the science.",
                  },
                ].map((f) => {
                  const Icon = f.icon;
                  return (
                    <li key={f.title} className="flex items-start gap-3.5">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-emerald-400/30 bg-emerald-400/10">
                        <Icon className="size-5 text-emerald-300" aria-hidden />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-cream-50">{f.title}</p>
                        <p className="mt-1 text-[13px] leading-relaxed text-slate-400">{f.desc}</p>
                      </div>
                    </li>
                  );
                })}
              </motion.ul>

              <motion.div
                {...fadeUp}
                transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
                className="mt-8 flex flex-wrap items-center gap-3"
              >
                {authed ? (
                  <Button
                    size="lg"
                    onClick={() => run("marketplace")}
                    className="bg-forest-600 text-white hover:bg-forest-500"
                  >
                    <Store className="size-4" aria-hidden />
                    Explore the Marketplace
                    <ArrowRight className="size-4" aria-hidden />
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    onClick={() => run("marketplace")}
                    className="bg-forest-600 text-white hover:bg-forest-500"
                  >
                    <Lock className="size-4" aria-hidden />
                    Sign in to explore matching
                  </Button>
                )}
                <span className="text-xs text-cream-100/50">
                  Available after an analysis — matching needs your requirements.
                </span>
              </motion.div>
            </div>

            {/* Visual: requirements → supplier card */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 sm:p-8"
            >
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-cream-100/60">
                From requirements to supplier
              </p>
              <div className="mt-5 space-y-3">
                <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300">
                    Your requirements
                  </p>
                  <p className="mt-1 text-sm text-cream-50/90">
                    Oxygen barrier HIGH · Moisture barrier HIGH · 12-month shelf life
                  </p>
                </div>
                <div className="flex justify-center text-cream-100/40" aria-hidden>
                  <ArrowDown className="size-4" />
                </div>
                <div className="rounded-xl border border-white/10 bg-navy-950/60 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-cream-50">
                        High-barrier PP/EVOH laminate
                      </p>
                      <p className="truncate text-xs text-slate-400">
                        Supplier listing · seller-declared · verification required
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-forest-500/40 bg-forest-500/15 px-2.5 py-1 text-[10.5px] font-bold text-emerald-300">
                      MATCH
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-cream-100/80">
                      Request Sample
                    </span>
                    <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-cream-100/80">
                      Request Quote
                    </span>
                  </div>
                </div>
                <p className="text-[11px] leading-relaxed text-cream-100/45">
                  Illustrative example — real matching runs after your analysis, inside your
                  account.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ================= 6b. FOR FOOD BUSINESSES / FOR MANUFACTURERS ================= */}
      <section
        aria-labelledby="sides-heading"
        className="bg-cream-50 py-16 md:py-24"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Two perspectives, one platform"
            title="For Food Businesses & For Packaging Manufacturers"
            description="PackVeda connects the two sides of food packaging — buyers get matched materials, manufacturers get matched buyers."
          />

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            {/* Buyer side */}
            <motion.div
              {...fadeUp}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="flex flex-col rounded-xl border border-forest-600/25 bg-white p-7 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-lg bg-forest-700 text-white">
                  <Wheat className="size-5" aria-hidden />
                </span>
                <h3 id="sides-heading" className="text-lg font-bold text-navy-950">
                  For Food Businesses
                </h3>
              </div>
              <ul className="mt-5 flex-1 space-y-2.5">
                {[
                  "Create a food profile — commodity, composition, storage",
                  "Get derived packaging requirements & AI recommendations",
                  "See exactly which requirements each material matches",
                  "Compare materials side-by-side and simulate scenarios",
                  "Request samples & quotes from matched suppliers",
                  "Track trials, build Packaging Passports",
                ].map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm text-navy-800">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-forest-600" aria-hidden />
                    {b}
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap gap-2.5">
                <Button
                  onClick={() => run("analyze")}
                  className="bg-forest-700 hover:bg-forest-600"
                >
                  Start Packaging Analysis
                  <ArrowRight className="size-4" aria-hidden />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => (authed ? setView("onboarding") : openAuthDialog({ mode: "signup" }))}
                  className="border-forest-700/30 text-forest-800 hover:bg-forest-50"
                >
                  Join as Buyer
                </Button>
              </div>
            </motion.div>

            {/* Seller side */}
            <motion.div
              {...fadeUp}
              transition={{ duration: 0.45, delay: 0.1, ease: "easeOut" }}
              className="flex flex-col rounded-xl border border-terracotta-500/30 bg-white p-7 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-lg bg-terracotta-600 text-white">
                  <Factory className="size-5" aria-hidden />
                </span>
                <h3 className="text-lg font-bold text-navy-950">
                  For Packaging Manufacturers
                </h3>
              </div>
              <ul className="mt-5 flex-1 space-y-2.5">
                {[
                  "List materials with real structure & properties",
                  "Share OTR, WVTR, thickness, MOQ, applications",
                  "Get matched against buyer requirements automatically",
                  "Receive sample & quote requests from food businesses",
                  "Honest provenance: seller-declared, verification required",
                  "No score manipulation — matching stays scientific",
                ].map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm text-navy-800">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-terracotta-600" aria-hidden />
                    {b}
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap gap-2.5">
                <Button
                  onClick={() => run("seller")}
                  className="bg-terracotta-600 hover:bg-terracotta-500"
                >
                  <Store className="size-4" aria-hidden />
                  Open Seller Studio
                </Button>
                <Button
                  variant="outline"
                  onClick={() => (authed ? setView("onboarding") : openAuthDialog({ mode: "signup" }))}
                  className="border-terracotta-500/40 text-terracotta-700 hover:bg-terracotta-50"
                >
                  Join as Manufacturer
                </Button>
              </div>
              <p className="mt-3 text-[11px] text-navy-600">
                Supplier network is a prototype — listings are unverified until
                documents are checked.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ================= 7. AI ≠ MAGIC ================= */}
      <section
        aria-labelledby="explain-heading"
        className="bg-forest-50 py-16 md:py-24"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="mx-auto max-w-3xl text-center"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-forest-600">
              AI ≠ Magic
            </p>
            <h2
              id="explain-heading"
              className="mt-3 text-3xl font-bold tracking-tight text-navy-950 md:text-4xl"
            >
              Designed for Explainable Decisions
            </h2>
            <p className="mt-5 text-base leading-relaxed text-navy-800 md:text-lg">
              PackVeda does not replace packaging scientists, laboratories, or
              regulatory authorities. It helps users move from a large set of
              possible packaging options to a smaller set of scientifically
              relevant candidates.
            </p>
          </motion.div>

          <div className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-3">
            {[
              {
                icon: SearchCheck,
                title: "Explainable logic",
                desc: "Every score traceable",
              },
              {
                icon: Database,
                title: "Honest data",
                desc: "Missing values shown as “Data not available”",
              },
              {
                icon: FlaskConical,
                title: "Validation-first",
                desc: "Trials before adoption",
              },
            ].map((card, i) => {
              const Icon = card.icon;
              return (
                <motion.div
                  key={card.title}
                  {...fadeUp}
                  transition={{ duration: 0.45, delay: i * 0.08, ease: "easeOut" }}
                  className="rounded-xl border border-forest-600/20 bg-white p-5 text-center shadow-sm"
                >
                  <span className="mx-auto flex size-10 items-center justify-center rounded-lg bg-forest-100 text-forest-700">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-3 text-sm font-semibold text-navy-950">
                    {card.title}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-navy-600">
                    {card.desc}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= 8. FINAL CTA ================= */}
      <section
        aria-labelledby="cta-heading"
        className="relative overflow-hidden bg-navy-950 bg-grid-navy py-20 md:py-28"
      >
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-400/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <motion.h2
            {...fadeUp}
            transition={{ duration: 0.55, ease: "easeOut" }}
            id="cta-heading"
            className="text-3xl font-bold tracking-tight text-cream-50 text-balance md:text-5xl"
          >
            From food characteristics to the right packaging — intelligently.
          </motion.h2>
          <motion.p
            {...fadeUp}
            transition={{ duration: 0.55, delay: 0.1, ease: "easeOut" }}
            className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-cream-100/70"
          >
            Describe your food and storage scenario — PackVeda derives the
            requirements, scores the materials and explains every result.
          </motion.p>
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.55, delay: 0.2, ease: "easeOut" }}
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            {authed ? (
              <>
                <Button
                  size="lg"
                  onClick={() => setView("analyze")}
                  className="bg-forest-600 text-white hover:bg-forest-500"
                >
                  Start Packaging Analysis
                  <ArrowRight className="size-4" aria-hidden />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setView("dashboard")}
                  className="border-white/25 bg-transparent text-cream-50 hover:bg-white/10 hover:text-cream-50"
                >
                  Go to Dashboard
                  <BarChart3 className="size-4" aria-hidden />
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="lg"
                  onClick={() => openAuthDialog({ mode: "signup" })}
                  className="bg-forest-600 text-white hover:bg-forest-500"
                >
                  Create Free Account
                  <ArrowRight className="size-4" aria-hidden />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => openAuthDialog({ mode: "signin" })}
                  className="border-white/25 bg-transparent text-cream-50 hover:bg-white/10 hover:text-cream-50"
                >
                  Sign In
                </Button>
              </>
            )}
          </motion.div>
        </div>
      </section>
    </div>
  );
}
