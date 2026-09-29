"use client";

// PACKVEDA — Marketplace: Seller / Manufacturer Matching (Prototype).
//
// SUPPLIER MATCHING answers: "Who can provide the suitable materials?"
// Buyers see supplier-listed materials matched against THEIR packaging
// requirements (same deterministic matching rules as the Matching page),
// with Request Sample / Request Quote actions persisted to the database.
//
// DATA HONESTY: no real suppliers are invented. Listings are created by
// sellers via the Seller Studio. Where no listing matches, the honest empty
// state says so. All seller-declared values are labelled
// "seller-declared · verification required".

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Check,
  CircleHelp,
  FileText,
  Loader2,
  MapPin,
  MessageSquareQuote,
  Minus,
  Package,
  ScanSearch,
  Store,
  TriangleAlert,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BackButton } from "@/components/shared/back-button";
import { EmptyState } from "@/components/shared/empty-state";
import { MaturityBadge } from "@/components/shared/maturity-badge";
import { SectionHeading } from "@/components/shared/section-heading";
import { useToast } from "@/hooks/use-toast";
import { apiFetch } from "@/lib/api";
import { usePackVeda } from "@/lib/store";
import {
  computeRequirementMatches,
  matchSummary,
  type MatchStatus,
} from "@/lib/matching";
import type { Intensity } from "@/lib/data/types";
import { cn } from "@/lib/utils";

interface SupplierRow {
  id: string;
  supplierEmail: string;
  companyName: string;
  materialName: string;
  structure: string;
  form: string;
  thicknessMicron: number | null;
  otr: number | null;
  wvtr: number | null;
  co2tr: number | null;
  tensileStrengthMPa: number | null;
  sealability: string;
  aromaBarrier: string;
  lightBlocking: string;
  tempMinC: number | null;
  tempMaxC: number | null;
  foodApplications: string;
  moq: string;
  priceRange: string;
  formats: string;
  sustainabilityNote: string;
  documentsNote: string;
  location: string;
  contactInfo: string;
  status: string;
}

type RequestType = "sample" | "quote";

const FORM_LABEL: Record<string, string> = {
  film_flexible: "Flexible film",
  laminate_flexible: "Flexible laminate",
  semi_rigid: "Semi-rigid",
  rigid: "Rigid",
  paper_based: "Paper-based",
};

function fmt(n: number | null): string {
  if (n === null) return "Data not available";
  if (n >= 100) return n.toFixed(0);
  if (n >= 1) return n.toFixed(1);
  return n.toFixed(2);
}

function StatusIcon({ status }: { status: MatchStatus }) {
  const cls: Record<MatchStatus, string> = {
    match: "text-forest-600",
    partial: "text-amber-warm-600",
    not_matched: "text-red-600",
    unverified: "text-slate-pkv-600",
    not_applicable: "text-navy-600/40",
  };
  const Icon = {
    check: Check,
    partial: TriangleAlert,
    cross: X,
    help: CircleHelp,
    minus: Minus,
  }[MATCH_STATUS_ICON[status]];
  return <Icon className={cn("size-3.5 shrink-0", cls[status])} aria-hidden />;
}

const MATCH_STATUS_ICON: Record<MatchStatus, "check" | "partial" | "cross" | "help" | "minus"> = {
  match: "check",
  partial: "partial",
  not_matched: "cross",
  unverified: "help",
  not_applicable: "minus",
};

