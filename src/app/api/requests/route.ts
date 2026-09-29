// /api/requests — sample & quote requests between buyers and seller listings.
//
// Access rules (RLS-equivalent, enforced server-side):
//  - All operations require a valid Supabase bearer token.
//  - POST: any signed-in buyer may create a request against an ACTIVE listing;
//    buyerEmail is forced from the verified token (client value ignored).
//  - GET: ?buyerEmail= (must equal the token's email) returns the buyer's own
//    requests; ?sellerEmail= (must equal the token's email) returns requests
//    only for listings owned by that seller.
//  - PATCH: only the owning seller (ownerEmail, verified against the token)
//    can update status.
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/server-auth";

const UNAUTH = { error: "Sign in required" };
const FORBIDDEN = { error: "Not authorised for this resource" };

const createSchema = z.object({
  type: z.enum(["sample", "quote"]),
  // buyerEmail now comes from the verified token; kept optional for
  // backward-compatible payloads but always overridden server-side.
  buyerEmail: z.string().email().max(200).optional(),
  buyerName: z.string().min(1).max(120),
  buyerCompany: z.string().max(200).optional().default(""),
  supplierMaterialId: z.string().min(1),
  message: z.string().max(2000).optional().default(""),
  commodity: z.string().max(200).optional().default(""),
});

export async function GET(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json(UNAUTH, { status: 401 });
    const url = new URL(req.url);
    const buyerEmail = url.searchParams.get("buyerEmail");
    const sellerEmail = url.searchParams.get("sellerEmail");
    if (!buyerEmail && !sellerEmail) {
      return NextResponse.json(
        { error: "buyerEmail or sellerEmail is required" },
        { status: 400 }
      );
    }
    // Identity params must match the verified caller — no scoping by spoofed email.
    if (buyerEmail && buyerEmail !== user.email) {
      return NextResponse.json(FORBIDDEN, { status: 403 });
    }
    if (sellerEmail && sellerEmail !== user.email) {
      return NextResponse.json(FORBIDDEN, { status: 403 });
    }
    if (buyerEmail) {
      const rows = await db.packRequest.findMany({
        where: { buyerEmail },
        orderBy: { createdAt: "desc" },
        take: 100,
      });
      return NextResponse.json({ requests: rows });
    }
    // Seller scope: only requests for listings they own.
    const rows = await db.packRequest.findMany({
      where: { supplierEmail: sellerEmail! },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ requests: rows });
  } catch (err) {
    console.error("requests GET error", err);
    return NextResponse.json({ error: "Failed to load requests" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json(UNAUTH, { status: 401 });
    const parsed = createSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const data = parsed.data;
    const listing = await db.supplierMaterial.findUnique({
      where: { id: data.supplierMaterialId },
    });
    if (!listing || listing.status !== "active") {
      return NextResponse.json({ error: "This listing is not available." }, { status: 404 });
    }
    const row = await db.packRequest.create({
      data: {
        type: data.type,
        buyerEmail: user.email, // forced from the verified token
        buyerName: data.buyerName,
        buyerCompany: data.buyerCompany ?? "",
        supplierEmail: listing.supplierEmail,
        supplierMaterialId: listing.id,
        materialName: listing.materialName,
        companyName: listing.companyName,
        commodity: data.commodity ?? "",
        message: data.message ?? "",
      },
    });
    return NextResponse.json({ request: row }, { status: 201 });
  } catch (err) {
    console.error("requests POST error", err);
    return NextResponse.json({ error: "Failed to create request" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json(UNAUTH, { status: 401 });
    const body = await req.json();
    const { id, ownerEmail, status } = body as {
      id?: string;
      ownerEmail?: string;
      status?: string;
    };
    if (!id || !ownerEmail || !status) {
      return NextResponse.json(
        { error: "id, ownerEmail and status are required" },
        { status: 400 }
      );
    }
    if (!["pending", "responded", "closed"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    // The claimed owner must be the verified caller.
    if (ownerEmail !== user.email) {
      return NextResponse.json(FORBIDDEN, { status: 403 });
    }
    const existing = await db.packRequest.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    // RLS-equivalent: only the seller who owns the listing can update.
    if (existing.supplierEmail !== ownerEmail) {
      return NextResponse.json({ error: "Not authorised for this request" }, { status: 403 });
    }
    const row = await db.packRequest.update({ where: { id }, data: { status } });
    return NextResponse.json({ request: row });
  } catch (err) {
    console.error("requests PATCH error", err);
    return NextResponse.json({ error: "Failed to update request" }, { status: 500 });
  }
}
