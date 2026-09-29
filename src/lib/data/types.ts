// PACKVEDA — Shared data types for the food & packaging knowledge base.
// All numeric values in the datasets are INDICATIVE literature ranges/values
// compiled for decision support. They are NOT certified laboratory data.
// Users must verify against supplier datasheets before commercial adoption.

export type Intensity = "none" | "low" | "moderate" | "high" | "very_high";

export interface SourceRef {
  /** Human-readable source label, e.g. "USDA FoodData Central" */
  label: string;
  kind:
    | "reference_database"
    | "textbook"
    | "standard"
    | "industry_publication"
    | "internal_estimate";
  /** Short note about what was taken from this source */
  note?: string;
}

export interface DataPropertyProvenance {
  property: string;
  available: boolean;
  sourceLabel?: string;
  note?: string;
}

// ---------------------------------------------------------------------------
// Commodities (food side)
// ---------------------------------------------------------------------------

export type CommodityCategory =
  | "cereal_grain"
  | "pulse_oilseed"
  | "spice"
  | "fruit_fresh"
  | "vegetable_fresh"
  | "dairy_powder"
  | "snack"
  | "plantation_leaf"
  | "frozen_food";

export const COMMODITY_CATEGORY_LABELS: Record<CommodityCategory, string> = {
  cereal_grain: "Cereal / Grain",
  pulse_oilseed: "Pulse / Oilseed",
  spice: "Spice / Masala",
  fruit_fresh: "Fruit (Fresh)",
  vegetable_fresh: "Vegetable (Fresh)",
  dairy_powder: "Dairy Powder",
  snack: "Snack / Processed",
  plantation_leaf: "Plantation / Leaf",
  frozen_food: "Frozen Food",
};

export interface Commodity {
  id: string;
  name: string;
  category: CommodityCategory;
  processing: "fresh" | "processed";
  description: string;
  /** Indicative typical values (%) */
  moisturePercent: number;
  fatPercent: number;
  ph: number;
  /** Water activity; null => data not available in our dataset */
  waterActivity: number | null;
  /** Respiration behaviour — 'none' for processed foods */
  respiration: Intensity;
  oxygenSensitivity: Intensity;
  aromaSensitivity: Intensity;
  lightSensitivity: Intensity;
  hygroscopic: boolean;
  fragile: boolean;
  chillingSensitive: boolean;
  /** Recommended safe minimum storage temperature (°C), null if not critical */
  minSafeStorageTempC: number | null;
  typicalStorageTempC: number;
  typicalStorageRH: number;
  typicalShelfLifeDays: number;
  notes: string[];
  sources: SourceRef[];
}

// ---------------------------------------------------------------------------
// Packaging materials (packaging side)
// ---------------------------------------------------------------------------

export type MaterialForm =
  | "film_flexible"
  | "laminate_flexible"
  | "semi_rigid"
  | "rigid"
  | "paper_based";

export interface SustainabilityInfo {
  /** Indicative relative sustainability score 0..1 (higher = better) */
  score: number;
  recyclable: "widely" | "limited" | "difficult" | "not_recyclable";
  notes: string;
}

export interface PackagingMaterial {
  id: string;
  name: string;
  family: string;
  structure: string;
  form: MaterialForm;

  // Barrier properties — indicative typical values; null => data not available
  /** Oxygen Transmission Rate, cc/m²/day @ ~23 °C (indicative) */
  otr: number | null;
  /** Water Vapour Transmission Rate, g/m²/day @ ~38 °C / 90 % RH (indicative) */
  wvtr: number | null;
  /** CO₂ Transmission Rate, cc/m²/day @ ~23 °C (indicative); often unavailable */
  co2tr: number | null;
  otrSourceAvailable: boolean;
  wvtrSourceAvailable: boolean;
  co2trSourceAvailable: boolean;

  thicknessMicron: number;
  tensileStrengthMPa: number | null;
  /** Heat-sealability capability */
  sealability: Intensity;
  sealNote: string;
  punctureResistance: Intensity;

  /** Service temperature suitability range (indicative) */
  tempMinC: number | null;
  tempMaxC: number | null;

  /** Capability ratings */
  aromaBarrier: Intensity;
  lightBlocking: Intensity;

  /** Suitability for direct food contact as a material class — verify grade with supplier */
  foodContactSuitable: boolean;
  foodContactNote: string;

  costCategory: "low" | "medium" | "high";
  /** Indicative relative cost index 1 (lowest) .. 5 (highest) */
  relativeCostIndex: number;
  /** Indicative supply availability in India */
  availability: Intensity;

  sustainability: SustainabilityInfo;

  typicalApplications: string[];
  limitations: string[];
  regulatoryNotes: string;
  sources: SourceRef[];
  dataConfidenceNote: string;
}
