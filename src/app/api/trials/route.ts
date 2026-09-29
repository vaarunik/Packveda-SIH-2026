// /api/trials — Packaging Trial & Validation records (USER-ENTERED test data).
// Status values: not_tested | planned | in_progress | validated | rejected
// dataJson holds user-entered results: otrResult, wvtrResult, sealStrength,
// compression, weightLoss, moistureChange, oxidationIndicator, microbialIndicator,
// shelfLifeObservation — none of this is produced by the AI.
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
    const rows = await db.trial.findMany({
      where: { ownerEmail: user.email },
      orderBy: { updatedAt: "desc" },
      take: 60,
      include: { candidate: true },
    });
    return NextResponse.json({ trials: rows });
  } catch (err) {
    console.error("trials GET error", err);
    return NextResponse.json({ error: "Failed to load trials" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json(UNAUTH, { status: 401 });
    const body = await req.json();
    const {
      savedCandidateId,
      materialId,
      materialName,
      commodity,
      status,
      data,
      notes,
    } = body as {
      savedCandidateId?: string | null;
      materialId: string;
      materialName: string;
      commodity?: string;
      status?: string;
      data?: Record<string, unknown>;
      notes?: string | null;
    };
    if (!materialId || !materialName) {
      return NextResponse.json({ error: "materialId and materialName are required" }, { status: 400 });
    }
    const row = await db.trial.create({
      data: {
        ownerEmail: user.email,
        savedCandidateId: savedCandidateId ?? null,
        materialId,
        materialName,
        commodity: commodity ?? "",
        status: status ?? "not_tested",
        dataJson: JSON.stringify(data ?? {}),
        notes: notes ?? null,
      },
    });
    return NextResponse.json({ trial: row }, { status: 201 });
  } catch (err) {
    console.error("trials POST error", err);
    return NextResponse.json({ error: "Failed to create trial" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json(UNAUTH, { status: 401 });
    const body = await req.json();
    const { id, status, data, notes } = body as {
      id: string;
      status?: string;
      data?: Record<string, unknown>;
      notes?: string | null;
    };
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    const existing = await db.trial.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.ownerEmail !== user.email) {
      return NextResponse.json({ error: "Not authorised for this resource" }, { status: 403 });
    }
    const row = await db.trial.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(data !== undefined ? { dataJson: JSON.stringify(data) } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
    });
    return NextResponse.json({ trial: row });
  } catch (err) {
    console.error("trials PATCH error", err);
    return NextResponse.json({ error: "Failed to update trial" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json(UNAUTH, { status: 401 });
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    const existing = await db.trial.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (existing.ownerEmail !== user.email) {
      return NextResponse.json({ error: "Not authorised for this resource" }, { status: 403 });
    }
    await db.trial.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("trials DELETE error", err);
    return NextResponse.json({ error: "Failed to delete trial" }, { status: 500 });
  }
}
