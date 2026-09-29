"use client";

// PACKVEDA — Seller / Manufacturer Studio.
//
// Sellers list their packaging materials with real, declared properties.
// IMPORTANT: sellers can NOT manipulate recommendation scores — PackVeda
// matches their material properties against buyer requirements with the same
// deterministic rules used for knowledge-base materials. Seller-declared
// values are always labelled "verification required".
//
// Sections: stats (active materials, sample requests, quote requests, profile
// completeness) · My Packaging Materials (add/edit/pause) · Incoming Requests.

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ClipboardList,
  Factory,
  FileText,
  Loader2,
  MessageSquareQuote,
  Package,
  Pencil,
  Plus,
  Store,
  Trash2,
  TriangleAlert,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BackButton } from "@/components/shared/back-button";
import { EmptyState } from "@/components/shared/empty-state";
import { MaturityBadge } from "@/components/shared/maturity-badge";
import { SectionHeading } from "@/components/shared/section-heading";
import { useToast } from "@/hooks/use-toast";
import { usePackVeda } from "@/lib/store";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

interface SupplierMaterialRow {
  id: string;
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
  foodContactSuitable: boolean;
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

interface RequestRow {
  id: string;
  type: "sample" | "quote";
  status: string;
  buyerName: string;
  buyerEmail: string;
  buyerCompany: string;
  materialName: string;
  companyName: string;
  commodity: string;
  message: string;
  createdAt: string;
}

const FORM_LABEL: Record<string, string> = {
  film_flexible: "Flexible film",
  laminate_flexible: "Flexible laminate",
  semi_rigid: "Semi-rigid",
  rigid: "Rigid",
  paper_based: "Paper-based",
};

const INTENSITY_OPTS = ["none", "low", "moderate", "high", "very_high"] as const;

const EMPTY_FORM = {
  companyName: "",
  materialName: "",
  structure: "",
  form: "film_flexible",
  thicknessMicron: "",
  otr: "",
  wvtr: "",
  co2tr: "",
  tensileStrengthMPa: "",
  sealability: "moderate",
  aromaBarrier: "low",
  lightBlocking: "low",
  tempMinC: "",
  tempMaxC: "",
  foodContactSuitable: true,
  foodApplications: "",
  moq: "",
  priceRange: "",
  formats: "",
  sustainabilityNote: "",
  documentsNote: "",
  location: "",
  contactInfo: "",
  status: "active",
};

type MaterialForm = typeof EMPTY_FORM;

function numOrNull(v: string): number | null {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function Stat({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: React.ElementType;
  value: number | string;
  label: string;
  tone: "forest" | "amber" | "terracotta" | "navy";
}) {
  const tones = {
    forest: "bg-forest-50 text-forest-700",
    amber: "bg-amber-warm-50 text-amber-warm-600",
    terracotta: "bg-terracotta-50 text-terracotta-600",
    navy: "bg-slate-pkv-100 text-slate-pkv-700",
  };
  return (
    <Card>
      <CardContent className="flex items-center gap-3.5 p-4">
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", tones[tone])}>
          <Icon className="size-5" aria-hidden />
        </span>
        <div>
          <p className="text-xl font-bold leading-none text-navy-950">{value}</p>
          <p className="mt-1 text-xs text-navy-600">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function SellerView() {
  const { profile, setView } = usePackVeda();
  const { toast } = useToast();

  const [materials, setMaterials] = useState<SupplierMaterialRow[] | null>(null);
  const [requests, setRequests] = useState<RequestRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MaterialForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const sellerEmail = profile?.role === "seller" ? profile.email : null;

  const load = useCallback(async () => {
    if (!sellerEmail) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [mRes, rRes] = await Promise.all([
        apiFetch(`/api/supplier-materials?ownerEmail=${encodeURIComponent(sellerEmail)}`),
        apiFetch(`/api/requests?sellerEmail=${encodeURIComponent(sellerEmail)}`),
      ]);
      const mData = (await mRes.json()) as { materials?: SupplierMaterialRow[] };
      const rData = (await rRes.json()) as { requests?: RequestRow[] };
      setMaterials(mData.materials ?? []);
      setRequests(rData.requests ?? []);
    } catch {
      setMaterials([]);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [sellerEmail]);

  useEffect(() => {
    load();
  }, [load]);

  function openAdd() {
    if (!profile) {
      setForm({ ...EMPTY_FORM });
      setEditingId(null);
      setEditorOpen(true);
      return;
    }
    setForm({
      ...EMPTY_FORM,
      companyName: profile.company || "",
      location: profile.location || "",
    });
    setEditingId(null);
    setEditorOpen(true);
  }

  function openEdit(m: SupplierMaterialRow) {
    setForm({
      companyName: m.companyName,
      materialName: m.materialName,
      structure: m.structure,
      form: m.form,
      thicknessMicron: m.thicknessMicron?.toString() ?? "",
      otr: m.otr?.toString() ?? "",
      wvtr: m.wvtr?.toString() ?? "",
      co2tr: m.co2tr?.toString() ?? "",
      tensileStrengthMPa: m.tensileStrengthMPa?.toString() ?? "",
      sealability: m.sealability,
      aromaBarrier: m.aromaBarrier,
      lightBlocking: m.lightBlocking,
      tempMinC: m.tempMinC?.toString() ?? "",
      tempMaxC: m.tempMaxC?.toString() ?? "",
      foodContactSuitable: m.foodContactSuitable,
      foodApplications: m.foodApplications,
      moq: m.moq,
      priceRange: m.priceRange,
      formats: m.formats,
      sustainabilityNote: m.sustainabilityNote,
      documentsNote: m.documentsNote,
      location: m.location,
      contactInfo: m.contactInfo,
      status: m.status,
    });
    setEditingId(m.id);
    setEditorOpen(true);
  }

  async function saveMaterial() {
    if (!form.materialName.trim() || !form.companyName.trim()) {
      toast({
        title: "Required fields missing",
        description: "Company name and material name are required.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    try {
      const email = profile?.email;
      const role = profile?.role;
      // If no profile yet, redirect to onboarding to create the seller identity.
      if (!email) {
        toast({
          title: "Seller details required",
          description: "Open Sign in (top right) to create your seller profile first.",
          variant: "destructive",
        });
        setSaving(false);
        setEditorOpen(false);
        setView("onboarding");
        return;
      }
      if (role !== "seller") {
        toast({
          title: "Seller role required",
          description: "Your profile is registered as a buyer. Create a seller profile to list materials.",
          variant: "destructive",
        });
        setSaving(false);
        setEditorOpen(false);
        setView("onboarding");
        return;
      }
      const payload = {
        supplierEmail: email,
        companyName: form.companyName.trim(),
        materialName: form.materialName.trim(),
        structure: form.structure.trim(),
        form: form.form,
        thicknessMicron: numOrNull(form.thicknessMicron),
        otr: numOrNull(form.otr),
        wvtr: numOrNull(form.wvtr),
        co2tr: numOrNull(form.co2tr),
        tensileStrengthMPa: numOrNull(form.tensileStrengthMPa),
        sealability: form.sealability,
        aromaBarrier: form.aromaBarrier,
        lightBlocking: form.lightBlocking,
        tempMinC: numOrNull(form.tempMinC),
        tempMaxC: numOrNull(form.tempMaxC),
        foodContactSuitable: form.foodContactSuitable,
        foodApplications: form.foodApplications.trim(),
        moq: form.moq.trim(),
        priceRange: form.priceRange.trim(),
        formats: form.formats.trim(),
        sustainabilityNote: form.sustainabilityNote.trim(),
        documentsNote: form.documentsNote.trim(),
        location: form.location.trim(),
        contactInfo: form.contactInfo.trim(),
        status: form.status,
      };
      const res = await apiFetch(
        editingId ? "/api/supplier-materials" : "/api/supplier-materials",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editingId ? { id: editingId, ownerEmail: email, ...payload } : payload),
        }
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not save the material");
      toast({
        title: editingId ? "Material updated" : "Material listed",
        description: `${payload.materialName} is now ${payload.status === "active" ? "visible to buyers" : "paused"}.`,
      });
      setEditorOpen(false);
      load();
    } catch (err) {
      toast({
        title: "Could not save material",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(m: SupplierMaterialRow) {
    if (!sellerEmail) return;
    try {
      const res = await apiFetch("/api/supplier-materials", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: m.id,
          ownerEmail: sellerEmail,
          status: m.status === "active" ? "paused" : "active",
        }),
      });
      if (!res.ok) throw new Error("Could not change status");
      load();
    } catch (err) {
      toast({
        title: "Update failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  }

  async function removeMaterial(m: SupplierMaterialRow) {
    if (!sellerEmail) return;
    try {
      const res = await apiFetch(
        `/api/supplier-materials?id=${m.id}&ownerEmail=${encodeURIComponent(sellerEmail)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Could not delete the material");
      toast({ title: "Material removed", description: m.materialName });
      load();
    } catch (err) {
      toast({
        title: "Delete failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  }

  async function respond(r: RequestRow, status: "responded" | "closed") {
    if (!sellerEmail) return;
    try {
      const res = await apiFetch("/api/requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: r.id, ownerEmail: sellerEmail, status }),
      });
      if (!res.ok) throw new Error("Could not update the request");
      toast({ title: status === "responded" ? "Marked as responded" : "Request closed" });
      load();
    } catch (err) {
      toast({
        title: "Update failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  }

  const activeCount = materials?.filter((m) => m.status === "active").length ?? 0;
  const sampleCount = requests?.filter((r) => r.type === "sample").length ?? 0;
  const quoteCount = requests?.filter((r) => r.type === "quote").length ?? 0;
  const profileCompleteness = useMemo(() => {
    if (!profile) return 0;
    const fields = [profile.name, profile.email, profile.company, profile.location];
    return Math.round((fields.filter((f) => f && f.trim()).length / fields.length) * 100);
  }, [profile]);

  // ----------------------------- Not signed in -----------------------------
  if (!profile || profile.role !== "seller") {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        <BackButton label="Back" fallback="home" />
        <div className="mt-6">
          <EmptyState
            icon={Factory}
            title={profile ? "Your profile is registered as a Food Business" : "Sign in to open the Seller Studio"}
            description={
              profile
                ? "To list packaging materials you need a seller (manufacturer) profile. You can create one in seconds — your buyer data stays untouched."
                : "The Seller Studio lets packaging manufacturers list materials (structure, OTR, WVTR, MOQ, applications) and receive matched sample & quote requests from food businesses."
            }
            actionLabel={profile ? "Create seller profile" : "Continue as Seller"}
            onAction={() => setView("onboarding")}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BackButton label="Back to Dashboard" fallback="dashboard" />
        <MaturityBadge status="prototype" label="Prototype — seller network" />
      </div>

      <SectionHeading
        eyebrow="Packaging Manufacturer"
        title={`Seller Studio${profile.company ? ` — ${profile.company}` : ""}`}
        description="List your packaging materials with real properties. PackVeda matches them against buyer requirements — you cannot edit scores, and honesty about your data builds buyer trust."
        className="mt-4 items-start text-left"
      />

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Store} value={activeCount} label="Active materials" tone="forest" />
        <Stat icon={Package} value={sampleCount} label="Sample requests" tone="terracotta" />
        <Stat icon={MessageSquareQuote} value={quoteCount} label="Quote requests" tone="amber" />
        <Stat icon={ClipboardList} value={`${profileCompleteness}%`} label="Profile completeness" tone="navy" />
      </div>

      {profileCompleteness < 100 && (
        <Alert className="mt-4 border-amber-warm-600/30 bg-amber-warm-50">
          <TriangleAlert className="size-4" aria-hidden />
          <AlertTitle>Complete your profile</AlertTitle>
          <AlertDescription className="text-[13px]">
            Add your company name and location (via Sign in → profile) so buyers can
            find and trust your listings.
          </AlertDescription>
        </Alert>
      )}

      {/* My Packaging Materials */}
      <section aria-labelledby="materials-heading" className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="materials-heading" className="text-sm font-bold uppercase tracking-wider text-navy-800">
            My Packaging Materials
          </h2>
          <Button onClick={openAdd} className="gap-1.5 bg-forest-700 hover:bg-forest-600">
            <Plus className="size-4" aria-hidden />
            Add Material
          </Button>
        </div>

        {loading ? (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-8 text-sm text-navy-600">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Loading your listings…
          </div>
        ) : !materials || materials.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={FileText}
              title="No materials listed yet"
              description="Add your first packaging material — structure, barrier properties, MOQ, applications and location. Buyers with matching requirements will find it in the Marketplace."
              actionLabel="Add your first material"
              onAction={openAdd}
            />
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-xl border border-border">
            <div className="scroll-slim overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-[13px]">
                <thead className="bg-cream-100 text-[11px] uppercase tracking-wider text-navy-700">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Material</th>
                    <th className="px-4 py-3 font-semibold">Structure</th>
                    <th className="px-4 py-3 font-semibold">Barrier (OTR / WVTR)</th>
                    <th className="px-4 py-3 font-semibold">MOQ</th>
                    <th className="px-4 py-3 font-semibold">Applications</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-white">
                  {materials.map((m) => (
                    <tr key={m.id} className="transition-colors hover:bg-cream-50">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-navy-950">{m.materialName}</p>
                        <p className="text-[11px] text-navy-600">{FORM_LABEL[m.form] ?? m.form}{m.thicknessMicron ? ` · ${m.thicknessMicron} µm` : ""}</p>
                      </td>
                      <td className="max-w-[180px] px-4 py-3 text-navy-700">
                        <span className="line-clamp-2">{m.structure || "Data not available"}</span>
                      </td>
                      <td className="px-4 py-3 text-navy-700">
                        {m.otr !== null || m.wvtr !== null ? (
                          <>
                            {m.otr !== null ? m.otr : "—"} / {m.wvtr !== null ? m.wvtr : "—"}
                            <span className="ml-1 text-[10px] text-navy-500">cc · g/m²/day</span>
                          </>
                        ) : (
                          <span className="text-[11.5px] text-amber-warm-600">Not provided — verification required</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-navy-700">{m.moq || "—"}</td>
                      <td className="max-w-[160px] px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {m.foodApplications
                            .split(",")
                            .map((a) => a.trim())
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((a) => (
                              <Badge key={a} variant="outline" className="border-terracotta-500/25 bg-terracotta-50 text-[10px] font-medium text-terracotta-700">
                                {a}
                              </Badge>
                            ))}
                          {m.foodApplications.split(",").filter((a) => a.trim()).length > 2 && (
                            <Badge variant="outline" className="border-navy-800/15 text-[10px] text-navy-600">+more</Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleStatus(m)}
                          title="Click to toggle"
                          className="focus-visible:outline-2 focus-visible:outline-ring"
                        >
                          <Badge
                            variant="outline"
                            className={cn(
                              "cursor-pointer text-[10.5px] font-semibold",
                              m.status === "active"
                                ? "border-forest-600/30 bg-forest-50 text-forest-800"
                                : "border-navy-600/20 bg-cream-200 text-navy-600"
                            )}
                          >
                            {m.status === "active" ? "Active" : "Paused"}
                          </Badge>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" className="gap-1 text-navy-700" onClick={() => openEdit(m)}>
                            <Pencil className="size-3.5" aria-hidden />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1 text-red-700 hover:bg-red-50"
                            onClick={() => removeMaterial(m)}
                          >
                            <Trash2 className="size-3.5" aria-hidden />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <p className="mt-2 text-[11.5px] text-navy-600">
          Property values you enter are shown to buyers as{" "}
          <span className="font-medium text-amber-warm-600">seller-declared · verification required</span>.
          They never alter PackVeda&apos;s recommendation scores — matching is computed
          from your declared properties against each buyer&apos;s requirements.
        </p>
      </section>

      {/* Incoming requests */}
      <section aria-labelledby="requests-heading" className="mt-10">
        <h2 id="requests-heading" className="text-sm font-bold uppercase tracking-wider text-navy-800">
          Incoming Requests
        </h2>
        {!requests || requests.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-border bg-card/60 px-4 py-6 text-center text-sm text-navy-600">
            No sample or quote requests yet. Requests from food businesses that match
            your materials will appear here.
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {requests.map((r) => (
              <motion.div
                key={r.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card>
                  <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10.5px] font-semibold",
                            r.type === "sample"
                              ? "border-terracotta-500/30 bg-terracotta-50 text-terracotta-700"
                              : "border-amber-warm-600/30 bg-amber-warm-50 text-amber-warm-600"
                          )}
                        >
                          {r.type === "sample" ? "Sample request" : "Quote request"}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10.5px] font-semibold",
                            r.status === "pending"
                              ? "border-slate-pkv-500/30 bg-slate-pkv-100 text-slate-pkv-700"
                              : "border-forest-600/30 bg-forest-50 text-forest-800"
                          )}
                        >
                          {r.status}
                        </Badge>
                        <span className="text-[12px] text-navy-600">
                          {new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[13.5px] font-semibold text-navy-950">
                        {r.buyerName}
                        {r.buyerCompany ? ` · ${r.buyerCompany}` : ""}
                        <span className="ml-2 font-normal text-navy-600">{r.buyerEmail}</span>
                      </p>
                      <p className="text-[12.5px] text-navy-700">
                        Interested in <span className="font-medium">{r.materialName}</span>
                        {r.commodity ? ` for ${r.commodity}` : ""}
                      </p>
                      {r.message && (
                        <p className="mt-1.5 rounded-md bg-cream-100 px-3 py-2 text-[12.5px] leading-relaxed text-navy-800">
                          &ldquo;{r.message}&rdquo;
                        </p>
                      )}
                    </div>
                    {r.status === "pending" && (
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => respond(r, "responded")}>
                          Mark responded
                        </Button>
                        <Button size="sm" variant="ghost" className="text-navy-600" onClick={() => respond(r, "closed")}>
                          Close
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Add / Edit material dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-h-[88dvh] max-w-2xl overflow-y-auto bg-cream-50">
          <DialogHeader>
            <DialogTitle className="text-left">
              {editingId ? "Edit material" : "Add packaging material"}
            </DialogTitle>
            <DialogDescription className="text-left">
              Enter your material&apos;s real properties. Leave a field empty if you
              don&apos;t have verified data — PackVeda will show &ldquo;verification
              required&rdquo; rather than guessing.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Company name *</Label>
              <Input value={form.companyName} onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))} placeholder="Your company" />
            </div>
            <div className="grid gap-1.5">
              <Label>Material name *</Label>
              <Input value={form.materialName} onChange={(e) => setForm((f) => ({ ...f, materialName: e.target.value }))} placeholder="e.g. High-barrier PET/PE laminate" />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label>Material structure</Label>
              <Input value={form.structure} onChange={(e) => setForm((f) => ({ ...f, structure: e.target.value }))} placeholder="e.g. 12 µm PET + 7 µm foil + 50 µm PE sealant" />
            </div>
            <div className="grid gap-1.5">
              <Label>Packaging type</Label>
              <Select value={form.form} onValueChange={(v) => setForm((f) => ({ ...f, form: v }))}>
                <SelectTrigger aria-label="Packaging type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(FORM_LABEL).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Thickness (µm)</Label>
              <Input type="number" min="1" value={form.thicknessMicron} onChange={(e) => setForm((f) => ({ ...f, thicknessMicron: e.target.value }))} placeholder="e.g. 70" />
            </div>

            <div className="sm:col-span-2 mt-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-navy-700">Barrier properties (declared)</p>
            </div>
            <div className="grid gap-1.5">
              <Label>OTR — cc/m²/day</Label>
              <Input type="number" min="0" step="any" value={form.otr} onChange={(e) => setForm((f) => ({ ...f, otr: e.target.value }))} placeholder="Leave empty if unknown" />
            </div>
            <div className="grid gap-1.5">
              <Label>WVTR — g/m²/day</Label>
              <Input type="number" min="0" step="any" value={form.wvtr} onChange={(e) => setForm((f) => ({ ...f, wvtr: e.target.value }))} placeholder="Leave empty if unknown" />
            </div>
            <div className="grid gap-1.5">
              <Label>CO₂TR — cc/m²/day</Label>
              <Input type="number" min="0" step="any" value={form.co2tr} onChange={(e) => setForm((f) => ({ ...f, co2tr: e.target.value }))} placeholder="Leave empty if unknown" />
            </div>
            <div className="grid gap-1.5">
              <Label>Tensile strength (MPa)</Label>
              <Input type="number" min="0" step="any" value={form.tensileStrengthMPa} onChange={(e) => setForm((f) => ({ ...f, tensileStrengthMPa: e.target.value }))} placeholder="Leave empty if unknown" />
            </div>

            <div className="grid gap-1.5">
              <Label>Sealability</Label>
              <Select value={form.sealability} onValueChange={(v) => setForm((f) => ({ ...f, sealability: v }))}>
                <SelectTrigger aria-label="Sealability"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INTENSITY_OPTS.map((o) => (
                    <SelectItem key={o} value={o}>{o.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Aroma barrier</Label>
              <Select value={form.aromaBarrier} onValueChange={(v) => setForm((f) => ({ ...f, aromaBarrier: v }))}>
                <SelectTrigger aria-label="Aroma barrier"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INTENSITY_OPTS.map((o) => (
                    <SelectItem key={o} value={o}>{o.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Light blocking</Label>
              <Select value={form.lightBlocking} onValueChange={(v) => setForm((f) => ({ ...f, lightBlocking: v }))}>
                <SelectTrigger aria-label="Light blocking"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INTENSITY_OPTS.map((o) => (
                    <SelectItem key={o} value={o}>{o.replace("_", " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Temp min (°C)</Label>
                <Input type="number" step="any" value={form.tempMinC} onChange={(e) => setForm((f) => ({ ...f, tempMinC: e.target.value }))} placeholder="e.g. -20" />
              </div>
              <div className="grid gap-1.5">
                <Label>Temp max (°C)</Label>
                <Input type="number" step="any" value={form.tempMaxC} onChange={(e) => setForm((f) => ({ ...f, tempMaxC: e.target.value }))} placeholder="e.g. 90" />
              </div>
            </div>

            <div className="sm:col-span-2 mt-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-navy-700">Commercial information</p>
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label>Food applications (comma-separated)</Label>
              <Input value={form.foodApplications} onChange={(e) => setForm((f) => ({ ...f, foodApplications: e.target.value }))} placeholder="e.g. Spices, Dairy powders, Snacks" />
            </div>
            <div className="grid gap-1.5">
              <Label>Minimum order quantity</Label>
              <Input value={form.moq} onChange={(e) => setForm((f) => ({ ...f, moq: e.target.value }))} placeholder="e.g. 500 kg" />
            </div>
            <div className="grid gap-1.5">
              <Label>Price range</Label>
              <Input value={form.priceRange} onChange={(e) => setForm((f) => ({ ...f, priceRange: e.target.value }))} placeholder="e.g. ₹180–260 / kg" />
            </div>
            <div className="grid gap-1.5">
              <Label>Available formats</Label>
              <Input value={form.formats} onChange={(e) => setForm((f) => ({ ...f, formats: e.target.value }))} placeholder="e.g. Rolls, Pouches, Liner bags" />
            </div>
            <div className="grid gap-1.5">
              <Label>Location</Label>
              <Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="City, State" />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label>Sustainability information</Label>
              <Textarea rows={2} value={form.sustainabilityNote} onChange={(e) => setForm((f) => ({ ...f, sustainabilityNote: e.target.value }))} placeholder="e.g. Recyclable PE monostructure; compostable options available" />
            </div>
            <div className="grid gap-1.5 sm:col-span-2">
              <Label>Certifications / documents</Label>
              <Textarea rows={2} value={form.documentsNote} onChange={(e) => setForm((f) => ({ ...f, documentsNote: e.target.value }))} placeholder="List documents you can share (e.g. food-grade declaration). PackVeda displays them as seller-provided." />
            </div>
            <div className="grid gap-1.5">
              <Label>Contact information</Label>
              <Input value={form.contactInfo} onChange={(e) => setForm((f) => ({ ...f, contactInfo: e.target.value }))} placeholder="Phone / email shown to buyers on request" />
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border bg-white px-3 py-2.5">
              <Switch checked={form.status === "active"} onCheckedChange={(c) => setForm((f) => ({ ...f, status: c ? "active" : "paused" }))} aria-label="Listing active" />
              <div className="text-[12.5px]">
                <p className="font-medium text-navy-900">Listing active</p>
                <p className="text-navy-600">Visible in the Marketplace and matching</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 sm:col-span-2 rounded-lg border border-amber-warm-600/25 bg-amber-warm-50 px-3 py-2.5 text-[12px] leading-relaxed text-navy-800">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-warm-600" aria-hidden />
              PackVeda may pause listings with unverifiable claims. Provide data you
              can back with datasheets — buyers verify before adoption.
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button>
            <Button onClick={saveMaterial} disabled={saving} className="bg-forest-700 hover:bg-forest-600">
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Saving…
                </>
              ) : editingId ? (
                "Save changes"
              ) : (
                <>
                  <Plus className="size-4" aria-hidden />
                  List material
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default SellerView;
