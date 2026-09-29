// /api/supplier-materials — packaging materials listed by sellers/manufacturers.
//
// Access rules (RLS-equivalent, enforced server-side):
//  - GET (public): only ACTIVE listings are returned to everyone. A signed-in
//    seller requesting ?ownerEmail= receives ONLY their own rows (all
//    statuses) — the filter is forced to the verified token's email, the
//    query param value itself is never trusted.
//  - POST: requires a valid Supabase bearer token — the listing is created
//    for the token's email only (client supplierEmail ignored).
//  - PATCH/DELETE: require a valid token; the row's supplierEmail must equal
//    the verified caller's email, so a seller can only modify their own
//    materials.
// Property values are seller-declared; the UI must present them with
// "verification required" provenance. They never override KB engine data.
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/server-auth";

const UNAUTH = { error: "Sign in required" };

const intensityEnum = z.enum(["none", "low", "moderate", "high", "very_high"]);

const materialSchema = z.object({
  supplierEmail: z.string().email().max(200).optional(),
  companyName: z.string().min(1).max(200),
  materialName: z.string().min(1).max(200),
  structure: z.string().max(300).optional().default(""),
  form: z
    .enum(["film_flexible", "laminate_flexible", "semi_rigid", "rigid", "paper_based"])
    .optional()
    .default("film_flexible"),
  thicknessMicron: z.number().min(1).max(5000).nullable().optional(),
  otr: z.number().min(0).max(1e6).nullable().optional(),
  wvtr: z.number().min(0).max(1e6).nullable().optional(),
  co2tr: z.number().min(0).max(1e6).nullable().optional(),
  tensileStrengthMPa: z.number().min(0).max(1000).nullable().optional(),
  sealability: intensityEnum.optional().default("moderate"),
  aromaBarrier: intensityEnum.optional().default("low"),
  lightBlocking: intensityEnum.optional().default("low"),
  tempMinC: z.number().min(-100).max(100).nullable().optional(),
  tempMaxC: z.number().min(-100).max(400).nullable().optional(),
  foodContactSuitable: z.boolean().optional().default(true),
  foodApplications: z.string().max(500).optional().default(""),
  moq: z.string().max(120).optional().default(""),
  priceRange: z.string().max(120).optional().default(""),
  formats: z.string().max(300).optional().default(""),
  sustainabilityNote: z.string().max(500).optional().default(""),
  documentsNote: z.string().max(500).optional().default(""),
  location: z.string().max(200).optional().default(""),
  contactInfo: z.string().max(300).optional().default(""),
  status: z.enum(["active", "paused"]).optional().default("active"),
});

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const ownerEmail = url.searchParams.get("ownerEmail");
    const id = url.searchParams.get("id");

    // Owner-scoped reads require a verified token. The param value itself is
    // never trusted — the caller's identity comes from the bearer token.
    let user: { id: string; email: string } | null = null;
    if (ownerEmail) {
      user = await getAuthUser(req);
      if (!user) return NextResponse.json(UNAUTH, { status: 401 });
    }

    if (id) {
      const row = await db.supplierMaterial.findUnique({ where: { id } });
      if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
      // Owners may see their own paused rows; others only active ones.
      const isOwner = user !== null && row.supplierEmail === user.email;
      if (row.status !== "active" && !isOwner) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      return NextResponse.json({ material: row });
    }

    if (ownerEmail && user) {
      // Seller's own listings (all statuses) — forced to the verified email.
      const rows = await db.supplierMaterial.findMany({
        where: { supplierEmail: user.email },
        orderBy: { updatedAt: "desc" },
      });
      return NextResponse.json({ materials: rows });
    }

    // Public directory — active only.
    const rows = await db.supplierMaterial.findMany({
      where: { status: "active" },
      orderBy: { updatedAt: "desc" },
      take: 200,
    });
    return NextResponse.json({ materials: rows });
  } catch (err) {
    console.error("supplier-materials GET error", err);
    return NextResponse.json({ error: "Failed to load materials" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json(UNAUTH, { status: 401 });
    const parsed = materialSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid material", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { supplierEmail: _ignored, ...data } = parsed.data;
    // Ownership is derived from the verified token, never the payload.
    const supplierEmail = user.email;
    // Owner must exist and be a seller.
    const owner = await db.profile.findUnique({ where: { email: supplierEmail } });
    if (!owner || owner.role !== "seller") {
      return NextResponse.json(
        { error: "A seller profile is required to list materials." },
        { status: 403 }
      );
    }
    const row = await db.supplierMaterial.create({
      data: { supplierEmail, ...data },
    });
    return NextResponse.json({ material: row }, { status: 201 });
  } catch (err) {
    console.error("supplier-materials POST error", err);
    return NextResponse.json({ error: "Failed to create material" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json(UNAUTH, { status: 401 });
    const body = (await req.json()) as Record<string, unknown>;
    const id = typeof body.id === "string" ? body.id : null;
    const rest: Record<string, unknown> = { ...body };
    delete rest.id;
    delete rest.ownerEmail; // ignored — identity comes from the token
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const existing = await db.supplierMaterial.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    // RLS-equivalent: only the owning seller may modify.
    if (existing.supplierEmail !== user.email) {
      return NextResponse.json({ error: "Not authorised for this material" }, { status: 403 });
    }
    const parsed = materialSchema.partial().safeParse(rest);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid material update", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    // Build a plain update object (skip undefined entries) — Prisma-safe shape.
    // Ownership is immutable: supplierEmail can never be reassigned via PATCH.
    const data: Record<string, string | number | boolean | null> = {};
    for (const [k, v] of Object.entries(parsed.data)) {
      if (v !== undefined && k !== "supplierEmail") data[k] = v;
    }
    const row = await db.supplierMaterial.update({
      where: { id },
      data: data as Parameters<typeof db.supplierMaterial.update>[0]["data"],
    });
    return NextResponse.json({ material: row });
  } catch (err) {
    console.error("supplier-materials PATCH error", err);
    return NextResponse.json({ error: "Failed to update material" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json(UNAUTH, { status: 401 });
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const existing = await db.supplierMaterial.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    // RLS-equivalent: only the owning seller may delete.
    if (existing.supplierEmail !== user.email) {
      return NextResponse.json({ error: "Not authorised for this material" }, { status: 403 });
    }
    await db.supplierMaterial.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("supplier-materials DELETE error", err);
    return NextResponse.json({ error: "Failed to delete material" }, { status: 500 });
  }
}
