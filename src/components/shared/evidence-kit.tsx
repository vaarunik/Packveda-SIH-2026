"use client";

// PACKVEDA — Evidence & Sources UI kit.
// Compact, subtle components per the transparency spec: source-type badges,
// origin badges, confidence chips, inline evidence links, evidence cards,
// the coverage indicator, the regulatory check rows and the validation note.
// Kept deliberately quiet visually — the results page must not become a
// bibliography.

import { ExternalLink, FileWarning, Link2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SOURCE_CATEGORY_LABEL,
  type ConfidenceLevel,
  type SourceCategory,
  type SourceRecord,
} from "@/lib/data/sources";
import type { EvidenceItem, InfoOrigin, RegulatoryCheck, EvidenceCoverage } from "@/lib/evidence";

// ---------------------------------------------------------------------------
// Source-type badge — [FSSAI] [BIS] [SCIENTIFIC] [TECHNICAL] [DATABASE] …
// ---------------------------------------------------------------------------

const CATEGORY_STYLE: Record<SourceCategory, string> = {
  regulatory: "border-emerald-700/30 bg-emerald-50 text-emerald-800",
  standards: "border-teal-700/30 bg-teal-50 text-teal-800",
  scientific: "border-navy-700/25 bg-cream-100 text-navy-800",
  technical: "border-amber-700/30 bg-amber-50 text-amber-900",
  database: "border-forest-700/30 bg-forest-50 text-forest-800",
  validation: "border-purple-700/25 bg-purple-50 text-purple-900",
};

export function SourceTypeBadge({
  category,
  label,
  className,
}: {
  category: SourceCategory;
  /** Override the default short label (e.g. "FSSAI" from the record name) */
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wider",
        CATEGORY_STYLE[category],
        className
      )}
    >
      {label ?? category.toUpperCase()}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Origin badge — SOURCE-DERIVED / AI-INFERRED / USER PROVIDED / ESTIMATED
// ---------------------------------------------------------------------------

const ORIGIN_META: Record<InfoOrigin, { label: string; className: string }> = {
  source_derived: {
    label: "Source-derived",
    className: "border-forest-700/30 bg-forest-50 text-forest-800",
  },
  ai_inferred: {
    label: "AI-inferred",
    className: "border-navy-700/25 bg-cream-100 text-navy-800",
  },
  user_provided: {
    label: "User provided",
    className: "border-amber-700/30 bg-amber-50 text-amber-900",
  },
  estimated: {
    label: "Estimated / unavailable",
    className: "border-red-700/25 bg-red-50 text-red-800",
  },
};

export function OriginBadge({ origin, className }: { origin: InfoOrigin; className?: string }) {
  const meta = ORIGIN_META[origin];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold",
        meta.className,
        className
      )}
    >
      {meta.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Confidence chip — HIGH / MEDIUM / LOW
// ---------------------------------------------------------------------------

const CONFIDENCE_STYLE: Record<ConfidenceLevel, string> = {
  high: "text-forest-800 border-forest-600/30 bg-forest-50",
  medium: "text-amber-900 border-amber-600/30 bg-amber-50",
  low: "text-red-800 border-red-600/25 bg-red-50",
};

export function ConfidenceChip({
  level,
  className,
}: {
  level: ConfidenceLevel;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        CONFIDENCE_STYLE[level],
        className
      )}
    >
      <ShieldCheck className="size-3" aria-hidden />
      {level} confidence
    </span>
  );
}

// ---------------------------------------------------------------------------
// Inline evidence chip — "[Evidence: FSSAI]" beside a claim (spec §5)
// ---------------------------------------------------------------------------

