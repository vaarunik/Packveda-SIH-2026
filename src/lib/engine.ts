// PACKVEDA — Deterministic, explainable recommendation engine.
//
// Pipeline: user inputs → derived packaging requirements (food-science rules)
//   → hard-constraint filtering → multi-criteria scoring → explainable output.
//
// IMPORTANT DESIGN RULES
// - This engine is deterministic rule-based decision support. It does NOT call
//   any LLM and does NOT invent property values. All material properties come
//   from src/lib/data/materials.ts with provenance.
// - Scores are relative compatibility indicators for shortlisting candidates,
//   NOT guarantees of shelf life or regulatory compliance.

import {
  COMMODITIES,
  COMMODITY_CATEGORY_LABELS,
} from "./data/commodities";
import { MATERIALS } from "./data/materials";
import { Commodity, Intensity, PackagingMaterial } from "./data/types";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type Importance = "none" | "low" | "medium" | "high";

export interface AnalysisInput {
  commodityId: string;
  commodityName: string;
  foodCategory: string; // label string, e.g. "Spice / Masala"
  processing: "fresh" | "processed";
  moisturePercent: number;
  fatPercent: number;
  ph: number;
  waterActivity: number | null;
  respiration: Intensity;
  oxygenSensitivity: Intensity;
  aromaSensitivity: Intensity;
  lightSensitivity: Intensity;
  hygroscopic: boolean;
  fragile: boolean;
  targetShelfLifeDays: number;
  storageTempC: number;
  storageRH: number;
  storageType: "ambient" | "chilled" | "frozen" | "cold_chain";
  transportDurationDays: number;
  transportMode: "road" | "rail" | "sea" | "air" | "multimodal";
  handlingIntensity: "gentle" | "normal" | "rough";
  lightExposure: "none" | "partial" | "direct";
  priorities: {
    cost: Importance;
    sustainability: Importance;
    barrier: Importance;
    shelfLife: Importance;
    mechanical: Importance;
  };
}

export type RequirementKey =
  | "moisture"
  | "oxygen"
  | "co2"
  | "light"
  | "aroma"
  | "mechanical"
  | "seal"
  | "thermal";

export interface DerivedRequirement {
  key: RequirementKey;
  label: string;
  /** For barrier-style requirements: none/low/moderate/high/very_high; for oxygen 'exchange' means O2/CO2 exchange needed */
  level: Intensity | "exchange";
  unitNote?: string;
  rationale: string;
}

export interface ScoreBreakdown {
  barrier: number; // 0..1
  shelfLife: number;
  mechanical: number;
  cost: number;
  sustainability: number;
  availability: number;
}

export interface CandidateResult {
  materialId: string;
  materialName: string;
  score: number; // 0..100 overall compatibility (engine score)
  status: "recommended" | "viable" | "excluded";
  rank: number; // 1..N among non-excluded; excluded get -1
  breakdown: ScoreBreakdown;
  matches: string[]; // why it fits
  gaps: string[]; // why it scored lower / cautions
  exclusionReasons: string[]; // hard constraint failures
}

export interface EngineOutput {
  requirements: DerivedRequirement[];
  candidates: CandidateResult[];
  recommended: CandidateResult | null;
  weights: Record<string, number>;
  engineMeta: {
    engineVersion: string;
    generatedAt: string;
    inputsSummary: Record<string, string>;
    filtersApplied: string[];
    disclaimer: string;
  };
}

const ENGINE_VERSION = "packveda-rules-1.0.0";
export const ENGINE_DISCLAIMER =
  "PackVeda provides decision support based on food-science rules and indicative packaging property data. Scores are relative compatibility indicators for shortlisting. Laboratory testing and expert validation are required before commercial adoption.";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export const LEVEL_ORDER: Record<Intensity, number> = {
  none: 0,
  low: 1,
  moderate: 2,
  high: 3,
  very_high: 4,
};

const LEVEL_LABEL: Record<Intensity, string> = {
  none: "none",
  low: "low",
  moderate: "moderate",
  high: "high",
  very_high: "very high",
};

function maxLevel(a: Intensity, b: Intensity): Intensity {
  return LEVEL_ORDER[a] >= LEVEL_ORDER[b] ? a : b;
}

