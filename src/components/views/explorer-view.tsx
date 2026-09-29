// PACKVEDA — Admin Data Explorer.
// Read-only inspection of the static knowledge base (commodities & packaging
// materials) with provenance — the exact data PackVeda's engine reasons over.
// No API calls: this is compiled-in, transparent reference data.

"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Boxes,
  Database,
  Droplets,
  Leaf,
  Search,
  Thermometer,
  Wheat,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { BackButton } from "@/components/shared/back-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { usePackVeda } from "@/lib/store";
import { INTENSITY_LABEL } from "@/lib/store";
import { COMMODITIES, COMMODITY_CATEGORY_LABELS } from "@/lib/data/commodities";
import { MATERIALS } from "@/lib/data/materials";
import type {
  Commodity,
  CommodityCategory,
  Intensity,
  MaterialForm,
  PackagingMaterial,
  SourceRef,
} from "@/lib/data/types";
import { MaturityBadge } from "@/components/shared/maturity-badge";
import { Term } from "@/components/shared/term-tooltip";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Label maps & small presentational helpers
// ---------------------------------------------------------------------------

const FORM_LABELS: Record<MaterialForm, string> = {
  film_flexible: "Flexible Film",
  laminate_flexible: "Flexible Laminate",
  semi_rigid: "Semi-Rigid",
  rigid: "Rigid",
  paper_based: "Paper-Based",
};

const SOURCE_KIND_LABELS: Record<SourceRef["kind"], string> = {
  reference_database: "Reference DB",
  textbook: "Literature",
  standard: "Standard",
  industry_publication: "Industry",
  internal_estimate: "Estimate",
};

const RECYCLABLE_LABELS: Record<
  PackagingMaterial["sustainability"]["recyclable"],
  string
> = {
  widely: "Widely recyclable",
  limited: "Limited recyclability",
  difficult: "Difficult to recycle",
  not_recyclable: "Not recyclable",
};

const NOT_AVAILABLE = "Data not available";

function levelText(level: Intensity): string {
  return INTENSITY_LABEL[level] ?? level;
}

/** Small labelled value row used throughout the cards. */
function PropertyRow({
  label,
  value,
  missing,
  tooltipKey,
  className,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  missing?: boolean;
  tooltipKey?: Parameters<typeof Term>[0]["k"];
  className?: string;
}) {
  return (
    <div className={cn("flex items-baseline justify-between gap-3 py-1.5", className)}>
      <span className="shrink-0 text-xs text-navy-600">
        {tooltipKey ? <Term k={tooltipKey}>{label}</Term> : label}
      </span>
      <span
        className={cn(
          "text-right text-xs font-medium",
          missing ? "italic text-navy-600/60" : "text-navy-900"
        )}
      >
        {value}
      </span>
    </div>
  );
}

/** Yes/No capability chip. */
function BoolChip({ label, on }: { label: string; on: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] font-medium",
        on
          ? "border-forest-600/40 bg-forest-50 text-forest-800 hover:bg-forest-50"
          : "border-border bg-cream-100 text-navy-600 hover:bg-cream-100"
      )}
    >
      {label}: {on ? "Yes" : "No"}
    </Badge>
  );
}

/** Provenance dot for barrier values (green = source available). */
function ProvenanceDot({ available }: { available: boolean }) {
  return (
    <span
      title={
        available
          ? "Value backed by a listed source"
          : "No verified source value in the dataset"
      }
      aria-label={available ? "Source available" : "No verified value"}
      className={cn(
        "inline-block size-2 shrink-0 rounded-full",
        available ? "bg-forest-500" : "bg-navy-800/20"
      )}
    />
  );
}

