// PACKVEDA — Packaging Requirement Matching layer.
//
// Distinguishes RECOMMENDATION (engine ranking) from MATCHING (checking a
// material's declared properties against each derived packaging requirement).
// Works for knowledge-base materials AND seller-declared materials — the same
// thresholds as the deterministic engine are used, so no scores are invented.
//
// Seller-declared properties are labelled as such wherever displayed; missing
// values surface as "unverified" instead of being guessed.

import type { DerivedRequirement, AnalysisInput } from "@/lib/engine";
import type { Intensity } from "@/lib/data/types";
import { LEVEL_ORDER, otrThreshold, wvtrThreshold, tensileThreshold } from "@/lib/engine";

export type MatchStatus =
  | "match"
  | "partial"
  | "not_matched"
  | "unverified"
  | "not_applicable";

export interface MatchableMaterial {
  id: string;
  name: string;
  /** Where the property data comes from — affects labelling only, not logic */
  source: "knowledge_base" | "seller_declared";
  otr: number | null;
  wvtr: number | null;
  co2tr: number | null;
  tensileStrengthMPa: number | null;
  sealability: Intensity;
  aromaBarrier: Intensity;
  lightBlocking: Intensity;
  punctureResistance?: Intensity;
  tempMinC: number | null;
  tempMaxC: number | null;
  foodContactSuitable: boolean;
}

export interface RequirementMatch {
  key: DerivedRequirement["key"];
  label: string;
  requiredLabel: string;
  status: MatchStatus;
  explanation: string;
}

export const MATCH_STATUS_META: Record<
  MatchStatus,
  { label: string; icon: "check" | "partial" | "cross" | "help" | "minus" }
> = {
  match: { label: "Match", icon: "check" },
  partial: { label: "Partial Match", icon: "partial" },
  not_matched: { label: "Not Matched", icon: "cross" },
  unverified: { label: "Verification Required", icon: "help" },
  not_applicable: { label: "Not Required", icon: "minus" },
};

/** Ratio-based verdict for "lower transmission is better" properties. */
function transmissionStatus(
  actual: number | null,
  threshold: number
): { status: MatchStatus; detail: string } {
  if (actual === null) {
    return {
      status: "unverified",
      detail: "Property value not available — cannot verify against the requirement.",
    };
  }
  if (threshold === Infinity) {
    return { status: "match", detail: "No specific barrier requirement for this product." };
  }
  const ratio = threshold / Math.max(actual, 1e-6);
  if (ratio >= 1) {
    return { status: "match", detail: `Meets the requirement threshold.` };
  }
  if (ratio >= 0.34) {
    return {
      status: "partial",
      detail: `Below the required threshold — may still be workable with design changes (e.g. thicker gauge, added barrier layer). Verify by testing.`,
    };
  }
  return {
    status: "not_matched",
    detail: `Does not meet the required threshold by a wide margin.`,
  };
}

function capabilityStatus(
  actual: Intensity,
  required: Intensity
): { status: MatchStatus; detail: string } {
  if (required === "none") {
    return { status: "not_applicable", detail: "No requirement set for this product." };
  }
  const a = LEVEL_ORDER[actual];
  const r = LEVEL_ORDER[required];
  if (a >= r) return { status: "match", detail: `Capability meets the requirement.` };
  if (a === r - 1) {
    return {
      status: "partial",
      detail: `One level below the requirement — acceptable only after verification.`,
    };
  }
  return { status: "not_matched", detail: `Capability is below the requirement.` };
}

/**
 * Check one material against every derived packaging requirement.
 * Deterministic — no scores invented; missing data => "unverified".
 */