export function InlineEvidence({
  sourceName,
  title,
  url,
  className,
}: {
  sourceName: string;
  title?: string;
  url?: string | null;
  className?: string;
}) {
  const content = (
    <>
      <Link2 className="size-3 shrink-0" aria-hidden />
      <span>
        Evidence: <span className="font-semibold">{sourceName}</span>
      </span>
    </>
  );
  const cls = cn(
    "inline-flex max-w-full items-center gap-1 rounded border border-navy-900/10 bg-white px-1.5 py-0.5 text-[10.5px] font-medium text-navy-700 transition-colors hover:border-forest-700/40 hover:text-forest-800",
    className
  );
  if (url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title={title ? `Open ${title}` : `Open ${sourceName}`}
        className={cls}
      >
        {content}
      </a>
    );
  }
  return (
    <span title={title ? `${sourceName} — ${title}` : sourceName} className={cn(cls, "cursor-help")}>
      {content}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Evidence card — the main per-source card (spec §1)
// ---------------------------------------------------------------------------

export function EvidenceCard({ record, usedFor }: { record: SourceRecord; usedFor: string }) {
  return (
    <div className="flex h-full flex-col rounded-xl border border-border bg-white p-4 transition-shadow hover:shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold leading-snug text-navy-950">{record.name}</h4>
          <p className="mt-0.5 text-[11px] leading-snug text-navy-600">{record.fullName}</p>
        </div>
        <SourceTypeBadge category={record.category} />
      </div>

      {record.title ? (
        <p className="mt-2.5 text-[12.5px] font-medium leading-relaxed text-navy-800">
          {record.title}
          {record.version ? (
            <span className="font-normal text-navy-600"> · {record.version}</span>
          ) : null}
          {record.publicationYear ? (
            <span className="font-normal text-navy-600"> · {record.publicationYear}</span>
          ) : null}
        </p>
      ) : null}

      <p className="mt-2 text-[12.5px] leading-relaxed text-navy-700">
        <span className="font-semibold text-navy-900">Used for: </span>
        {usedFor}
      </p>

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-3">
        <ConfidenceChip level={record.confidence} />
        {record.url ? (
          <a
            href={record.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-forest-700/30 bg-forest-50 px-2.5 py-1 text-[11px] font-semibold text-forest-800 transition-colors hover:bg-forest-100"
          >
            View Source
            <ExternalLink className="size-3" aria-hidden />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-md border border-amber-600/30 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-900">
            <FileWarning className="size-3" aria-hidden />
            Source unavailable — no public link recorded
          </span>
        )}
        <span className="ml-auto text-[10px] text-navy-500">
          Last checked {record.lastChecked}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Evidence coverage indicator (spec §16) — computed from real records only
// ---------------------------------------------------------------------------

export function EvidenceCoverageBar({ coverage }: { coverage: EvidenceCoverage }) {
  if (coverage.percent === null) {
    return (
      <div className="rounded-lg border border-amber-600/30 bg-amber-50 px-3 py-2.5">
        <p className="text-[12.5px] font-semibold text-amber-900">Evidence coverage: Limited</p>
        <p className="mt-0.5 text-[11.5px] leading-relaxed text-amber-900/85">
          Some material properties require supplier or laboratory verification.
        </p>
      </div>
    );
  }
  const blocks = 10;
  const filled = Math.max(0, Math.min(blocks, Math.round((coverage.percent / 100) * blocks)));
  return (
    <div className="rounded-lg border border-border bg-white px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12.5px] font-semibold text-navy-900">Evidence coverage</p>
        <p className="text-[11.5px] tabular-nums text-navy-700">
          Supported claims: {coverage.supported}/{coverage.total} · {coverage.percent}%
        </p>
      </div>
      <div
        className="mt-1.5 flex gap-0.5"
        role="img"
        aria-label={`Evidence coverage ${coverage.percent} percent — ${coverage.supported} of ${coverage.total} claims supported`}
      >
        {Array.from({ length: blocks }).map((_, i) => (
          <span
            key={i}
            aria-hidden
            className={cn(
              "h-2 flex-1 rounded-sm",
              i < filled ? "bg-forest-600" : "bg-cream-200"
            )}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Regulatory & Compliance row (spec §9) — never says "certified"
// ---------------------------------------------------------------------------

const REG_STATUS_STYLE: Record<RegulatoryCheck["status"], string> = {
  checked: "border-forest-600/30 bg-forest-50 text-forest-800",
  documentation_required: "border-amber-600/30 bg-amber-50 text-amber-900",
  pending_verification: "border-amber-600/30 bg-amber-50 text-amber-900",
  not_applicable: "border-navy-700/20 bg-cream-100 text-navy-600",
};

export function RegulatoryRow({ check }: { check: RegulatoryCheck }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-white p-4 sm:flex-row sm:items-start sm:gap-4">
      <div className="flex items-center gap-2.5 sm:w-44 sm:shrink-0">
        <SourceTypeBadge
          category={check.authority === "FSSAI" ? "regulatory" : "standards"}
          label={check.authority}
        />
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-semibold",
            REG_STATUS_STYLE[check.status]
          )}
        >
          {check.statusLabel}
        </span>
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-navy-950">{check.aspect}</p>
        <p className="mt-1 text-[12.5px] leading-relaxed text-navy-700">{check.detail}</p>
        {check.sourceIds.length > 0 && (
          <span className="mt-1.5 inline-block text-[10.5px] text-navy-500">
            {SOURCE_CATEGORY_LABEL[check.authority === "FSSAI" ? "regulatory" : "standards"]} · official portal
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Item origin row — the compact claim + value + origin card (spec §8)
// ---------------------------------------------------------------------------

export function EvidenceItemRow({ item }: { item: EvidenceItem }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-white px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <span className="text-[12.5px] font-semibold text-navy-950">{item.parameter}</span>
        <OriginBadge origin={item.origin} />
      </div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <span
          className={cn(
            "text-[12.5px] tabular-nums",
            item.value === null ? "text-red-800" : "font-medium text-navy-800"
          )}
        >
          {item.value ?? "Not available"}
        </span>
        {item.sourceIds.length > 0 && (
          <span className="text-[10.5px] text-navy-500">
            {item.sourceIds.length} source{item.sourceIds.length === 1 ? "" : "s"}
          </span>
        )}
      </div>
      {item.note ? (
        <p className="text-[11px] leading-relaxed text-navy-600">{item.note}</p>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Validation distinction note (spec §18) — visible but not intrusive
// ---------------------------------------------------------------------------

export function ValidationNote({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "rounded-lg border border-navy-900/10 bg-cream-100/70 px-3.5 py-2.5 text-[11.5px] leading-relaxed text-navy-700",
        className
      )}
    >
      AI recommendations are decision-support outputs. Final packaging suitability
      should be confirmed through appropriate physical testing, regulatory
      verification and product-specific validation.
    </p>
  );
}
