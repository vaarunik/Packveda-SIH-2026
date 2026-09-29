// /api/profile — lightweight prototype identity (buyer vs seller role).
// In a production/Supabase deployment this maps to the `profiles` table keyed
// by the authenticated user; here it is keyed by a unique email so the same
// relational structure and role-based access rules can be preserved.
//
// Auth (RLS-equivalent, enforced server-side): every operation requires a
// valid Supabase bearer token. The email is derived from the verified token —
// a client-supplied email is never trusted for identity.
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/server-auth";

const UNAUTH = { error: "Sign in required" };

const profileSchema = z.object({
  role: z.enum(["buyer", "seller"]),
  name: z.string().min(1).max(120),
  email: z.string().email().max(200),
  company: z.string().max(200).optional().default(""),
  phone: z.string().max(40).optional().default(""),
  location: z.string().max(200).optional().default(""),
});

export async function GET(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json(UNAUTH, { status: 401 });
    const email = new URL(req.url).searchParams.get("email");
    if (!email) return NextResponse.json({ error: "email is required" }, { status: 400 });
    // Callers may only read their own profile.
    if (email !== user.email) {
      return NextResponse.json({ error: "Not authorised for this resource" }, { status: 403 });
    }
    const profile = await db.profile.findUnique({ where: { email } });
    return NextResponse.json({ profile: profile ?? null });
  } catch (err) {
    console.error("profile GET error", err);
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) return NextResponse.json(UNAUTH, { status: 401 });
    const parsed = profileSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid profile", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    // The profile email is forced to the verified token's email — a caller can
    // only create/update their own profile, no matter what the payload says.
    const data = { ...parsed.data, email: user.email };
    const profile = await db.profile.upsert({
      where: { email: data.email },
      create: data,
      update: {
        role: data.role,
        name: data.name,
        company: data.company ?? "",
        phone: data.phone ?? "",
        location: data.location ?? "",
      },
    });
    return NextResponse.json({ profile }, { status: 201 });
  } catch (err) {
    console.error("profile POST error", err);
    return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });
  }
}