export function computeRequirementMatches(
  requirements: DerivedRequirement[],
  material: MatchableMaterial,
  input?: Pick<AnalysisInput, "storageTempC" | "storageType">
): RequirementMatch[] {
  return requirements.map((req) => {
    const base = { key: req.key, label: req.label, requiredLabel: req.level };

    switch (req.key) {
      case "moisture": {
        if (req.level === "none") {
          return { ...base, status: "not_applicable" as MatchStatus, explanation: "No moisture-barrier requirement set." };
        }
        const t = wvtrThreshold(req.level as Intensity);
        const r = transmissionStatus(material.wvtr, t);
        return {
          ...base,
          status: r.status,
          explanation:
            material.wvtr !== null
              ? `${r.detail} (WVTR ≈ ${material.wvtr} g/m²/day ${r.status === "match" ? "≤" : "vs"} required ≤ ${t}).`
              : r.detail,
        };
      }

      case "oxygen": {
        if (req.level === "exchange") {
          if (material.otr === null) {
            return {
              ...base,
              status: "unverified" as MatchStatus,
              explanation: "Gas-exchange behaviour not verifiable — OTR data not provided.",
            };
          }
          if (material.otr > 100) {
            return {
              ...base,
              status: "match" as MatchStatus,
              explanation: `Permits O₂/CO₂ exchange needed by respiring produce (OTR ≈ ${material.otr}). Verify with MAP trials.`,
            };
          }
          return {
            ...base,
            status: "not_matched" as MatchStatus,
            explanation: "High-barrier material blocks the gas exchange respiring produce needs.",
          };
        }
        if (req.level === "none") {
          return { ...base, status: "not_applicable" as MatchStatus, explanation: "No oxygen-barrier requirement set." };
        }
        const t = otrThreshold(req.level as Intensity);
        const r = transmissionStatus(material.otr, t);
        return {
          ...base,
          status: r.status,
          explanation:
            material.otr !== null
              ? `${r.detail} (OTR ≈ ${material.otr} cc/m²/day ${r.status === "match" ? "≤" : "vs"} required ≤ ${t}).`
              : r.detail,
        };
      }

      case "co2": {
        if (material.otr === null) {
          return {
            ...base,
            status: "unverified" as MatchStatus,
            explanation: "CO₂ management cannot be assessed — OTR data not provided.",
          };
        }
        if (material.otr > 100) {
          return {
            ...base,
            status: "match" as MatchStatus,
            explanation: "Breathable structure helps vent respiratory CO₂ (verify with MAP trials).",
          };
        }
        return {
          ...base,
          status: "partial" as MatchStatus,
          explanation: "High-barrier structure may trap CO₂ — only suitable with engineered MAP.",
        };
      }

      case "light": {
        const r = capabilityStatus(material.lightBlocking, req.level as Intensity);
        return { ...base, status: r.status, explanation: r.detail };
      }

      case "aroma": {
        const r = capabilityStatus(material.aromaBarrier, req.level as Intensity);
        return { ...base, status: r.status, explanation: r.detail };
      }

      case "mechanical": {
        if (req.level === "none") {
          return { ...base, status: "not_applicable" as MatchStatus, explanation: "No mechanical requirement set." };
        }
        const tensile = material.tensileStrengthMPa;
        const tensileR =
          tensile === null
            ? null
            : transmissionStatus(tensile, tensileThreshold(req.level as Intensity));
        const punctureR = material.punctureResistance
          ? capabilityStatus(material.punctureResistance, req.level as Intensity)
          : null;
        if (!tensileR && !punctureR) {
          return {
            ...base,
            status: "unverified" as MatchStatus,
            explanation: "Strength data not available — cannot verify against the requirement.",
          };
        }
        const best =
          tensileR && punctureR
            ? rankStatus(tensileR.status) <= rankStatus(punctureR.status)
              ? tensileR
              : punctureR
            : (tensileR ?? punctureR)!;
        return {
          ...base,
          status: best.status,
          explanation:
            tensile !== null && best === tensileR
              ? `${best.detail} (Tensile ≈ ${tensile} MPa.)`
              : best.detail,
        };
      }

      case "seal": {
        const r = capabilityStatus(material.sealability, req.level as Intensity);
        return { ...base, status: r.status, explanation: r.detail };
      }

      case "thermal": {
        if (material.tempMinC === null) {
          return {
            ...base,
            status: "unverified" as MatchStatus,
            explanation: "Service temperature range not provided — verification required.",
          };
        }
        const temp = input?.storageTempC;
        if (temp === undefined) {
          return { ...base, status: "unverified" as MatchStatus, explanation: "Storage temperature unknown." };
        }
        if (temp >= material.tempMinC) {
          return {
            ...base,
            status: "match" as MatchStatus,
            explanation: `Service range covers storage at ${temp} °C (declared min ${material.tempMinC} °C).`,
          };
        }
        return {
          ...base,
          status: "not_matched" as MatchStatus,
          explanation: `Service range (declared min ${material.tempMinC} °C) does not cover storage at ${temp} °C.`,
        };
      }

      default: {
        return {
          ...base,
          status: "unverified" as MatchStatus,
          explanation: "Not assessed by the matching rules.",
        };
      }
    }
  });
}

const RANK: Record<MatchStatus, number> = {
  match: 0,
  partial: 1,
  unverified: 2,
  not_applicable: 2.5,
  not_matched: 3,
};

export function rankStatus(s: MatchStatus): number {
  return RANK[s];
}

/** Aggregate summary used for sorting/labels — still not a fabricated score. */
export function matchSummary(matches: RequirementMatch[]) {
  const counts = { match: 0, partial: 0, not_matched: 0, unverified: 0, not_applicable: 0 };
  for (const m of matches) counts[m.status] += 1;
  return counts;
}

/** Convert a Prisma SupplierMaterial row into the matchable shape. */
export function supplierMaterialToMatchable(row: {
  id: string;
  materialName: string;
  otr: number | null;
  wvtr: number | null;
  co2tr: number | null;
  tensileStrengthMPa: number | null;
  sealability: string;
  aromaBarrier: string;
  lightBlocking: string;
  tempMinC: number | null;
  tempMaxC: number | null;
  foodContactSuitable: boolean;
}): MatchableMaterial {
  const asIntensity = (v: string): Intensity =>
    (["none", "low", "moderate", "high", "very_high"] as const).includes(v as Intensity)
      ? (v as Intensity)
      : "moderate";
  return {
    id: row.id,
    name: row.materialName,
    source: "seller_declared",
    otr: row.otr,
    wvtr: row.wvtr,
    co2tr: row.co2tr,
    tensileStrengthMPa: row.tensileStrengthMPa,
    sealability: asIntensity(row.sealability),
    aromaBarrier: asIntensity(row.aromaBarrier),
    lightBlocking: asIntensity(row.lightBlocking),
    tempMinC: row.tempMinC,
    tempMaxC: row.tempMaxC,
    foodContactSuitable: row.foodContactSuitable,
  };
}
