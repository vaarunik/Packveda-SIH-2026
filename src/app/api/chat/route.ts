// POST /api/chat — PACKVEDA AI Assistant (backend LLM).
//
// Provider chain:
//   1. Groq (primary)  — OpenAI-compatible endpoint, model from GROQ_MODEL env
//                        (default: openai/gpt-oss-120b). Key never leaves server.
//   2. PackVeda core   — z-ai-web-dev-sdk fallback so the assistant stays
//                        available if Groq is unreachable / unauthorised.
//
// The assistant ONLY explains/interprets PackVeda data (glossary terms, the
// user's current analysis result, general packaging-science concepts).
// It is instructed to never invent OTR/WVTR values, certifications, suppliers,
// laboratory or regulatory results — unavailable info must be declared as such.
// Scientific values always come from the structured context below, not the LLM.
//
// Auth: this is the authenticated AI assistant — a valid Supabase bearer
// token is required; unauthenticated callers receive 401.
import { NextResponse } from "next/server";
import { z } from "zod";
import ZAI from "z-ai-web-dev-sdk";
import { GLOSSARY } from "@/lib/glossary";
import { getAuthUser } from "@/lib/server-auth";
import { SOURCE_REGISTRY } from "@/lib/data/sources";

export const runtime = "nodejs";
export const maxDuration = 60;

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = process.env.GROQ_MODEL?.trim() || "openai/gpt-oss-120b";
const GROQ_API_KEY = process.env.GROQ_API_KEY?.trim() || "";

const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

const bodySchema = z.object({
  messages: z.array(chatMessageSchema).min(1).max(24),
  context: z
    .object({
      view: z.string().max(40).optional(),
      commodity: z.string().max(120).optional(),
      requirementSummary: z.string().max(2000).optional(),
      topCandidates: z.string().max(3000).optional(),
      selectedMaterial: z.string().max(1500).optional(),
    })
    .optional(),
});

type ChatTurn = { role: "system" | "user" | "assistant"; content: string };

function buildSystemPrompt(ctx: z.infer<typeof bodySchema>["context"]): string {
  const glossaryText = Object.values(GLOSSARY)
    .map((v) => `- ${v.term} — ${v.definition}`)
    .join("\n");

  // Genuine source registry — the ONLY sources the assistant may cite.
  const sourcesText = SOURCE_REGISTRY.map((s) => {
    const link = s.url ? ` (${s.url})` : " — no public link recorded";
    return `- ${s.name} [${s.category}] — ${s.description}${link}`;
  }).join("\n");

  return `You are the PACKVEDA AI Assistant — a packaging-science explainer inside PackVeda, an intelligent food-packaging decision-support platform (Smart India Hackathon 2026, PS 26236).

YOUR ROLE
- Explain packaging materials, OTR, WVTR, CO2 transmission, moisture/oxygen barriers, shelf life, storage conditions, packaging requirements, terminology, and how to interpret PackVeda results.
- When the user shares analysis context, explain WHY a material was recommended, why another is only a partial match, and what the requirements mean — using ONLY the data provided below.
- Be concise (2-5 short paragraphs or a tight bullet list), practical and scientific. Use simple language first, then the technical term.

HARD RULES — DATA INTEGRITY
- NEVER invent numeric values: no OTR, WVTR, CO2TR, thickness, strength, certifications (FSSAI/ISO/BRC), supplier names, laboratory results, regulatory approvals, or test outcomes.
- If a value is not present in the context or is unknown, say exactly that (e.g. "That value is not available here — check the supplier datasheet / run a lab test").
- Never guarantee shelf life, compliance, or performance. PackVeda outputs are decision support: "AI recommends -> Testing validates -> Expert approves".
- Do not claim PackVeda uses blockchain, live traceability, or a verified supplier network — those are prototype/future concepts.
- If asked something unrelated to food packaging, politely steer back.

GLOSSARY (use for definitions):
${glossaryText}

SOURCES YOU MAY CITE (the ONLY sources that exist in PackVeda's knowledge base):
${sourcesText}

CITATION RULES (evidence transparency)
- When you state a fact that genuinely comes from one of the sources above, append a bracketed tag right after the claim, e.g. [Source: FSSAI] or [Source: USDA FoodData Central].
- If you do not have a reliable source for a claim in the knowledge base, say so explicitly (e.g. "I don't have a reliable source for that in the current knowledge base.").
- NEVER fabricate paper titles, authors, journal names, URLs, DOIs, standard numbers (IS/ASTM/ISO), FSSAI clause numbers, certifications, or laboratory results — not even "representative" ones.
- PackVeda's material property values are INDICATIVE class-level literature ranges, not measurements of a specific product: present them as such.
- Regulatory wording: "aligned with applicable FSSAI requirements" / "compliance verification required" — NEVER "FSSAI certified" or "BIS approved".
- AI recommendations are decision-support outputs; final suitability requires physical testing, regulatory verification and product-specific validation.
${
  ctx
    ? `

CURRENT USER CONTEXT (authoritative — cite it, do not contradict it):
${[
  ctx.view ? `Screen: ${ctx.view}` : "",
  ctx.commodity ? `Commodity being analysed: ${ctx.commodity}` : "",
  ctx.requirementSummary
    ? `Derived packaging requirements (from the deterministic engine):\n${ctx.requirementSummary}`
    : "",
  ctx.topCandidates ? `Engine top candidates (name | score | status | matches/gaps):\n${ctx.topCandidates}` : "",
  ctx.selectedMaterial ? `Material the user is looking at:\n${ctx.selectedMaterial}` : "",
]
  .filter(Boolean)
  .join("\n")}`
    : ""
}

When the user asks "why was this material recommended?", walk through the matches (✓) and limitations (⚠) from the context above in plain language.`;
}

