"use client";

import { motion } from "framer-motion";
import {
  Award,
  Database,
  FlaskConical,
  ListChecks,
  Mail,
  Quote,
  ShieldAlert,
} from "lucide-react";
import { MaturityBadge } from "@/components/shared/maturity-badge";
import { BackButton } from "@/components/shared/back-button";
import type { Maturity } from "@/components/shared/maturity-badge";

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
} as const;

// ---------------------------------------------------------------------------
// Feature maturity data
// ---------------------------------------------------------------------------

interface FeatureRow {
  feature: string;
  status: Maturity;
}

const FEATURES: FeatureRow[] = [
  { feature: "Recommendation engine", status: "available" },
  { feature: "Analysis wizard", status: "available" },
  { feature: "Comparison", status: "available" },
  { feature: "Scenario simulation", status: "available" },
  { feature: "Packaging Passport", status: "prototype" },
  { feature: "Trial & Validation", status: "prototype" },
  { feature: "Data Explorer", status: "available" },
  { feature: "QR traceability", status: "future" },
  { feature: "Supplier marketplace", status: "future" },
  { feature: "LLM natural-language explanations", status: "future" },
];

const APPROACH = [
  {
    icon: ListChecks,
    title: "Rules + data + explainability",
    desc: "A deterministic food-science rule set and curated packaging property data drive the engine — every requirement, filter and score is inspectable, never free-form generation.",
  },
  {
    icon: ShieldAlert,
    title: "No LLM fabrication",
    desc: "The planned LLM layer would only phrase natural-language explanations. It will never invent OTR/WVTR values, certifications or scientific facts.",
  },
  {
    icon: FlaskConical,
    title: "Validation-first",
    desc: "Every recommendation is a candidate for testing, not a verdict. Material verification, trials, shelf-life studies and expert approval come before adoption.",
  },
  {
    icon: Database,
    title: "Honest data",
    desc: "Indicative literature values are labelled and sourced per property. Missing properties display “Data not available” instead of a plausible-looking guess.",
  },
];