function bumpLevel(level: Intensity, steps: number): Intensity {
  const idx = Math.min(4, Math.max(0, LEVEL_ORDER[level] + steps));
  return (Object.keys(LEVEL_ORDER) as Intensity[]).find(
    (k) => LEVEL_ORDER[k] === idx
  ) as Intensity;
}

/** Max permitted transmission rate by required barrier level. */
export function otrThreshold(level: Intensity): number {
  switch (level) {
    case "very_high":
      return 2;
    case "high":
      return 20;
    case "moderate":
      return 100;
    case "low":
      return 1500;
    default:
      return Infinity;
  }
}

export function wvtrThreshold(level: Intensity): number {
  switch (level) {
    case "very_high":
      return 1.5;
    case "high":
      return 3;
    case "moderate":
      return 10;
    case "low":
      return 25;
    default:
      return Infinity;
  }
}

export function tensileThreshold(level: Intensity): number {
  switch (level) {
    case "very_high":
      return 100;
    case "high":
      return 50;
    case "moderate":
      return 25;
    case "low":
      return 10;
    default:
      return 0;
  }
}

/**
 * Fit score for a "lower transmission is better" property.
 * ratio = permitted threshold / actual transmission.
 */
function transmissionFit(actual: number | null, threshold: number): number {
  if (actual === null) return 0; // cannot verify => no credit, flagged in gaps
  if (threshold === Infinity) return 0.75; // no requirement: neutral credit
  const ratio = threshold / Math.max(actual, 1e-6);
  if (ratio >= 1) return Math.min(1, 0.78 + 0.22 * Math.min(1, ratio / 10));
  return Math.max(0, ratio * 0.75); // partial credit below threshold
}

/** Fit score for rank-based capabilities (aroma, light, seal, puncture). */
function capabilityFit(actual: Intensity, required: Intensity): number {
  if (required === "none") return 0.75;
  const ratio = LEVEL_ORDER[actual] / Math.max(1, LEVEL_ORDER[required]);
  if (ratio >= 1) return 1;
  return Math.max(0, ratio * 0.7);
}

function fmtNum(n: number): string {
  if (n >= 100) return n.toFixed(0);
  if (n >= 1) return n.toFixed(1);
  return n.toFixed(2);
}

// ---------------------------------------------------------------------------
// Requirement derivation (food-science rules)
// ---------------------------------------------------------------------------

