// PACKVEDA — Global client store (Zustand).
// The app is a single-route SPA: `view` acts as the internal router.

"use client";

import { create } from "zustand";
import { AnalysisInput, EngineOutput, Importance } from "@/lib/engine";
import { Intensity } from "@/lib/data/types";
import { getCommodity, COMMODITY_CATEGORY_LABELS } from "@/lib/data/commodities";

export function requireCommodity(id: string): Partial<AnalysisInput> {
  const c = getCommodity(id);
  if (!c) return {};
  return {
    commodityId: c.id,
    commodityName: c.name,
    foodCategory: COMMODITY_CATEGORY_LABELS[c.category],
    processing: c.processing,
    moisturePercent: c.moisturePercent,
    fatPercent: c.fatPercent,
    ph: c.ph,
    waterActivity: c.waterActivity,
    respiration: c.respiration,
    oxygenSensitivity: c.oxygenSensitivity,
    aromaSensitivity: c.aromaSensitivity,
    lightSensitivity: c.lightSensitivity,
    hygroscopic: c.hygroscopic,
    fragile: c.fragile,
    storageTempC: c.typicalStorageTempC,
    storageRH: c.typicalStorageRH,
    targetShelfLifeDays: c.typicalShelfLifeDays,
  } as Partial<AnalysisInput>;
}

export type View =
  | "home"
  | "signin"
  | "analyze"
  | "results"
  | "matching"
  | "marketplace"
  | "compare"
  | "passport"
  | "simulator"
  | "dashboard"
  | "seller"
  | "onboarding"
  | "trials"
  | "explorer"
  | "sources"
  | "about";

// ---------------------------------------------------------------------------
// URL mapping — the SPA lives on the / route, but every view owns a real
// browser URL (via history.pushState) so links are shareable and the browser
// Back/Forward work. A middleware rewrites any non-asset path to / so typed
// URLs bootstrap the SPA; the auth guard then enforces access client-side.
// ---------------------------------------------------------------------------

export const VIEW_PATHS: Record<View, string> = {
  home: "/",
  signin: "/signin",
  analyze: "/analyze",
  results: "/results",
  matching: "/matching",
  marketplace: "/marketplace",
  compare: "/compare",
  passport: "/packaging-passport",
  simulator: "/simulator",
  dashboard: "/dashboard",
  seller: "/seller",
  onboarding: "/onboarding",
  trials: "/trials",
  explorer: "/explorer",
  sources: "/sources",
  about: "/about",
};

export function pathToView(pathname: string): View | null {
  const clean = pathname.replace(/\/+$/, "") || "/";
  const entry = (Object.entries(VIEW_PATHS) as [View, string][]).find(
    ([, p]) => p === clean
  );
  return entry ? entry[0] : null;
}

/** Views that require an authenticated PackVeda account. */
const PROTECTED_VIEWS: ReadonlySet<View> = new Set<View>([
  "analyze",
  "results",
  "matching",
  "marketplace",
  "compare",
  "passport",
  "simulator",
  "dashboard",
  "seller",
  "onboarding",
  "trials",
  "explorer",
]);

export function isProtectedView(view: View): boolean {
  return PROTECTED_VIEWS.has(view);
}

export type UserRole = "buyer" | "seller";

export interface UserProfile {
  id: string;
  role: UserRole;
  name: string;
  email: string;
  company: string;
  phone?: string;
  location?: string;
}