export function MarketplaceView() {
  const { result, wizardInput, marketplaceMaterialId, profile, setProfile, setView } = usePackVeda();
  const { toast } = useToast();

  const [rows, setRows] = useState<SupplierRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [requestFor, setRequestFor] = useState<{ row: SupplierRow; type: RequestType } | null>(null);
  const [buyerForm, setBuyerForm] = useState({
    name: profile?.name ?? "",
    email: profile?.email ?? "",
    company: profile?.company ?? "",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/api/supplier-materials");
      const data = (await res.json()) as { materials?: SupplierRow[] };
      setRows(data.materials ?? []);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (detailId === null && marketplaceMaterialId && rows?.some((r) => r.id === marketplaceMaterialId)) {
      setDetailId(marketplaceMaterialId);
    }
  }, [rows, marketplaceMaterialId, detailId]);

  // Match every active listing against the current requirements.
  const scored = useMemo(() => {
    if (!rows) return [];
    return rows
      .filter((r) => r.status === "active")
      .map((row) => {
        const matches = result
          ? computeRequirementMatches(
              result.requirements,
              {
                id: row.id,
                name: row.materialName,
                source: "seller_declared",
                otr: row.otr,
                wvtr: row.wvtr,
                co2tr: row.co2tr,
                tensileStrengthMPa: row.tensileStrengthMPa,
                sealability: (row.sealability as Intensity) ?? "moderate",
                aromaBarrier: (row.aromaBarrier as Intensity) ?? "low",
                lightBlocking: (row.lightBlocking as Intensity) ?? "low",
                tempMinC: row.tempMinC,
                tempMaxC: row.tempMaxC,
                foodContactSuitable: true,
              },
              wizardInput
            )
          : null;
        return { row, matches };
      })
      .sort((a, b) => {
        if (!a.matches || !b.matches) return 0;
        const sa = matchSummary(a.matches);
        const sb = matchSummary(b.matches);
        return sb.match - sb.not_matched - (sa.match - sa.not_matched);
      });
  }, [rows, result, wizardInput]);

  const highlighted = useMemo(() => {
    if (!marketplaceMaterialId) return null;
    return scored.find((s) => s.row.id === marketplaceMaterialId) ?? null;
  }, [scored, marketplaceMaterialId]);

  async function submitRequest() {
    if (!requestFor) return;
    if (!buyerForm.name.trim() || !buyerForm.email.trim()) {
      toast({
        title: "Your details are required",
        description: "Add your name and email so the seller can respond.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    try {
      // 1. Upsert buyer profile (role: buyer) — drives future request scoping.
      const profileRes = await apiFetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "buyer",
          name: buyerForm.name.trim(),
          email: buyerForm.email.trim(),
          company: buyerForm.company.trim(),
        }),
      });
      const profileData = (await profileRes.json()) as {
        profile?: { id: string; role: "buyer" | "seller"; name: string; email: string; company: string };
        error?: string;
      };
      if (!profileRes.ok || !profileData.profile) {
        throw new Error(profileData.error || "Could not save your details");
      }
      setProfile(profileData.profile);

      // 2. Create the request against the active listing.
      const reqRes = await apiFetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: requestFor.type,
          buyerEmail: buyerForm.email.trim(),
          buyerName: buyerForm.name.trim(),
          buyerCompany: buyerForm.company.trim(),
          supplierMaterialId: requestFor.row.id,
          commodity: wizardInput.commodityName || "",
          message: buyerForm.message.trim(),
        }),
      });
      const reqData = (await reqRes.json()) as { request?: { id: string }; error?: string };
      if (!reqRes.ok || !reqData.request) {
        throw new Error(reqData.error || "Could not create the request");
      }
      toast({
        title: requestFor.type === "sample" ? "Sample request sent" : "Quote request sent",
        description: `${requestFor.row.companyName} — ${requestFor.row.materialName}. The seller will see it in their Seller Studio.`,
      });
      setRequestFor(null);
      setBuyerForm((f) => ({ ...f, message: "" }));
    } catch (err) {
      toast({
        title: "Request failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  }

  const detail = detailId ? scored.find((s) => s.row.id === detailId) : null;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BackButton label={result ? "Back to Results" : "Back to Dashboard"} fallback={result ? "results" : "dashboard"} />
        <MaturityBadge status="prototype" label="Prototype — supplier network" />
      </div>

      <SectionHeading
        eyebrow="Supplier Matching"
        title="Marketplace"
        description="Once suitable materials are identified, PackVeda matches them with packaging manufacturers and sellers. Request samples or quotations directly — matching uses your requirements, never seller-manipulated scores."
        className="mt-4"
      />

      {/* Recommended-material context banner */}
      {highlighted && highlighted.matches && (
        <Alert className="mt-6 border-forest-600/25 bg-forest-50">
          <Store className="size-4" aria-hidden />
          <AlertTitle>Matched for your requirements — {highlighted.row.materialName}</AlertTitle>
          <AlertDescription className="text-[13px]">
            {highlighted.row.companyName}
            {highlighted.row.location ? ` · ${highlighted.row.location}` : ""} —{" "}
            {matchSummary(highlighted.matches).match} of{" "}
            {highlighted.matches.filter((m) => m.status !== "not_applicable").length} requirements
            matched.
          </AlertDescription>
        </Alert>
      )}

      {result && (
        <p className="mt-6 rounded-lg border border-border bg-card px-4 py-3 text-[12.5px] leading-relaxed text-navy-700">
          <span className="font-semibold text-navy-900">Your requirements:</span>{" "}
          {result.requirements.map((r) => `${r.label} (${r.level.replace("_", " ")})`).join(" · ")}
        </p>
      )}

      {/* Listings */}
      <section aria-label="Supplier listings" className="mt-6">
        {loading ? (
          <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-10 text-sm text-navy-600">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Loading supplier listings…
          </div>
        ) : scored.length === 0 ? (
          <EmptyState
            icon={Store}
            title="No verified supplier matches available yet"
            description="No packaging manufacturer has listed materials in this prototype environment yet. Sellers can join via the Seller Studio — their materials will then be matched against buyer requirements here."
            actionLabel="Open Seller Studio"
            onAction={() => setView("seller")}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {scored.map(({ row, matches }) => {
              const counts = matches ? matchSummary(matches) : null;
              return (
                <motion.div
                  key={row.id}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.35 }}
                >
                  <Card className={cn(
                    "flex h-full flex-col",
                    row.id === marketplaceMaterialId && "ring-2 ring-forest-600/40"
                  )}>
                    <CardContent className="flex flex-1 flex-col gap-3 p-5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="text-[15px] font-bold text-navy-950">{row.materialName}</h3>
                          <p className="text-xs text-navy-600">{row.companyName}</p>
                        </div>
                        <Badge
                          variant="outline"
                          className="shrink-0 border-amber-warm-600/35 bg-amber-warm-50 text-[10px] font-semibold text-amber-warm-600"
                        >
                          Seller-declared · verification required
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {row.form && (
                          <Badge variant="outline" className="border-navy-800/15 text-[10.5px] text-navy-700">
                            {FORM_LABEL[row.form] ?? row.form}
                          </Badge>
                        )}
                        {row.foodApplications
                          .split(",")
                          .map((a) => a.trim())
                          .filter(Boolean)
                          .slice(0, 3)
                          .map((a) => (
                            <Badge key={a} variant="outline" className="border-terracotta-500/25 bg-terracotta-50 text-[10.5px] text-terracotta-700">
                              {a}
                            </Badge>
                          ))}
                      </div>

                      {/* Requirement match indicators (only during an analysis context) */}
                      {matches && counts && (
                        <div className="rounded-lg border border-border bg-cream-50 px-3 py-2.5">
                          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-navy-700">
                            {counts.match} of {matches.filter((m) => m.status !== "not_applicable").length} requirements matched
                          </p>
                          <ul className="space-y-1">
                            {matches
                              .filter((m) => m.status !== "not_applicable")
                              .map((m) => (
                                <li key={m.key} className="flex items-center gap-1.5 text-[11.5px] text-navy-700">
                                  <StatusIcon status={m.status} />
                                  <span className="font-medium">{m.label}</span>
                                  <span className="text-navy-500">
                                    — {m.status === "match" ? "matched" : m.status === "partial" ? "partial" : m.status === "unverified" ? "to verify" : "not matched"}
                                  </span>
                                </li>
                              ))}
                          </ul>
                        </div>
                      )}

                      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[12px]">
                        <div className="flex justify-between gap-2">
                          <dt className="text-navy-600">OTR</dt>
                          <dd className="font-medium text-navy-900">{fmt(row.otr)}</dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-navy-600">WVTR</dt>
                          <dd className="font-medium text-navy-900">{fmt(row.wvtr)}</dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-navy-600">MOQ</dt>
                          <dd className="font-medium text-navy-900">{row.moq || "Data not available"}</dd>
                        </div>
                        <div className="flex justify-between gap-2">
                          <dt className="text-navy-600">Price range</dt>
                          <dd className="font-medium text-navy-900">{row.priceRange || "Data not available"}</dd>
                        </div>
                      </dl>

                      {row.location && (
                        <p className="flex items-center gap-1.5 text-[11.5px] text-navy-600">
                          <MapPin className="size-3.5" aria-hidden />
                          {row.location}
                        </p>
                      )}

                      <div className="mt-auto flex flex-wrap gap-2 pt-2">
                        <Button
                          size="sm"
                          className="gap-1.5 bg-forest-700 hover:bg-forest-600"
                          onClick={() => setRequestFor({ row, type: "sample" })}
                        >
                          <Package className="size-3.5" aria-hidden />
                          Request Sample
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          onClick={() => setRequestFor({ row, type: "quote" })}
                        >
                          <MessageSquareQuote className="size-3.5" aria-hidden />
                          Request Quote
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1.5 text-navy-700"
                          onClick={() => setDetailId(row.id)}
                        >
                          <FileText className="size-3.5" aria-hidden />
                          Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>

      {/* Detail dialog */}
      <Dialog open={Boolean(detail)} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent className="max-h-[85dvh] max-w-lg overflow-y-auto bg-cream-50">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="text-left">
                  {detail.row.materialName}
                  <span className="block text-sm font-normal text-navy-600">
                    {detail.row.companyName}
                  </span>
                </DialogTitle>
                <DialogDescription className="text-left">
                  Packaging details as declared by the seller. Verify all values
                  against datasheets before commercial adoption.
                </DialogDescription>
              </DialogHeader>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px]">
                {[
                  ["Material structure", detail.row.structure || "Data not available"],
                  ["Format", FORM_LABEL[detail.row.form] ?? detail.row.form],
                  ["Thickness", detail.row.thicknessMicron ? `${detail.row.thicknessMicron} µm` : "Data not available"],
                  ["OTR (declared)", fmt(detail.row.otr)],
                  ["WVTR (declared)", fmt(detail.row.wvtr)],
                  ["CO₂TR (declared)", fmt(detail.row.co2tr)],
                  ["Tensile strength", detail.row.tensileStrengthMPa ? `${detail.row.tensileStrengthMPa} MPa` : "Data not available"],
                  ["Sealability", detail.row.sealability.replace("_", " ")],
                  ["Service temp range", detail.row.tempMinC !== null && detail.row.tempMaxC !== null ? `${detail.row.tempMinC} to ${detail.row.tempMaxC} °C` : "Data not available"],
                  ["Food applications", detail.row.foodApplications || "Data not available"],
                  ["MOQ", detail.row.moq || "Data not available"],
                  ["Price range", detail.row.priceRange || "Data not available"],
                  ["Available formats", detail.row.formats || "Data not available"],
                  ["Sustainability", detail.row.sustainabilityNote || "Data not available"],
                  ["Documents / certifications", detail.row.documentsNote || "None provided — verification required"],
                  ["Location", detail.row.location || "Data not available"],
                ].map(([k, v]) => (
                  <div key={k} className={cn("col-span-2 flex justify-between gap-3 border-b border-border/70 pb-1.5", k === "Location" && "border-b-0")}>
                    <dt className="shrink-0 text-navy-600">{k}</dt>
                    <dd className="text-right font-medium text-navy-900">{v}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Request dialog (sample / quote) */}
      <Dialog open={Boolean(requestFor)} onOpenChange={(o) => !o && setRequestFor(null)}>
        <DialogContent className="max-w-md bg-cream-50">
          {requestFor && (
            <>
              <DialogHeader>
                <DialogTitle className="text-left">
                  {requestFor.type === "sample" ? "Request a sample" : "Request a quotation"}
                </DialogTitle>
                <DialogDescription className="text-left">
                  {requestFor.row.materialName} · {requestFor.row.companyName}
                  {wizardInput.commodityName ? ` · for ${wizardInput.commodityName}` : ""}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="buyer-name">Your name *</Label>
                  <Input
                    id="buyer-name"
                    value={buyerForm.name}
                    onChange={(e) => setBuyerForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Priya Sharma"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="buyer-email">Business email *</Label>
                  <Input
                    id="buyer-email"
                    type="email"
                    value={buyerForm.email}
                    onChange={(e) => setBuyerForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="you@company.in"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="buyer-company">Company</Label>
                  <Input
                    id="buyer-company"
                    value={buyerForm.company}
                    onChange={(e) => setBuyerForm((f) => ({ ...f, company: e.target.value }))}
                    placeholder="Your food business"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="buyer-message">
                    {requestFor.type === "sample" ? "What should the sample cover?" : "What should the quote include?"}
                  </Label>
                  <Textarea
                    id="buyer-message"
                    value={buyerForm.message}
                    onChange={(e) => setBuyerForm((f) => ({ ...f, message: e.target.value }))}
                    rows={3}
                    placeholder={
                      wizardInput.commodityName
                        ? `e.g. ${wizardInput.commodityName}, ${wizardInput.targetShelfLifeDays}-day shelf-life target, verify OTR/WVTR and seal integrity…`
                        : "Quantities, target shelf life, properties to verify…"
                    }
                  />
                </div>
                <p className="text-[11px] leading-relaxed text-navy-600">
                  Requests are stored so the seller can respond from their Seller
                  Studio. PackVeda does not verify sellers in this prototype —
                  validate any supplier independently before purchase.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setRequestFor(null)}>
                  Cancel
                </Button>
                <Button onClick={submitRequest} disabled={submitting} className="bg-forest-700 hover:bg-forest-600">
                  {submitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      Sending…
                    </>
                  ) : requestFor.type === "sample" ? (
                    "Send sample request"
                  ) : (
                    "Send quote request"
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default MarketplaceView;