export function deriveRequirements(
  input: AnalysisInput,
  commodity: Commodity | null
): DerivedRequirement[] {
  const req: DerivedRequirement[] = [];
  const shelf = input.targetShelfLifeDays;
  const longShelf = shelf >= 180;
  const veryLongShelf = shelf >= 270;

  // ---- Moisture barrier ----
  let moisture: Intensity = "moderate";
  let moistureWhy = "";
  if (input.respiration === "high" || input.respiration === "very_high") {
    moisture = "low";
    moistureWhy =
      "Fresh, respiring produce needs breathable packaging; only a low moisture-tightness requirement is set to limit condensation and drying.";
  } else if (input.storageType === "frozen" || input.storageTempC <= 0) {
    moisture = "high";
    moistureWhy =
      "Frozen storage: sublimation inside the pack causes freezer burn, so a high moisture barrier and strong seals are required.";
  } else if (input.processing === "processed" && input.moisturePercent <= 5) {
    moisture = "very_high";
    moistureWhy = `Very low moisture content (${input.moisturePercent}%): even small moisture pickup changes texture/stability, so a very high moisture barrier is required.`;
  } else if (input.processing === "processed" && input.moisturePercent <= 15) {
    moisture = "high";
    moistureWhy = `Low-moisture processed food (${input.moisturePercent}% moisture${input.hygroscopic ? ", hygroscopic" : ""}): strong moisture barrier needed to prevent caking, mould and quality loss.`;
  } else if (input.moisturePercent <= 40) {
    moisture = "moderate";
    moistureWhy = `Intermediate-moisture food (${input.moisturePercent}%): a moderate moisture barrier helps balance drying and condensation.`;
  } else {
    moisture = "low";
    moistureWhy =
      "High-moisture food; primary concerns are gas exchange/condensation rather than absolute moisture-tightness.";
  }
  if (input.storageRH >= 75 && moisture !== "low") {
    moisture = bumpLevel(moisture, 1);
    moistureWhy += ` High storage RH (${input.storageRH}%) increases moisture uptake risk — requirement raised one level.`;
  }
  if (veryLongShelf && moisture !== "very_high" && moisture !== "low") {
    moisture = bumpLevel(moisture, 1);
    moistureWhy += ` Long shelf-life target (${shelf} days) — requirement raised one level.`;
  }
  req.push({
    key: "moisture",
    label: "Moisture barrier",
    level: moisture,
    unitNote: "max WVTR: see level mapping",
    rationale: moistureWhy,
  });

  // ---- Oxygen ----
  let oxygen: Intensity | "exchange";
  let oxygenWhy: string;
  if (input.respiration === "high" || input.respiration === "very_high") {
    oxygen = "exchange";
    oxygenWhy = `Respiring produce (respiration: ${input.respiration.replace("_", " ")}) consumes O₂ and releases CO₂. Packaging must allow gas exchange; high-barrier materials are excluded unless engineered for MAP.`;
  } else if (input.fatPercent >= 30) {
    oxygen = "very_high";
    oxygenWhy = `Very high fat content (${input.fatPercent}%): oxidation/rancidity is the dominant spoilage route — very high oxygen barrier required${input.oxygenSensitivity !== "none" ? `, consistent with the commodity's ${input.oxygenSensitivity.replace("_", " ")} oxygen sensitivity` : ""}.`;
  } else if (input.fatPercent >= 8) {
    oxygen = "high";
    oxygenWhy = `Significant fat content (${input.fatPercent}%): strong oxygen barrier needed to slow oxidative rancidity.`;
  } else if (input.fatPercent >= 3) {
    oxygen = "moderate";
    oxygenWhy = `Moderate fat content (${input.fatPercent}%): a moderate oxygen barrier is advisable.`;
  } else {
    oxygen = input.oxygenSensitivity === "none" ? "low" : "low";
    oxygenWhy =
      "Low fat content; oxygen barrier requirement is modest and driven mainly by the commodity sensitivity profile.";
  }
  const sensOxy = LEVEL_ORDER[input.oxygenSensitivity];
  if (oxygen !== "exchange" && sensOxy >= LEVEL_ORDER.high && LEVEL_ORDER[oxygen] < sensOxy - 1) {
    oxygen = bumpLevel(oxygen, sensOxy - 1 - LEVEL_ORDER[oxygen]);
    oxygenWhy += ` Commodity marked ${input.oxygenSensitivity.replace("_", " ")} oxygen sensitive — requirement aligned.`;
  }
  if (oxygen !== "exchange" && longShelf && LEVEL_ORDER[oxygen] < 3) {
    oxygen = bumpLevel(oxygen, 1);
    oxygenWhy += ` Long shelf-life target (${shelf} days) raises oxygen-barrier need.`;
  }
  req.push({
    key: "oxygen",
    label: "Oxygen barrier",
    level: oxygen,
    unitNote: "max OTR: see level mapping",
    rationale: oxygenWhy,
  });

  // ---- CO2 management ----
  if (input.respiration !== "none" && LEVEL_ORDER[input.respiration] >= 2) {
    req.push({
      key: "co2",
      label: "CO₂ management",
      level: "exchange",
      rationale: `Respiration releases CO₂. Accumulated CO₂ can damage produce; consider breathable films or MAP trials matched to the respiration rate.`,
    });
  }

  // ---- Light protection ----
  let light: Intensity = input.lightSensitivity;
  let lightWhy =
    input.lightSensitivity === "none"
      ? "Commodity is not strongly light sensitive."
      : `Commodity light sensitivity: ${input.lightSensitivity.replace("_", " ")}.`;
  if (input.lightExposure === "direct" && LEVEL_ORDER[light] < 3) {
    light = bumpLevel(light, 1);
    lightWhy += " Direct light exposure during transport/storage raises the requirement.";
  } else if (input.lightExposure === "partial" && LEVEL_ORDER[light] < 2) {
    light = bumpLevel(light, 1);
    lightWhy += " Partial light exposure raises the requirement.";
  }
  if (input.fatPercent >= 20 && LEVEL_ORDER[light] < 2) {
    light = bumpLevel(light, 1);
    lightWhy += ` High fat content (${input.fatPercent}%) is vulnerable to light-induced oxidation.`;
  }
  req.push({
    key: "light",
    label: "Light protection",
    level: light,
    rationale: lightWhy,
  });

  // ---- Aroma ----
  const aroma = input.aromaSensitivity;
  req.push({
    key: "aroma",
    label: "Aroma protection",
    level: aroma,
    rationale:
      aroma === "none" || aroma === "low"
        ? "Aroma retention is not a primary driver for this commodity."
        : `Commodity aroma sensitivity: ${aroma.replace("_", " ")} — packaging should retain desirable aromas and block foreign odours.`,
  });

  // ---- Mechanical ----
  let mech: Intensity = input.fragile ? "high" : "moderate";
  let mechWhy = input.fragile
    ? "Fragile product: packaging must protect against crushing and impact."
    : "Baseline mechanical protection for normal distribution.";
  if (input.handlingIntensity === "rough") {
    mech = bumpLevel(mech, 1);
    mechWhy += " Rough handling expected — requirement raised.";
  }
  if (input.transportDurationDays >= 7) {
    mech = bumpLevel(mech, 1);
    mechWhy += ` Long transit (${input.transportDurationDays} days) adds handling cycles — requirement raised.`;
  }
  if (input.transportMode === "sea" || input.transportMode === "multimodal") {
    mech = bumpLevel(mech, 1);
    mechWhy += " Sea/multimodal transport involves stacking and humidity swings — requirement raised.";
  }
  if (mech === "low") mech = "low";
  req.push({
    key: "mechanical",
    label: "Mechanical strength",
    level: mech,
    rationale: mechWhy,
  });

  // ---- Sealability ----
  let seal: Intensity = "moderate";
  let sealWhy = "Standard seal integrity for distribution.";
  if (
    input.hygroscopic ||
    input.moisturePercent <= 15 ||
    input.storageType === "frozen" ||
    longShelf
  ) {
    seal = "high";
    sealWhy =
      "Low-moisture/hygroscopic food, frozen storage or long shelf life: high seal integrity is important to keep the barrier effective.";
  }
  if (input.processing === "processed" && input.moisturePercent <= 5) {
    seal = "very_high";
    sealWhy = "Very dry product: hermetic sealing is essential to protect the moisture barrier function.";
  }
  req.push({
    key: "seal",
    label: "Sealability",
    level: seal,
    rationale: sealWhy,
  });

  // ---- Thermal suitability ----
  let thermalWhy: string;
  const thermalLevel: Intensity =
    input.storageType === "frozen" || input.storageTempC <= 0
      ? "high"
      : input.storageType === "chilled" || input.storageType === "cold_chain"
        ? "moderate"
        : "low";
  thermalWhy = `Storage at ${input.storageTempC} °C (${input.storageType.replace("_", " ")}): material must remain functional across this range${
    input.transportDurationDays >= 7 ? ` and during ${input.transportDurationDays}-day transit` : ""
  }.`;
  if (commodity?.chillingSensitive && input.storageTempC < (commodity.minSafeStorageTempC ?? -Infinity)) {
    thermalWhy += ` Note: ${commodity.name} is chilling sensitive — consider raising storage temperature above ~${commodity.minSafeStorageTempC} °C (packaging cannot prevent chilling injury).`;
  }
  req.push({
    key: "thermal",
    label: "Temperature suitability",
    level: thermalLevel,
    rationale: thermalWhy,
  });

  return req;
}

