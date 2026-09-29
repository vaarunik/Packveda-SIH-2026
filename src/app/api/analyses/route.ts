// /api/analyses — history of saved analysis runs.
//
// Auth (RLS-equivalent, enforced server-side): every operation requires a
// valid Supabase bearer token. Rows are scoped by ownerEmail, which is
// derived from the verified token — a client-supplied email is ignored.
//
// Evidence & Sources: POST accepts an optional `sources` array of structured
// citation rows (derived by src/lib/evidence.ts). Rows are persisted to the
// analysis_sources table so traceability outlives the session. URL/claim
// fields are length-capped and never trusted for authorization.
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/server-auth";

const UNAUTH = { error: "Sign in required" };

const sourceRowSchema = z.object({
  sourceType: z.enum(["regulatory", "standards", "scientific", "technical", "database", "validation"]),
  sourceName: z.string().min(1).max(200),
  title: z.string().max(300).optional().default(""),
  description: z.string().max(600).optional().default(""),
  url: z.string().url().max(500).nullable().optional(),
  publicationYear: z.number().int().min(1900).max(2100).nullable().optional(),
  sourceVersion: z.string().max(80).nullable().optional(),
  parameterSupported: z.string().max(300).optional().default(""),
  confidenceLevel: z.enum(["high", "medium", "low"]).optional().default("medium"),
  parameter: z.string().max(120).optional().default(""),
  claim: z.string().max(600).optional().default(""),
  value: z.string().max(200).nullable().optional(),
  origin: z.enum(["source_derived", "ai_inferred", "user_provided", "estimated"]).optional().default("source_derived"),
});

const sourcesSchema = z.array(sourceRowSchema).max(60).optional();

export async function GET(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json(UNAUTH, { status: 401 });
    const rows = await db.analysis.findMany({
      where: { ownerEmail: user.email },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: { sources: { orderBy: { createdAt: "asc" } } },
    });
    return NextResponse.json({ analyses: rows });
  } catch (err) {
    console.error("analyses GET error", err);
    return NextResponse.json({ error: "Failed to load analyses" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json(UNAUTH, { status: 401 });
    const body = await req.json();
    const { label, commodity, inputsJson, resultJson } = body as Record<string, string>;
    if (!label || !inputsJson || !resultJson) {
      return NextResponse.json({ error: "label, inputsJson and resultJson are required" }, { status: 400 });
    }
    const sources = sourcesSchema.safeParse(body.sources);
    const row = await db.analysis.create({
      data: {
        ownerEmail: user.email,
        label,
        commodity: commodity ?? "",
        inputsJson,
        resultJson,
        ...(sources.success && sources.data && sources.data.length > 0
          ? { sources: { create: sources.data.map((s) => ({ ...s })) } }
          : {}),
      },
      include: { sources: true },
    });
    return NextResponse.json({ analysis: row }, { status: 201 });
  } catch (err) {
    console.error("analyses POST error", err);
    return NextResponse.json({ error: "Failed to save analysis" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json(UNAUTH, { status: 401 });
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
    const row = await db.analysis.findUnique({ where: { id } });
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (row.ownerEmail !== user.email) {
      return NextResponse.json({ error: "Not authorised for this resource" }, { status: 403 });
    }
    await db.analysis.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("analyses DELETE error", err);
    return NextResponse.json({ error: "Failed to delete analysis" }, { status: 500 });
  }
}