/** Cost index dots 1..5. */
function CostDots({ index }: { index: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`Relative cost index ${index} of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span
          key={i}
          aria-hidden
          className={cn(
            "inline-block size-1.5 rounded-full",
            i < index ? "bg-forest-700" : "bg-cream-300"
          )}
        />
      ))}
    </span>
  );
}

/** Sources footer shared by commodity & material cards. */
function SourceList({ sources }: { sources: SourceRef[] }) {
  if (!sources || sources.length === 0) {
    return (
      <p className="pt-3 text-[11px] italic text-navy-600/70">
        No listed sources for this record.
      </p>
    );
  }
  return (
    <div className="pt-3">
      <p className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-navy-600">
        <Database className="size-3" aria-hidden />
        Sources
      </p>
      <ul className="space-y-1">
        {sources.map((s, i) => (
          <li key={`${s.label}-${i}`} className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] leading-snug text-navy-800">{s.label}</span>
            <Badge
              variant="outline"
              className="border-navy-700/25 bg-cream-100 px-1.5 text-[9px] text-navy-700 hover:bg-cream-100"
            >
              {SOURCE_KIND_LABELS[s.kind]}
            </Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Commodity card
// ---------------------------------------------------------------------------

function CommodityCard({ commodity }: { commodity: Commodity }) {
  return (
    <Card className="flex h-full flex-col border-border/80">
      <CardContent className="flex h-full flex-col gap-3 p-4 sm:p-5">
        <div>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="text-sm font-bold leading-snug text-navy-950">
              {commodity.name}
            </h3>
            <div className="flex shrink-0 flex-wrap gap-1">
              <Badge
                variant="outline"
                className="border-forest-600/30 bg-forest-50 text-[10px] text-forest-800 hover:bg-forest-50"
              >
                {COMMODITY_CATEGORY_LABELS[commodity.category]}
              </Badge>
              <Badge
                variant="outline"
                className="border-navy-700/25 bg-cream-100 text-[10px] text-navy-700 hover:bg-cream-100"
              >
                {commodity.processing === "fresh" ? "Fresh" : "Processed"}
              </Badge>
            </div>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-navy-600">
            {commodity.description}
          </p>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-x-4">
          <PropertyRow label="Moisture" value={`${commodity.moisturePercent}%`} />
          <PropertyRow label="Fat" value={`${commodity.fatPercent}%`} />
          <PropertyRow label="pH" value={`${commodity.ph}`} />
          <PropertyRow
            label="Water activity"
            tooltipKey="waterActivity"
            value={commodity.waterActivity !== null ? `${commodity.waterActivity}` : NOT_AVAILABLE}
            missing={commodity.waterActivity === null}
          />
        </div>
        <div className="-mt-1.5">
          <PropertyRow
            label="Respiration"
            tooltipKey="respiration"
            value={levelText(commodity.respiration)}
          />
          <PropertyRow label="Oxygen sensitivity" value={levelText(commodity.oxygenSensitivity)} />
          <PropertyRow label="Aroma sensitivity" value={levelText(commodity.aromaSensitivity)} />
          <PropertyRow label="Light sensitivity" value={levelText(commodity.lightSensitivity)} />
        </div>

        <div className="flex flex-wrap gap-1.5">
          <BoolChip label="Hygroscopic" on={commodity.hygroscopic} />
          <BoolChip label="Fragile" on={commodity.fragile} />
          <BoolChip label="Chilling-sensitive" on={commodity.chillingSensitive} />
        </div>

        <div className="rounded-lg bg-cream-100/80 px-3 py-2">
          <p className="flex items-center gap-1.5 text-[11px] text-navy-800">
            <Thermometer className="size-3.5 shrink-0 text-forest-700" aria-hidden />
            <span>
              Typical storage:{" "}
              <span className="font-semibold">
                {commodity.typicalStorageTempC} °C · {commodity.typicalStorageRH}% RH ·{" "}
                {commodity.typicalShelfLifeDays} days
              </span>
            </span>
          </p>
        </div>

        {commodity.notes.length > 0 && (
          <ul className="space-y-1" aria-label="Food-science notes">
            {commodity.notes.map((n, i) => (
              <li key={i} className="flex gap-1.5 text-[11px] leading-relaxed text-navy-700">
                <span aria-hidden className="mt-1.5 size-1 shrink-0 rounded-full bg-forest-600" />
                {n}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-auto border-t border-border/60">
          <SourceList sources={commodity.sources} />
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Material card
// ---------------------------------------------------------------------------

function BarrierRow({
  termKey,
  label,
  value,
  sourceAvailable,
  unit,
}: {
  termKey: Parameters<typeof Term>[0]["k"];
  label: string;
  value: number | null;
  sourceAvailable: boolean;
  unit: string;
}) {
  const missing = value === null;
  return (
    <div className="flex items-center justify-between gap-2 py-1.5">
      <span className="flex items-center gap-1.5 text-xs text-navy-600">
        <ProvenanceDot available={sourceAvailable && !missing} />
        <Term k={termKey}>{label}</Term>
      </span>
      <span
        className={cn(
          "text-right text-xs font-medium",
          missing ? "italic text-navy-600/60" : "text-navy-900"
        )}
      >
        {missing ? NOT_AVAILABLE : `${value.toLocaleString("en-IN")} ${unit}`}
      </span>
    </div>
  );
}

function MaterialCard({ material }: { material: PackagingMaterial }) {
  const s = material.sustainability;
  return (
    <Card className="flex h-full flex-col border-border/80">
      <CardContent className="flex h-full flex-col gap-3 p-4 sm:p-5">
        <div>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="text-sm font-bold leading-snug text-navy-950">
              {material.name}
            </h3>
            <div className="flex shrink-0 flex-wrap gap-1">
              <Badge
                variant="outline"
                className="border-forest-600/30 bg-forest-50 text-[10px] text-forest-800 hover:bg-forest-50"
              >
                {material.family}
              </Badge>
              <Badge
                variant="outline"
                className="border-navy-700/25 bg-cream-100 text-[10px] text-navy-700 hover:bg-cream-100"
              >
                {FORM_LABELS[material.form]}
              </Badge>
            </div>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-navy-600">
            {material.structure}
          </p>
        </div>

        <Separator />

        {/* Barrier */}
        <section aria-label="Barrier properties">
          <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-navy-600">
            <Droplets className="size-3" aria-hidden />
            Barrier
            <span className="font-normal normal-case tracking-normal text-navy-600/70">
              (dot = source available)
            </span>
          </p>
          <BarrierRow
            termKey="OTR"
            label="OTR"
            value={material.otr}
            sourceAvailable={material.otrSourceAvailable}
            unit="cc/m²/day"
          />
          <BarrierRow
            termKey="WVTR"
            label="WVTR"
            value={material.wvtr}
            sourceAvailable={material.wvtrSourceAvailable}
            unit="g/m²/day"
          />
          <BarrierRow
            termKey="CO2TR"
            label="CO₂TR"
            value={material.co2tr}
            sourceAvailable={material.co2trSourceAvailable}
            unit="cc/m²/day"
          />
        </section>

        <Separator />

        {/* Mechanical & physical */}
        <section aria-label="Mechanical and physical properties" className="grid grid-cols-2 gap-x-4">
          <PropertyRow
            label="Tensile"
            tooltipKey="tensileStrength"
            value={material.tensileStrengthMPa !== null ? `${material.tensileStrengthMPa} MPa` : "N/A"}
            missing={material.tensileStrengthMPa === null}
          />
          <PropertyRow
            label="Thickness"
            tooltipKey="micron"
            value={`${material.thicknessMicron.toLocaleString("en-IN")} µm`}
          />
          <PropertyRow
            label="Sealability"
            tooltipKey="sealability"
            value={levelText(material.sealability)}
          />
          <PropertyRow label="Puncture" value={levelText(material.punctureResistance)} />
          <PropertyRow
            label="Temp range"
            value={
              material.tempMinC !== null && material.tempMaxC !== null
                ? `${material.tempMinC} to ${material.tempMaxC} °C`
                : NOT_AVAILABLE
            }
            missing={material.tempMinC === null || material.tempMaxC === null}
          />
          <PropertyRow
            label="Food contact"
            tooltipKey="foodContactGrade"
            value={material.foodContactSuitable ? "Suitable*" : "Verify"}
          />
        </section>

        {/* Cost & sustainability */}
        <section aria-label="Cost and sustainability" className="grid grid-cols-2 gap-x-4">
          <PropertyRow
            label="Cost"
            value={
              <span className="inline-flex items-center gap-1.5">
                <span className="capitalize">{material.costCategory}</span>
                <CostDots index={material.relativeCostIndex} />
              </span>
            }
          />
          <PropertyRow
            label="Sustainability"
            value={
              <span className="inline-flex items-center gap-1.5">
                <span>{s.score.toFixed(2)} / 1</span>
                <Leaf
                  className={cn(
                    "size-3",
                    s.score >= 0.6 ? "text-forest-600" : "text-navy-600/60"
                  )}
                  aria-hidden
                />
              </span>
            }
          />
        </section>
        <p className="-mt-1.5 text-[11px] leading-relaxed text-navy-600">
          {RECYCLABLE_LABELS[s.recyclable]} · {s.notes}
        </p>
        <p className="text-[11px] leading-relaxed text-navy-600">
          <span className="font-medium text-navy-800">Food contact:</span>{" "}
          {material.foodContactNote}
        </p>

        {/* Applications */}
        <div className="flex flex-wrap gap-1.5" aria-label="Typical applications">
          {material.typicalApplications.map((a, i) => (
            <Badge
              key={i}
              variant="outline"
              className="border-forest-600/25 bg-cream-50 text-[10px] font-normal text-navy-800 hover:bg-cream-50"
            >
              {a}
            </Badge>
          ))}
        </div>

        {/* Limitations */}
        <ul className="space-y-1" aria-label="Limitations">
          {material.limitations.map((l, i) => (
            <li key={i} className="flex gap-1.5 text-[11px] leading-relaxed text-navy-700">
              <span aria-hidden className="mt-1.5 size-1 shrink-0 rounded-full bg-amber-600" />
              {l}
            </li>
          ))}
        </ul>

        <p className="text-[11px] leading-relaxed text-navy-600">
          <span className="font-medium text-navy-800">Regulatory:</span>{" "}
          {material.regulatoryNotes}
        </p>
        <p className="text-[11px] italic leading-relaxed text-navy-600/80">
          {material.dataConfidenceNote}
        </p>

        <div className="mt-auto border-t border-border/60">
          <SourceList sources={material.sources} />
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------

const CATEGORY_KEYS = Object.keys(COMMODITY_CATEGORY_LABELS) as CommodityCategory[];

export default function ExplorerView() {
  const { setView } = usePackVeda();

  // Commodity filters
  const [commodityQuery, setCommodityQuery] = useState("");
  const [category, setCategory] = useState<string>("all");

  // Material filters
  const [materialQuery, setMaterialQuery] = useState("");
  const [family, setFamily] = useState<string>("all");

  const families = useMemo(
    () => Array.from(new Set(MATERIALS.map((m) => m.family))).sort(),
    []
  );

  const filteredCommodities = useMemo(() => {
    const q = commodityQuery.trim().toLowerCase();
    return COMMODITIES.filter((c) => {
      const matchesQuery =
        q === "" ||
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q);
      const matchesCategory = category === "all" || c.category === category;
      return matchesQuery && matchesCategory;
    });
  }, [commodityQuery, category]);

  const filteredMaterials = useMemo(() => {
    const q = materialQuery.trim().toLowerCase();
    return MATERIALS.filter((m) => {
      const matchesQuery =
        q === "" ||
        m.name.toLowerCase().includes(q) ||
        m.structure.toLowerCase().includes(q) ||
        m.family.toLowerCase().includes(q);
      const matchesFamily = family === "all" || m.family === family;
      return matchesQuery && matchesFamily;
    });
  }, [materialQuery, family]);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* ---- Header ---- */}
      <BackButton label="Back to Dashboard" fallback="dashboard" />
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="flex flex-col gap-3"
      >
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-forest-600">
            Knowledge Base
          </p>
          <MaturityBadge status="available" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-navy-950 sm:text-4xl">
          Data Explorer
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-navy-600 sm:text-base">
          Inspect the knowledge base PackVeda reasons over — with provenance.
          Every value below is exactly what the recommendation engine sees.
        </p>
      </motion.div>

      {/* ---- Tabs ---- */}
      <Tabs defaultValue="commodities" className="mt-8">
        <TabsList className="h-auto w-full justify-start gap-1 rounded-xl bg-cream-200/70 p-1 sm:w-auto">
          <TabsTrigger
            value="commodities"
            className="gap-1.5 rounded-lg px-3 py-2 text-sm data-[state=active]:bg-cream-50 data-[state=active]:text-navy-950"
          >
            <Wheat className="size-4" aria-hidden />
            Commodities
            <Badge variant="outline" className="ml-1 border-border bg-cream-50 px-1.5 text-[10px]">
              {COMMODITIES.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger
            value="materials"
            className="gap-1.5 rounded-lg px-3 py-2 text-sm data-[state=active]:bg-cream-50 data-[state=active]:text-navy-950"
          >
            <Boxes className="size-4" aria-hidden />
            Packaging Materials
            <Badge variant="outline" className="ml-1 border-border bg-cream-50 px-1.5 text-[10px]">
              {MATERIALS.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* ---- Commodities tab ---- */}
        <TabsContent value="commodities" className="mt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="commodity-search" className="text-xs text-navy-700">
                Search commodities
              </Label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-navy-600/60"
                  aria-hidden
                />
                <Input
                  id="commodity-search"
                  value={commodityQuery}
                  placeholder="e.g. rice, tomato, spice…"
                  onChange={(e) => setCommodityQuery(e.target.value)}
                  className="bg-white pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5 sm:w-56">
              <Label htmlFor="commodity-category" className="text-xs text-navy-700">
                Category
              </Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="commodity-category" className="bg-white" aria-label="Commodity category filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72 scroll-slim">
                  <SelectItem value="all">All categories</SelectItem>
                  {CATEGORY_KEYS.map((key) => (
                    <SelectItem key={key} value={key}>
                      {COMMODITY_CATEGORY_LABELS[key]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <p className="mt-3 text-xs text-navy-600" role="status">
            Showing {filteredCommodities.length} of {COMMODITIES.length} commodities
          </p>

          {filteredCommodities.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-border bg-card/60 px-6 py-12 text-center">
              <Search className="mx-auto size-8 text-navy-600/50" aria-hidden />
              <p className="mt-3 text-sm font-medium text-navy-900">
                No commodities match your filters
              </p>
              <p className="mt-1 text-xs text-navy-600">
                Try a different search term or category.
              </p>
            </div>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredCommodities.map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.2), ease: "easeOut" }}
                  className="h-full"
                >
                  <CommodityCard commodity={c} />
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ---- Materials tab ---- */}
        <TabsContent value="materials" className="mt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="material-search" className="text-xs text-navy-700">
                Search materials
              </Label>
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-navy-600/60"
                  aria-hidden
                />
                <Input
                  id="material-search"
                  value={materialQuery}
                  placeholder="e.g. laminate, BOPP, compostable…"
                  onChange={(e) => setMaterialQuery(e.target.value)}
                  className="bg-white pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5 sm:w-56">
              <Label htmlFor="material-family" className="text-xs text-navy-700">
                Family
              </Label>
              <Select value={family} onValueChange={setFamily}>
                <SelectTrigger id="material-family" className="bg-white" aria-label="Material family filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-72 scroll-slim">
                  <SelectItem value="all">All families</SelectItem>
                  {families.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <p className="mt-3 text-xs text-navy-600" role="status">
            Showing {filteredMaterials.length} of {MATERIALS.length} materials
          </p>

          {filteredMaterials.length === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-border bg-card/60 px-6 py-12 text-center">
              <Search className="mx-auto size-8 text-navy-600/50" aria-hidden />
              <p className="mt-3 text-sm font-medium text-navy-900">
                No materials match your filters
              </p>
              <p className="mt-1 text-xs text-navy-600">
                Try a different search term or family.
              </p>
            </div>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredMaterials.map((m, i) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.2), ease: "easeOut" }}
                  className="h-full"
                >
                  <MaterialCard material={m} />
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ---- Footer note ---- */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-40px" }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <Card className="mt-8 border-forest-600/20 bg-forest-50/60">
          <CardContent className="flex flex-col items-start justify-between gap-3 p-4 sm:flex-row sm:items-center sm:p-5">
            <p className="text-xs leading-relaxed text-navy-800 sm:text-sm">
              All values are indicative literature-typical values for decision
              support — verify with supplier <Term k="datasheet">datasheets</Term>{" "}
              before commercial adoption. Provenance dots mark which barrier
              values are backed by listed sources.
            </p>
            <Button
              size="sm"
              onClick={() => setView("sources")}
              className="shrink-0 bg-forest-700 text-cream-50 hover:bg-forest-600"
            >
              View Sources
              <ArrowRight className="size-3.5" aria-hidden />
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