// ---------------------------------------------------------------------------
// Constraint filtering + scoring
// ---------------------------------------------------------------------------

function materialPassesBreathability(m: PackagingMaterial): boolean {
  // For respiring produce, exclude high-barrier materials (OTR ≤ 100)
  return m.otr === null || m.otr > 100;
}

function temperatureReasons(
  m: PackagingMaterial,
  input: AnalysisInput
): string[] {
  const reasons: string[] = [];
  if (m.tempMinC !== null && input.storageTempC < m.tempMinC) {
    reasons.push(
      `Service temperature range does not cover storage at ${input.storageTempC} °C (indicative min ${m.tempMinC} °C).`
    );
  }
  return reasons;
}

function computeWeights(input: AnalysisInput): Record<string, number> {
  const p = input.priorities;
  const raw = {
    barrier:
      p.barrier === "none" ? 0.4 : p.barrier === "low" ? 1 : p.barrier === "medium" ? 2 : 3,
    shelfLife:
      p.shelfLife === "none" ? 0.4 : p.shelfLife === "low" ? 1 : p.shelfLife === "medium" ? 2 : 3,
    mechanical:
      p.mechanical === "none" ? 0.4 : p.mechanical === "low" ? 1 : p.mechanical === "medium" ? 2 : 3,
    cost: p.cost === "none" ? 0.4 : p.cost === "low" ? 1 : p.cost === "medium" ? 2 : 3,
    sustainability:
      p.sustainability === "none"
        ? 0.4
        : p.sustainability === "low"
          ? 1
          : p.sustainability === "medium"
            ? 2
            : 3,
  };
  const total = Object.values(raw).reduce((a, b) => a + b, 0);
  const weights: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw)) weights[k] = v / total;
  return weights;
}