export default function AboutView() {
  return (
    <div className="bg-cream-50">
      <section
        aria-labelledby="about-heading"
        className="bg-cream-50 py-14 md:py-20"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* ---------- Header + mission ---------- */}
            <BackButton label="Back to Home" fallback="home" />
          <motion.header
            {...fadeUp}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="max-w-3xl"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-forest-600">
              About
            </p>
            <h1
              id="about-heading"
              className="mt-3 text-4xl font-bold tracking-tight text-navy-950 md:text-5xl"
            >
              About PackVeda
            </h1>
            <div className="mt-6 space-y-4 text-base leading-relaxed text-navy-700 md:text-lg">
              <p>
                PackVeda is an AI-based intelligent food packaging material
                recommendation system built for Smart India Hackathon 2026
                (Problem Statement 26236). It helps food businesses move from
                “which packaging should I use?” to a defensible, explainable
                shortlist — grounded in food-science rules and packaging
                property data, not guesswork.
              </p>
              <p>
                The name combines <span className="font-semibold text-navy-900">pack</span> and{" "}
                <span className="font-semibold text-navy-900">veda</span> — knowledge. That
                is the intent: packaged knowledge. Requirement derivation,
                constraint filtering, multi-criteria scoring and transparent
                reasoning, with validation built into the workflow and honesty
                built into the data.
              </p>
            </div>
          </motion.header>

          {/* ---------- Problem + Approach ---------- */}
          <div className="mt-14 grid gap-6 lg:grid-cols-2">
            <motion.div
              {...fadeUp}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="rounded-xl border border-border bg-card p-6 shadow-sm md:p-8"
            >
              <h2 className="text-xl font-semibold text-navy-950">
                The Problem We Address
              </h2>
              <blockquote className="mt-4 border-l-2 border-forest-600 pl-4">
                <p className="text-sm font-medium italic leading-relaxed text-forest-800">
                  “AI-Based Intelligent Food Packaging Material
                  Recommendation System”
                </p>
                <cite className="mt-1.5 block text-xs not-italic text-navy-600">
                  Smart India Hackathon 2026 — Problem Statement 26236
                </cite>
              </blockquote>
              <ul className="mt-5 space-y-3">
                {[
                  "Packaging requirements vary sharply with food composition (moisture, fat, pH, water activity), storage conditions and desired shelf life.",
                  "Choosing the wrong material leads to faster spoilage, quality loss and avoidable food waste.",
                  "Farmers, MSMEs and food startups often lack access to packaging scientists or reliable property data.",
                  "Manual datasheet comparison is slow, error-prone and hard to explain to stakeholders.",
                ].map((point) => (
                  <li
                    key={point}
                    className="flex items-start gap-2.5 text-sm leading-relaxed text-navy-700"
                  >
                    <span
                      aria-hidden
                      className="mt-1.5 size-1.5 shrink-0 rounded-full bg-forest-600"
                    />
                    {point}
                  </li>
                ))}
              </ul>
              <p className="mt-5 rounded-lg border border-forest-600/25 bg-forest-50 p-3.5 text-[13px] font-medium leading-relaxed text-forest-800">
                PS 26236 therefore calls for an intelligent, explainable
                recommendation system that shortlists suitable packaging
                materials — and flags where laboratory validation is still
                required.
              </p>
            </motion.div>

            <motion.div
              {...fadeUp}
              transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
              className="rounded-xl border border-border bg-card p-6 shadow-sm md:p-8"
            >
              <h2 className="text-xl font-semibold text-navy-950">
                Our Approach
              </h2>
              <ul className="mt-5 space-y-5">
                {APPROACH.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.title} className="flex items-start gap-3.5">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-forest-100 text-forest-700">
                        <Icon className="size-4.5" aria-hidden />
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold text-navy-950">
                          {item.title}
                        </h3>
                        <p className="mt-1 text-sm leading-relaxed text-navy-600">
                          {item.desc}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          </div>

          {/* ---------- Feature maturity ---------- */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="mt-14"
          >
            <h2 className="text-2xl font-bold tracking-tight text-navy-950">
              Feature Maturity
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-navy-600">
              An honest status for every module — no vapourware claims. What is
              marked “Available Now” runs end-to-end today; what is marked
              “Future Integration” does not exist yet.
            </p>
            <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
              <table className="w-full min-w-[480px] text-left text-sm">
                <caption className="sr-only">
                  PackVeda feature maturity status
                </caption>
                <thead>
                  <tr className="border-b border-border bg-cream-100/70">
                    <th
                      scope="col"
                      className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-navy-600"
                    >
                      Feature
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
                  {FEATURES.map((row, i) => (
                    <tr
                      key={row.feature}
                      className={
                        i % 2 === 1
                          ? "border-b border-border/70 bg-cream-50/60 last:border-b-0"
                          : "border-b border-border/70 last:border-b-0"
                      }
                    >
                      <td className="px-5 py-3 font-medium text-navy-800">
                        {row.feature}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <MaturityBadge status={row.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* ---------- Explainability quote ---------- */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="mx-auto mt-14 max-w-4xl rounded-xl border border-forest-600/20 bg-forest-50 p-8 text-center shadow-sm md:p-10"
          >
            <Quote
              className="mx-auto size-6 text-forest-600"
              aria-hidden
            />
            <h2 className="mt-4 text-xl font-semibold text-navy-950 md:text-2xl">
              Designed for Explainable Decisions
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-navy-800 md:text-lg">
              PackVeda does not replace packaging scientists, laboratories, or
              regulatory authorities. It helps users move from a large set of
              possible packaging options to a smaller set of scientifically
              relevant candidates.
            </p>
          </motion.div>

          {/* ---------- Contact / feedback ---------- */}
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="mx-auto mt-14 max-w-2xl rounded-xl border border-border bg-card p-6 text-center shadow-sm md:p-8"
          >
            <span className="mx-auto flex size-11 items-center justify-center rounded-lg bg-forest-100 text-forest-700">
              <Mail className="size-5" aria-hidden />
            </span>
            <h2 className="mt-4 text-lg font-semibold text-navy-950">
              Contact &amp; Feedback
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-navy-600">
              A dedicated feedback channel for food technologists, packaging
              engineers and hackathon evaluators is planned. For now, PackVeda
              is a prototype built for evaluation.
            </p>
            <div className="mt-4 flex justify-center">
              <MaturityBadge status="future" label="Coming Soon" />
            </div>
          </motion.div>

          {/* ---------- SIH footer note ---------- */}
          <motion.p
            {...fadeUp}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="mt-12 flex items-center justify-center gap-2 text-center text-xs text-navy-600"
          >
            <Award className="size-3.5 text-forest-600" aria-hidden />
            Built for Smart India Hackathon 2026 — Problem Statement 26236
          </motion.p>
        </div>
      </section>
    </div>
  );
}
