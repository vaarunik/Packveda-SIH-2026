// PACKVEDA — Central source registry (Evidence & Sources layer).
//
// SINGLE source of truth for every citation shown anywhere in the app
// (analysis results, chatbot, Data & Sources view, persisted evidence rows).
//
// NO-FABRICATION POLICY (critical):
// - Only sources the project genuinely uses are listed here.
// - `url` is null when no official, verifiable link is recorded — we then say
//   "Source unavailable" instead of inventing a URL.
// - No specific FSSAI clause numbers or BIS standard numbers are cited,
//   because the dataset does not map requirements to specific clauses.
// - Indicative literature values are labelled as such — never as measured
//   or certified results.

export type SourceCategory =
  | "regulatory"
  | "standards"
  | "scientific"
  | "technical"
  | "database"
  | "validation";

export type ConfidenceLevel = "high" | "medium" | "low";

export interface SourceRecord {
  id: string;
  category: SourceCategory;
  /** Short name used in badges, e.g. "FSSAI" */
  name: string;
  /** Full authority / publication name */
  fullName: string;
  /** Document / dataset title (null when no specific document is cited) */
  title: string | null;
  /** What information PackVeda obtains from this source */
  description: string;
  /** Parameters / claims this source can support */
  parameters: string[];
  /** Official URL — null => "Source unavailable" (never fabricate a URL) */
  url: string | null;
  publicationYear: number | null;
  /** Regulation/standard version, e.g. "2018 (as amended)" */
  version: string | null;
  /** ISO date of the last manual review of this source entry */
  lastChecked: string;
  confidence: ConfidenceLevel;
}

// Last manual review date for the whole registry (kept in one place).
export const REGISTRY_LAST_CHECKED = "2026-01-15";

export const SOURCE_REGISTRY: SourceRecord[] = [
  // ------------------------------------------------------------- REGULATORY
  {
    id: "fssai-packaging",
    category: "regulatory",
    name: "FSSAI",
    fullName: "Food Safety and Standards Authority of India",
    title: "Food Safety and Standards (Packaging) Regulations, 2018",
    description:
      "Food-contact packaging requirements and applicable compliance checks for food products sold in India.",
    parameters: ["food_contact", "regulatory_requirement"],
    url: "https://www.fssai.gov.in",
    publicationYear: 2018,
    version: "2018 (as amended)",
    lastChecked: REGISTRY_LAST_CHECKED,
    confidence: "high",
  },

  // -------------------------------------------------------------- STANDARDS
  {
    id: "bis",
    category: "standards",
    name: "BIS",
    fullName: "Bureau of Indian Standards",
    title: null, // No specific IS number is cited — the dataset does not map
    // requirements to standard numbers, so none is claimed.
    description:
      "Indian Standards relevant to packaging materials and test methods. Specific standard identification is pending verification against the knowledge base.",
    parameters: ["standard_reference"],
    url: "https://www.bis.gov.in",
    publicationYear: null,
    version: null,
    lastChecked: REGISTRY_LAST_CHECKED,
    confidence: "high", // official authority — but mapping is pending
  },

  // ------------------------------------------------------------- SCIENTIFIC
  {
    id: "usda-fdc",
    category: "scientific",
    name: "USDA FoodData Central",
    fullName: "U.S. Department of Agriculture — FoodData Central",
    title: "FoodData Central",
    description:
      "Food composition reference for moisture, fat, pH and water-activity context of commodities.",
    parameters: ["composition", "moisture", "fat", "ph"],
    url: "https://fdc.nal.usda.gov",
    publicationYear: null,
    version: null,
    lastChecked: REGISTRY_LAST_CHECKED,
    confidence: "high",
  },
  {
    id: "fao-postharvest",
    category: "scientific",
    name: "FAO",
    fullName: "Food and Agriculture Organization of the United Nations",
    title: "Post-harvest handling & storage guidance",
    description:
      "Storage and handling behaviour of fresh produce — respiration, chilling sensitivity and post-harvest loss context.",
    parameters: ["respiration", "storage", "fresh_produce"],
    url: "https://www.fao.org",
    publicationYear: null,
    version: null,
    lastChecked: REGISTRY_LAST_CHECKED,
    confidence: "high",
  },
  {
    id: "packaging-literature",
    category: "scientific",
    name: "Scientific literature",
    fullName: "Food-packaging science literature (textbooks & journals)",
    title: "Compiled literature ranges for material property classes",
    description:
      "Typical OTR / WVTR / CO₂TR / strength ranges for packaging material classes, compiled from public food-science and packaging references. Values are INDICATIVE class-level ranges — not measurements of any specific commercial product.",
    parameters: ["otr", "wvtr", "co2tr", "tensile_strength", "temperature_range"],
    url: null, // class-level compiled ranges — no single public URL is recorded
    publicationYear: null,
    version: null,
    lastChecked: REGISTRY_LAST_CHECKED,
    confidence: "medium", // secondary technical source (indicative ranges)
  },

  // -------------------------------------------------------------- TECHNICAL
  {
    id: "supplier-datasheets",
    category: "technical",
    name: "Supplier datasheet",
    fullName: "Material manufacturer / supplier technical datasheets",
    title: null,
    description:
      "Product-specific barrier and mechanical data for a shortlisted material. Supplier-declared values in PackVeda are awaiting verification against the original datasheet or laboratory test.",
    parameters: ["otr", "wvtr", "co2tr", "tensile_strength", "temperature_range", "food_contact"],
    url: null,
    publicationYear: null,
    version: null,
    lastChecked: REGISTRY_LAST_CHECKED,
    confidence: "medium", // supplier-provided, awaiting verification
  },

  // --------------------------------------------------------------- DATABASE
  {
    id: "packveda-commodity-kb",
    category: "database",
    name: "PackVeda KB",
    fullName: "PackVeda Commodity Knowledge Base",
    title: "Commodity profiles v1.0 (prototype dataset)",
    description:
      "Structured commodity records: composition, sensitivities, storage behaviour and typical shelf life, compiled from the scientific sources above.",
    parameters: ["composition", "sensitivity", "storage", "shelf_life"],
    url: null,
    publicationYear: 2026,
    version: "v1.0 (prototype)",
    lastChecked: REGISTRY_LAST_CHECKED,
    confidence: "medium",
  },
  {
    id: "packveda-material-kb",
    category: "database",
    name: "PackVeda KB",
    fullName: "PackVeda Packaging Material Knowledge Base",
    title: "Material property records v1.0 (prototype dataset)",
    description:
      "Structured material-property records (barrier, mechanical, thermal, food-contact class) with per-property source-available flags. Where no verified value exists, PackVeda shows 'Data not available' instead of a guess.",
    parameters: ["otr", "wvtr", "co2tr", "tensile_strength", "temperature_range", "food_contact"],
    url: null,
    publicationYear: 2026,
    version: "v1.0 (prototype)",
    lastChecked: REGISTRY_LAST_CHECKED,
    confidence: "medium",
  },

  // -------------------------------------------------------------- VALIDATION
  {
    id: "lab-reports",
    category: "validation",
    name: "Laboratory report",
    fullName: "Laboratory test reports / verified validation records",
    title: null,
    description:
      "Physical test results for the selected material (e.g. OTR/WVTR per ASTM or ISO method). Not available by default — records appear only after the user uploads or links a real test report in Trial & Validation.",
    parameters: ["otr", "wvtr", "co2tr", "tensile_strength", "shelf_life"],
    url: null,
    publicationYear: null,
    version: null,
    lastChecked: REGISTRY_LAST_CHECKED,
    confidence: "low", // until a real report is attached and verified
  },
];