export function runEngine(input: AnalysisInput): EngineOutput {
  const commodity = COMMODITIES.find((c) => c.id === input.commodityId) ?? null;
  const requirements = deriveRequirements(input, commodity);
  const get = (k: RequirementKey) =>
    requirements.find((r) => r.key === k)! as DerivedRequirement;
  const moistureReq = get("moisture");
  const oxygenReq = get("oxygen");
  const lightReq = get("light");
  const aromaReq = get("aroma");
  const mechReq = get("mechanical");
  const sealReq = get("seal");
  const weights = computeWeights(input);
  const filtersApplied: string[] = [];

  const candidates: CandidateResult[] = MATERIALS.map((m) => {
    const matches: string[] = [];
    const gaps: string[] = [];
    const exclusionReasons: string[] = [];

    // ---- Hard constraints ----
    if (!m.foodContactSuitable) {
      exclusionReasons.push("Food-contact suitability not established for this material class.");
    }
    exclusionReasons.push(...temperatureReasons(m, input));
    if (oxygenReq.level === "exchange" && !materialPassesBreathability(m)) {
      exclusionReasons.push(
        "Product requires O₂/CO₂ exchange (respiring produce) — high-barrier material excluded from primary-pack candidates."
      );
    }

    // ---- Fits ----
    const wvtrFit = transmissionFit(m.wvtr, wvtrThreshold(moistureReq.level as Intensity));
    const otrFit =
      oxygenReq.level === "exchange"
        ? 1 // breathable materials get full credit; non-breathable excluded above
        : transmissionFit(m.otr, otrThreshold(oxygenReq.level as Intensity));
    const lightFit = capabilityFit(m.lightBlocking, lightReq.level as Intensity);
    const aromaFit = capabilityFit(m.aromaBarrier, aromaReq.level as Intensity);
    const tensileFit = transmissionFit(
      m.tensileStrengthMPa === null ? null : m.tensileStrengthMPa,
      tensileThreshold(mechReq.level as Intensity)
    );
    const mechFit = Math.max(
      tensileFit,
      capabilityFit(m.punctureResistance, mechReq.level as Intensity)
    );
    const sealFit = capabilityFit(m.sealability, sealReq.level as Intensity);

    const tempOk =
      m.tempMinC === null || input.storageTempC >= m.tempMinC;
    const tempMargin = tempOk
      ? 1
      : 0;

    const barrierAvg = (wvtrFit + otrFit + lightFit + aromaFit) / 4;
    const shelfFit = (barrierAvg + sealFit) / 2;
    const costScore = (6 - m.relativeCostIndex) / 5;
    const sustainScore = m.sustainability.score;
    const availabilityScore = capabilityFit(m.availability, "moderate");

    const breakdown: ScoreBreakdown = {
      barrier: barrierAvg,
      shelfLife: shelfFit,
      mechanical: mechFit,
      cost: costScore,
      sustainability: sustainScore,
      availability: availabilityScore,
    };

    const weighted =
      weights.barrier * barrierAvg +
      weights.shelfLife * shelfFit +
      weights.mechanical * mechFit +
      weights.cost * costScore +
      weights.sustainability * sustainScore;
    const wSum =
      weights.barrier +
      weights.shelfLife +
      weights.mechanical +
      weights.cost +
      weights.sustainability;
    let score = (weighted / wSum) * 100;
    score *= 0.9 + 0.1 * availabilityScore;
    score *= tempOk ? 1 : 0.5; // temperature mismatch drags score if not excluded
    const finalScore = Math.round(Math.max(0, Math.min(100, score)) * 10) / 10;

    // ---- Matches (why it fits) ----
    if (moistureReq.level !== "none") {
      if (m.wvtr !== null && m.wvtr <= wvtrThreshold(moistureReq.level as Intensity)) {
        matches.push(
          `Meets ${LEVEL_LABEL[moistureReq.level as Intensity]} moisture-protection requirement (WVTR ≈ ${fmtNum(m.wvtr)} g/m²/day vs required ≤ ${fmtNum(wvtrThreshold(moistureReq.level as Intensity))}).`
        );
      } else if (moistureReq.level === "low") {
        matches.push("Adequate for the low moisture-tightness requirement of this product.");
      } else {
        gaps.push(
          m.wvtr === null
            ? "Moisture barrier data not available — cannot verify against requirement."
            : `Moisture barrier likely insufficient: WVTR ≈ ${fmtNum(m.wvtr)} g/m²/day vs required ≤ ${fmtNum(wvtrThreshold(moistureReq.level as Intensity))}.`
        );
      }
    }
    if (oxygenReq.level === "exchange") {
      matches.push("Permits O₂/CO₂ exchange needed by respiring produce (verify with MAP trials).");
    } else if (oxygenReq.level !== "none") {
      if (m.otr !== null && m.otr <= otrThreshold(oxygenReq.level as Intensity)) {
        matches.push(
          `Meets ${LEVEL_LABEL[oxygenReq.level as Intensity]} oxygen-barrier requirement (OTR ≈ ${fmtNum(m.otr)} cc/m²/day vs required ≤ ${fmtNum(otrThreshold(oxygenReq.level as Intensity))}).`
        );
      } else if (oxygenReq.level === "low") {
        matches.push("Adequate for the low oxygen-barrier requirement of this product.");
      } else {
        gaps.push(
          m.otr === null
            ? "Oxygen barrier data not available — cannot verify against requirement."
            : `Oxygen barrier below requirement: OTR ≈ ${fmtNum(m.otr)} cc/m²/day vs required ≤ ${fmtNum(otrThreshold(oxygenReq.level as Intensity))}.`
        );
      }
    }
    if ((lightReq.level as Intensity) !== "none" && LEVEL_ORDER[m.lightBlocking] >= LEVEL_ORDER[lightReq.level as Intensity]) {
      matches.push(
        `Provides ${LEVEL_LABEL[m.lightBlocking]} light protection (required: ${LEVEL_LABEL[lightReq.level as Intensity]}).`
      );
    } else if ((lightReq.level as Intensity) !== "none") {
      gaps.push(
        `Light protection limited: ${LEVEL_LABEL[m.lightBlocking]} vs required ${LEVEL_LABEL[lightReq.level as Intensity]}.`
      );
    }
    if ((aromaReq.level as Intensity) !== "none" && LEVEL_ORDER[m.aromaBarrier] >= LEVEL_ORDER[aromaReq.level as Intensity]) {
      matches.push(`Aroma barrier compatible with commodity sensitivity (${LEVEL_LABEL[aromaReq.level as Intensity]}).`);
    } else if (LEVEL_ORDER[aromaReq.level as Intensity] >= 3) {
      gaps.push(
        `Aroma barrier limited (${LEVEL_LABEL[m.aromaBarrier]}) for a highly aroma-sensitive product.`
      );
    }
    if (tempOk && input.storageTempC < 5) {
      matches.push(
        `Service range covers frozen/chilled storage at ${input.storageTempC} °C (indicative min ${m.tempMinC} °C).`
      );
    } else if (tempOk && input.storageTempC >= 5) {
      matches.push(
        `Compatible with storage at ${input.storageTempC} °C (service range ${m.tempMinC}–${m.tempMaxC} °C).`
      );
    }
    if (LEVEL_ORDER[m.sealability] >= LEVEL_ORDER[sealReq.level as Intensity]) {
      matches.push(`Sealability meets the ${LEVEL_LABEL[sealReq.level as Intensity]} seal-integrity requirement.`);
    } else {
      gaps.push(`Sealability below the ${LEVEL_LABEL[sealReq.level as Intensity]} requirement — seal design will need attention.`);
    }
    if (shelfFit >= 0.8) {
      matches.push(
        `Barrier profile consistent with the ${input.targetShelfLifeDays}-day shelf-life target (engine estimate).`
      );
    } else if (shelfFit < 0.6) {
      gaps.push(
        `Barrier profile may not support the ${input.targetShelfLifeDays}-day shelf-life target without further measures (e.g. MAP, secondary packaging).`
      );
    }

    // ---- Business-factor gaps ----
    if (m.relativeCostIndex >= 4 && input.priorities.cost !== "none") {
      gaps.push("Higher estimated relative cost — evaluate whether the added barrier is necessary.");
    }
    if (m.sustainability.score <= 0.3 && input.priorities.sustainability !== "none") {
      gaps.push("Lower sustainability profile; recycling is difficult for this structure.");
    }
    if (m.sustainability.score >= 0.55 && input.priorities.sustainability !== "none") {
      matches.push("Aligns with sustainability priority (recyclable/compostable material class).");
    }
    if (input.priorities.cost !== "none" && m.relativeCostIndex <= 1) {
      matches.push("Low-cost material class — efficient for cost-sensitive applications.");
    }
    if (m.sustainability.score >= 0.55 && input.priorities.sustainability === "none") {
      gaps.push("Sustainability profile is favourable even though sustainability was not prioritised.");
    }

    // Temperature note for produce chilling sensitivity
    if (commodity?.chillingSensitive && input.storageTempC < (commodity.minSafeStorageTempC ?? -Infinity)) {
      gaps.push(
        "Storage temperature is below the commodity's safe range — packaging cannot prevent chilling injury; adjust storage temperature."
      );
    }

    return {
      materialId: m.id,
      materialName: m.name,
      score: finalScore,
      status: exclusionReasons.length > 0 ? "excluded" : "viable",
      rank: -1,
      breakdown,
      matches,
      gaps,
      exclusionReasons,
    };
  });

  filtersApplied.push(
    "Food-contact suitability (material class)",
    `Storage temperature coverage (${input.storageTempC} °C)`
  );
  if (oxygenReq.level === "exchange") {
    filtersApplied.push("Breathability for respiring produce (OTR > 100 cc/m²/day)");
  }

  const viable = candidates.filter((c) => c.status !== "excluded");
  viable.sort((a, b) => b.score - a.score);
  viable.forEach((c, i) => (c.rank = i + 1));
  if (viable.length > 0) viable[0].status = "recommended";

  const excluded = candidates.filter((c) => c.status === "excluded");

  const inputsSummary: Record<string, string> = {
    Commodity: input.commodityName,
    Category: input.foodCategory,
    Processing: input.processing,
    "Moisture / Fat / pH": `${input.moisturePercent}% / ${input.fatPercent}% / ${input.ph}`,
    "Water activity": input.waterActivity !== null ? String(input.waterActivity) : "Data not available",
    "Target shelf life": `${input.targetShelfLifeDays} days`,
    Storage: `${input.storageTempC} °C, ${input.storageRH}% RH (${input.storageType.replace("_", " ")})`,
    Transport: `${input.transportMode}, ${input.transportDurationDays} day(s), ${input.handlingIntensity} handling`,
    "Light exposure": input.lightExposure,
  };

  return {
    requirements,
    candidates: [...viable, ...excluded],
    recommended: viable[0] ?? null,
    weights,
    engineMeta: {
      engineVersion: ENGINE_VERSION,
      generatedAt: new Date().toISOString(),
      inputsSummary,
      filtersApplied,
      disclaimer: ENGINE_DISCLAIMER,
    },
  };
}

// ---------------------------------------------------------------------------
// "Why not selected" helper for a specific material vs the recommended one
// ---------------------------------------------------------------------------

export function compareCandidateToTop(
  candidate: CandidateResult,
  top: CandidateResult
): string[] {
  const notes: string[] = [];
  if (candidate.status === "excluded") return candidate.exclusionReasons;
  if (candidate.score < top.score) {
    const delta = Math.round((top.score - candidate.score) * 10) / 10;
    notes.push(`Overall compatibility ${delta} points lower than the top-ranked candidate.`);
  }
  return [...notes, ...candidate.gaps];
}
