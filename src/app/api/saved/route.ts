// /api/saved — saved packaging candidates (Passport / procurement shortlist).
//
// Auth (RLS-equivalent, enforced server-side): every operation requires a
// valid Supabase bearer token. Rows are scoped by ownerEmail, which is
// derived from the verified token — a client-supplied email is ignored.
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/server-auth";

const UNAUTH = { error: "Sign in required" };

export async function GET(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json(UNAUTH, { status: 401 });
    const rows = await db.savedCandidate.findMany({
      where: { ownerEmail: user.email },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { trial: true },
    });
    return NextResponse.json({ saved: rows });
  } catch (err) {
    console.error("saved GET error", err);
    return NextResponse.json({ error: "Failed to load saved candidates" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json(UNAUTH, { status: 401 });
    const body = await req.json();
    const { analysisId, materialId, materialName, commodity, score, notes } = body as {
      analysisId?: string | null;
      materialId: string;
      materialName: string;
      commodity?: string;
      score?: number | null;
      notes?: string | null;
    };
    if (!materialId || !materialName) {
      return NextResponse.json({ error: "materialId and materialName are required" }, { status: 400 });
    }
    const row = await db.savedCandidate.create({
      data: {
        ownerEmail: user.email,
        analysisId: analysisId ?? null,
        materialId,
        materialName,
        commodity: commodity ?? "",
        score: typeof score === "number" ? score : null,
        notes: notes ?? null,
      },
    });
    return NextResponse.json({ saved: row }, { status: 201 });
  } catch (err) {
    console.error("saved POST error", err);
    return NextResponse.json({ error: "Failed to save candidate" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json(UNAUTH, { status: 401 });
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    const row = await db.savedCandidate.findUnique({ where: { id } });
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (row.ownerEmail !== user.email) {
      return NextResponse.json({ error: "Not authorised for this resource" }, { status: 403 });
    }
    await db.savedCandidate.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("saved DELETE error", err);
    return NextResponse.json({ error: "Failed to delete saved candidate" }, { status: 500 });
  }
}