const REGISTRY_BY_ID = new Map(SOURCE_REGISTRY.map((s) => [s.id, s]));

export function getSource(id: string): SourceRecord | undefined {
  return REGISTRY_BY_ID.get(id);
}

export const SOURCE_CATEGORY_LABEL: Record<SourceCategory, string> = {
  regulatory: "Regulatory source",
  standards: "Standards body",
  scientific: "Scientific source",
  technical: "Technical source",
  database: "Database",
  validation: "Validation record",
};

// Badge-friendly short labels used across the UI.
export const SOURCE_BADGE_LABEL: Record<SourceCategory, string> = {
  regulatory: "FSSAI",
  standards: "BIS",
  scientific: "SCIENTIFIC",
  technical: "TECHNICAL",
  database: "DATABASE",
  validation: "VALIDATION",
};

// Map the legacy per-data-entry labels (src/lib/data/*) to registry ids so
// existing `SourceRef` provenance resolves to a real registry entry.
export const LEGACY_LABEL_TO_SOURCE_ID: Record<string, string> = {
  "USDA FoodData Central": "usda-fdc",
  "FAO post-harvest handling guidance": "fao-postharvest",
  "Packaging film property literature": "packaging-literature",
  "Spice / coffee / dairy stability literature": "packaging-literature",
  "Bulk packaging practice literature": "packaging-literature",
  "Co-extruded barrier film literature": "packaging-literature",
  "Flexible packaging laminate literature": "packaging-literature",
  "Glass packaging literature": "packaging-literature",
  "Metal packaging literature": "packaging-literature",
  "Paper-based packaging literature": "packaging-literature",
  "Rigid packaging property literature": "packaging-literature",
  "Cereal processing & storage literature": "packaging-literature",
  "Oilseed storage stability literature": "packaging-literature",
  "Post-harvest grain storage literature (FAO)": "fao-postharvest",
  "Post-harvest handling of horticultural crops (FAO)": "fao-postharvest",
  "Post-harvest physiology of tropical fruits": "fao-postharvest",
  "Fresh-cut produce MAP literature": "fao-postharvest",
  "Frozen food packaging literature": "packaging-literature",
  "Snack food packaging literature": "packaging-literature",
  "Tea chemistry & storage literature": "packaging-literature",
  "Coffee packaging literature": "packaging-literature",
  "Dairy science & packaging literature": "packaging-literature",
  "Spice chemistry & stability literature": "packaging-literature",
};