/** Groq (OpenAI-compatible) call. Returns null on any failure so caller can fall back. */
async function callGroq(systemPrompt: string, turns: ChatTurn[]): Promise<string | null> {
  if (!GROQ_API_KEY) return null;
  try {
    const body: Record<string, unknown> = {
      model: GROQ_MODEL,
      messages: [{ role: "system", content: systemPrompt }, ...turns],
      temperature: 0.4,
      max_completion_tokens: 2048,
    };
    // reasoning_effort is only valid for GPT-OSS family models on Groq
    if (/gpt-oss/i.test(GROQ_MODEL)) body.reasoning_effort = "medium";

    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(45_000),
    });

    if (!res.ok) {
      const errText = (await res.text()).slice(0, 400);
      console.error(`groq error ${res.status}: ${errText}`);
      return null;
    }
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content?.trim();
    return content || null;
  } catch (err) {
    console.error("groq request failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

/** PackVeda core (z-ai-web-dev-sdk) fallback. */
async function callCore(systemPrompt: string, turns: ChatTurn[]): Promise<string | null> {
  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: "assistant", content: systemPrompt },
        ...turns.map((t) => ({ role: t.role as "user" | "assistant", content: t.content })),
      ],
      thinking: { type: "disabled" },
    });
    return completion.choices[0]?.message?.content?.trim() || null;
  } catch (err) {
    console.error("core llm error", err);
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json(
        { error: "Sign in to use Ask PackVeda" },
        { status: 401 }
      );
    }
    const body = await req.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid chat payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { messages, context } = parsed.data;
    const systemPrompt = buildSystemPrompt(context);
    const turns: ChatTurn[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // 1) Groq first; 2) PackVeda core fallback.
    let reply = await callGroq(systemPrompt, turns);
    let provider: "groq" | "core" = "groq";
    if (!reply) {
      reply = await callCore(systemPrompt, turns);
      provider = "core";
    }

    if (!reply) {
      return NextResponse.json(
        { error: "The assistant could not generate a reply. Please try again." },
        { status: 502 }
      );
    }
    return NextResponse.json({ reply, provider });
  } catch (err) {
    console.error("chat error", err);
    return NextResponse.json(
      { error: "Assistant is temporarily unavailable. Please try again shortly." },
      { status: 500 }
    );
  }
}
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Process save candidate logic here...
    
  } catch (err) {
    console.error('Save error:', err);
    return NextResponse.json({ error: 'Failed to save candidate' }, { status: 500 });
  }
}