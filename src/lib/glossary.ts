// PACKVEDA — Glossary of technical terms for non-expert users.
// Used by the TermTooltip component across the app.

export interface GlossaryTerm {
  term: string;
  short: string; // shown as tooltip title
  definition: string;
}

export const GLOSSARY: Record<string, GlossaryTerm> = {
  OTR: {
    term: "OTR",
    short: "Oxygen Transmission Rate",
    definition:
      "Oxygen Transmission Rate — the rate at which oxygen passes through a packaging material. Lower OTR means better protection against oxidation (rancidity, colour fade, nutrient loss).",
  },
  WVTR: {
    term: "WVTR",
    short: "Water Vapour Transmission Rate",
    definition:
      "Water Vapour Transmission Rate — the rate at which water vapour passes through a packaging material. Lower WVTR means better moisture protection (prevents caking, sogginess or drying out).",
  },
  CO2TR: {
    term: "CO₂TR",
    short: "Carbon Dioxide Transmission Rate",
    definition:
      "Carbon Dioxide Transmission Rate — the rate at which CO₂ passes through a packaging material. Relevant for modified-atmosphere packaging of respiring produce and carbonated products.",
  },
  waterActivity: {
    term: "Water Activity (aw)",
    short: "Water Activity",
    definition:
      "Water activity measures the 'free' water available for microbial growth and spoilage reactions (scale 0–1). Low-aw foods (grains, powders, spices) need strong moisture barriers; high-aw fresh foods often need breathable packaging.",
  },
  barrier: {
    term: "Barrier",
    short: "Barrier property",
    definition:
      "A material's ability to block the passage of gases (oxygen, CO₂), water vapour, light or aromas. Barrier requirements depend on the food's composition and storage environment.",
  },
  sealability: {
    term: "Sealability",
    short: "Sealability",
    definition:
      "How well a material can be heat-sealed to form a leak-proof pack. Poor seal integrity can undermine even an excellent barrier material.",
  },
  tensileStrength: {
    term: "Tensile Strength",
    short: "Tensile Strength",
    definition:
      "The maximum stress a film can withstand while being stretched before breaking — an indicator of resistance to tearing and mechanical damage during handling.",
  },
  respiration: {
    term: "Respiration",
    short: "Respiration (fresh produce)",
    definition:
      "Fresh fruits and vegetables continue to breathe after harvest — consuming O₂ and releasing CO₂, heat and moisture. Respiring produce generally needs breathable packaging rather than a high-barrier film.",
  },
  map: {
    term: "MAP",
    short: "Modified Atmosphere Packaging",
    definition:
      "Modified Atmosphere Packaging — replacing the air inside a pack with a gas mixture (e.g. lower O₂, higher CO₂/N₂) to slow spoilage. Requires a film with gas transmission rates matched to the product.",
  },
  rh: {
    term: "RH",
    short: "Relative Humidity",
    definition:
      "Relative Humidity — the amount of water vapour present in air, expressed as a percentage of the maximum possible at that temperature. High storage RH increases moisture uptake by hygroscopic foods.",
  },
  hygroscopic: {
    term: "Hygroscopic",
    short: "Hygroscopic",
    definition:
      "A material or food that readily absorbs moisture from the surrounding air. Hygroscopic foods (powders, spices, chips) can cake, lose crispness or spoil if the packaging's moisture barrier is weak.",
  },
  rancidity: {
    term: "Rancidity",
    short: "Rancidity",
    definition:
      "Off-flavour development in fatty foods caused by oxidation of fats and oils. Higher fat content and longer storage increase the need for a strong oxygen barrier and light protection.",
  },
  chillingInjury: {
    term: "Chilling Injury",
    short: "Chilling Injury",
    definition:
      "Physiological damage to some fresh produce stored below their safe temperature (e.g. mango, tomato). Packaging cannot fix this — storage temperature must respect the commodity's safe range.",
  },
  freezeBurn: {
    term: "Freezer Burn",
    short: "Freezer Burn",
    definition:
      "Surface drying and oxidation on frozen food caused by sublimation of ice inside the pack. Prevented by strong moisture/gas barriers and good seal integrity at frozen temperatures.",
  },
  micron: {
    term: "Micron (µm)",
    short: "Micron (µm)",
    definition:
      "One micron (µm) = 0.001 mm. Packaging film thickness is commonly expressed in microns; thicker films generally offer better barrier and strength but cost and material use increase.",
  },
  foodContactGrade: {
    term: "Food-Contact Grade",
    short: "Food-Contact Grade",
    definition:
      "A grade of material approved for direct contact with food under applicable regulations. Always confirm the specific grade, migration compliance and declarations with your supplier.",
  },
  datasheet: {
    term: "Datasheet",
    short: "Technical Datasheet",
    definition:
      "A supplier document listing measured properties (OTR, WVTR, strength, thickness, food-contact status) for a specific film or structure. PackVeda's indicative values must always be verified against it.",
  },
  metallizedFilm: {
    term: "Metallized Film",
    short: "Metallized Film",
    definition:
      "A polymer film coated with a microscopically thin metal layer (usually aluminium) to greatly improve oxygen, moisture and light barrier — commonly used for chips, spices and coffee.",
  },
  evoh: {
    term: "EVOH",
    short: "EVOH",
    definition:
      "Ethylene Vinyl Alcohol — a high oxygen-barrier polymer used as a middle layer in co-extruded films. Its oxygen barrier weakens at high humidity, so it is usually sandwiched between moisture-barrier layers.",
  },
  compostable: {
    term: "Compostable",
    short: "Compostable Packaging",
    definition:
      "Packaging designed to biodegrade under specified composting conditions (e.g. PLA/coated paper). Moisture and gas barriers are often lower than conventional plastics, and disposal infrastructure matters.",
  },
  shelfLife: {
    term: "Shelf Life",
    short: "Shelf Life",
    definition:
      "The period during which a food remains safe and retains acceptable quality under stated storage conditions. Packaging is one of several factors — formulation, processing and storage also decide it.",
  },
  wvtrCondition: {
    term: "Test Conditions",
    short: "Why 'indicative' values?",
    definition:
      "OTR/WVTR values depend on test temperature, humidity and film thickness. PackVeda uses indicative literature values under common reference conditions; actual films vary — always verify with supplier datasheets and lab tests.",
  },
};

export type GlossaryKey = keyof typeof GLOSSARY;