export interface DemoScenario {
  id: string;
  label: string;
  commodityId: string;
  description: string;
  overrides: Partial<AnalysisInput>;
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "rice",
    label: "Milled Rice — 12-month ambient storage",
    commodityId: "milled-rice",
    description:
      "Long-term ambient storage of rice; strong moisture barrier and insect-tight packing matter most.",
    overrides: {
      targetShelfLifeDays: 365,
      storageTempC: 25,
      storageRH: 60,
      storageType: "ambient",
      transportDurationDays: 5,
      transportMode: "road",
      handlingIntensity: "normal",
      lightExposure: "none",
      priorities: { cost: "high", sustainability: "medium", barrier: "medium", shelfLife: "high", mechanical: "low" },
    },
  },
  {
    id: "tomato",
    label: "Fresh Tomato — 3-day retail distribution",
    commodityId: "fresh-tomato",
    description:
      "Respiring produce requiring gas exchange; breathable packaging and bruise protection.",
    overrides: {
      targetShelfLifeDays: 10,
      storageTempC: 12,
      storageRH: 90,
      storageType: "chilled",
      transportDurationDays: 2,
      transportMode: "road",
      handlingIntensity: "gentle",
      lightExposure: "none",
      priorities: { cost: "medium", sustainability: "medium", barrier: "low", shelfLife: "high", mechanical: "medium" },
    },
  },
  {
    id: "mango",
    label: "Fresh Mango — export trial",
    commodityId: "fresh-mango",
    description:
      "Chilling-sensitive climacteric fruit; breathability plus cushioning for export transit.",
    overrides: {
      targetShelfLifeDays: 14,
      storageTempC: 12,
      storageRH: 85,
      storageType: "cold_chain",
      transportDurationDays: 7,
      transportMode: "sea",
      handlingIntensity: "normal",
      lightExposure: "none",
      priorities: { cost: "low", sustainability: "medium", barrier: "low", shelfLife: "high", mechanical: "high" },
    },
  },
  {
    id: "chilli",
    label: "Chilli Powder — colour & aroma retention",
    commodityId: "chilli-powder",
    description:
      "Hygroscopic, fat-containing spice: moisture caking, colour fade and aroma loss drive the barrier needs.",
    overrides: {
      targetShelfLifeDays: 180,
      storageTempC: 25,
      storageRH: 55,
      storageType: "ambient",
      transportDurationDays: 4,
      transportMode: "road",
      handlingIntensity: "normal",
      lightExposure: "partial",
      priorities: { cost: "medium", sustainability: "low", barrier: "high", shelfLife: "high", mechanical: "low" },
    },
  },
  {
    id: "groundnut",
    label: "Groundnut — rancidity control",
    commodityId: "groundnut",
    description:
      "High-fat oilseed; oxygen barrier and light protection dominate the shelf-life outcome.",
    overrides: {
      targetShelfLifeDays: 180,
      storageTempC: 22,
      storageRH: 55,
      storageType: "ambient",
      transportDurationDays: 6,
      transportMode: "multimodal",
      handlingIntensity: "normal",
      lightExposure: "partial",
      priorities: { cost: "medium", sustainability: "medium", barrier: "high", shelfLife: "high", mechanical: "medium" },
    },
  },
];

export const DEFAULT_INPUT: AnalysisInput = {
  commodityId: "",
  commodityName: "",
  foodCategory: "",
  processing: "processed",
  moisturePercent: 12,
  fatPercent: 2,
  ph: 6,
  waterActivity: null,
  respiration: "none",
  oxygenSensitivity: "low",
  aromaSensitivity: "low",
  lightSensitivity: "low",
  hygroscopic: false,
  fragile: false,
  targetShelfLifeDays: 90,
  storageTempC: 25,
  storageRH: 60,
  storageType: "ambient",
  transportDurationDays: 3,
  transportMode: "road",
  handlingIntensity: "normal",
  lightExposure: "none",
  priorities: {
    cost: "medium",
    sustainability: "medium",
    barrier: "medium",
    shelfLife: "medium",
    mechanical: "low",
  },
};

interface PackvedaState {
  view: View;
  setView: (v: View) => void;

  // Wizard
  wizardStep: number; // 1..6
  setWizardStep: (s: number) => void;
  wizardInput: AnalysisInput;
  setWizardInput: (partial: Partial<AnalysisInput>) => void;
  applyDemo: (scenarioId: string) => void;
  resetWizard: () => void;

  // Results
  result: EngineOutput | null;
  lastLabel: string;
  setResult: (result: EngineOutput | null, label?: string) => void;
  analyzing: boolean;
  setAnalyzing: (b: boolean) => void;

  // Passport
  passportMaterialId: string | null;
  openPassport: (materialId: string) => void;

  // Compare
  compareIds: string[];
  toggleCompare: (materialId: string) => void;
  clearCompare: () => void;

  // Simulator
  simulating: boolean;
  setSimulating: (b: boolean) => void;
  simResult: EngineOutput | null;
  setSimResult: (r: EngineOutput | null) => void;

  // AI Assistant
  chatOpen: boolean;
  setChatOpen: (b: boolean) => void;

  // Authentication dialog — global "Sign in to PackVeda" gate
  authDialog: AuthDialogState;
  openAuthDialog: (opts?: AuthDialogOptions) => void;
  closeAuthDialog: () => void;

  // Mode the auth view should open in (set by the dialog / header)
  authMode: "signin" | "signup";
  setAuthMode: (m: "signin" | "signup") => void;

  // Set right before a credential flow completes so the SIGNED_IN handler
  // knows to send the user to /analyze (never on passive session restore).
  pendingAuthRedirect: boolean;
  setPendingAuthRedirect: (b: boolean) => void;

  // Account / role (buyer vs seller) — lightweight prototype identity
  profile: UserProfile | null;
  setProfile: (p: UserProfile | null) => void;

  // Marketplace — material preselected for supplier matching
  marketplaceMaterialId: string | null;
  openMarketplace: (materialId?: string) => void;
}

export interface AuthDialogOptions {
  mode?: "signin" | "signup";
  title?: string;
  subtitle?: string;
}

export interface AuthDialogState {
  open: boolean;
  mode: "signin" | "signup";
  title: string;
  subtitle: string;
}

export const AUTH_DIALOG_DEFAULTS: AuthDialogState = {
  open: false,
  mode: "signin",
  title: "Sign in to PackVeda",
  subtitle: "Create an account or sign in to start your packaging analysis.",
};

/** Push an in-app history entry (with the view's real URL) so browser
 *  Back/Forward work inside the SPA and URLs stay shareable. */
function pushHistory(view: View) {
  if (typeof window !== "undefined") {
    try {
      window.history.pushState({ packveda: true, view }, "", VIEW_PATHS[view]);
    } catch {
      /* ignore */
    }
  }
}

export const usePackVeda = create<PackvedaState>((set, get) => ({
  view: "home",
  setView: (v) => {
    if (v === get().view) return;
    set({ view: v });
    pushHistory(v);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  },

  wizardStep: 1,
  setWizardStep: (s) => set({ wizardStep: s }),
  wizardInput: DEFAULT_INPUT,
  setWizardInput: (partial) =>
    set((state) => ({ wizardInput: { ...state.wizardInput, ...partial } })),
  applyDemo: (scenarioId) => {
    const scenario = DEMO_SCENARIOS.find((s) => s.id === scenarioId);
    if (!scenario) return;
    // Base from commodity record
    const base = { ...DEFAULT_INPUT };
    const c = requireCommodity(scenario.commodityId);
    const merged: AnalysisInput = {
      ...base,
      ...c,
      ...scenario.overrides,
    };
    set({ wizardInput: merged, wizardStep: 1, view: "analyze" });
    pushHistory("analyze");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  },
  resetWizard: () => set({ wizardInput: DEFAULT_INPUT, wizardStep: 1, result: null }),

  result: null,
  lastLabel: "",
  setResult: (result, label) =>
    set((s) => ({ result, lastLabel: label ?? s.lastLabel })),
  analyzing: false,
  setAnalyzing: (b) => set({ analyzing: b }),

  passportMaterialId: null,
  openPassport: (materialId) =>
    set((s) => {
      pushHistory("passport");
      return { passportMaterialId: materialId, view: "passport" as View };
    }),

  compareIds: [],
  toggleCompare: (materialId) =>
    set((s) => {
      const exists = s.compareIds.includes(materialId);
      if (exists) return { compareIds: s.compareIds.filter((i) => i !== materialId) };
      if (s.compareIds.length >= 4) return s; // max 4
      return { compareIds: [...s.compareIds, materialId] };
    }),
  clearCompare: () => set({ compareIds: [] }),

  simulating: false,
  setSimulating: (b) => set({ simulating: b }),
  simResult: null,
  setSimResult: (r) => set({ simResult: r }),

  chatOpen: false,
  setChatOpen: (b) => set({ chatOpen: b }),

  authDialog: AUTH_DIALOG_DEFAULTS,
  openAuthDialog: (opts) =>
    set({
      authDialog: {
        open: true,
        mode: opts?.mode ?? "signin",
        title: opts?.title ?? AUTH_DIALOG_DEFAULTS.title,
        subtitle: opts?.subtitle ?? AUTH_DIALOG_DEFAULTS.subtitle,
      },
    }),
  closeAuthDialog: () =>
    set((s) => ({ authDialog: { ...s.authDialog, open: false } })),

  authMode: "signin",
  setAuthMode: (m) => set({ authMode: m }),

  pendingAuthRedirect: false,
  setPendingAuthRedirect: (b) => set({ pendingAuthRedirect: b }),

  profile: null,
  setProfile: (p) => {
    set({ profile: p });
    if (typeof window !== "undefined") {
      if (p) localStorage.setItem("packveda-profile", JSON.stringify(p));
      else localStorage.removeItem("packveda-profile");
    }
  },

  marketplaceMaterialId: null,
  openMarketplace: (materialId) => {
    set({ marketplaceMaterialId: materialId ?? null, view: "marketplace" });
    pushHistory("marketplace");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  },
}));

/** Restore the persisted profile on first client render (call once from the page root). */
export function initProfileFromStorage(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("packveda-profile");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserProfile;
    if (parsed && (parsed.role === "buyer" || parsed.role === "seller") && parsed.email) {
      usePackVeda.setState({ profile: parsed });
      return parsed;
    }
  } catch {
    /* ignore corrupted storage */
  }
  return null;
}

export const IMPORTANCE_LABEL: Record<Importance, string> = {
  none: "Not a priority",
  low: "Low",
  medium: "Medium",
  high: "High",
};

export const INTENSITY_LABEL: Record<Intensity, string> = {
  none: "None",
  low: "Low",
  moderate: "Moderate",
  high: "High",
  very_high: "Very High",
};


