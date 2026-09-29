// POST /api/analyze — runs the deterministic PackVeda recommendation engine.
import { NextResponse } from "next/server";
import { runEngine, AnalysisInput, ENGINE_DISCLAIMER } from "@/lib/engine";
import { z } from "zod";

const importanceSchema = z.enum(["none", "low", "medium", "high"]);

const inputSchema = z.object({
  commodityId: z.string().min(1),
  commodityName: z.string().min(1),
  foodCategory: z.string().min(1),
  processing: z.enum(["fresh", "processed"]),
  moisturePercent: z.number().min(0).max(100),
  fatPercent: z.number().min(0).max(100),
  ph: z.number().min(0).max(14),
  waterActivity: z.number().min(0).max(1).nullable(),
  respiration: z.enum(["none", "low", "moderate", "high", "very_high"]),
  oxygenSensitivity: z.enum(["none", "low", "moderate", "high", "very_high"]),
  aromaSensitivity: z.enum(["none", "low", "moderate", "high", "very_high"]),
  lightSensitivity: z.enum(["none", "low", "moderate", "high", "very_high"]),
  hygroscopic: z.boolean(),
  fragile: z.boolean(),
  targetShelfLifeDays: z.number().min(1).max(1825),
  storageTempC: z.number().min(-40).max(60),
  storageRH: z.number().min(0).max(100),
  storageType: z.enum(["ambient", "chilled", "frozen", "cold_chain"]),
  transportDurationDays: z.number().min(0).max(60),
  transportMode: z.enum(["road", "rail", "sea", "air", "multimodal"]),
  handlingIntensity: z.enum(["gentle", "normal", "rough"]),
  lightExposure: z.enum(["none", "partial", "direct"]),
  priorities: z.object({
    cost: importanceSchema,
    sustainability: importanceSchema,
    barrier: importanceSchema,
    shelfLife: importanceSchema,
    mechanical: importanceSchema,
  }),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = inputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid analysis input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const input = parsed.data as AnalysisInput;
    const result = runEngine(input);
    return NextResponse.json({ ...result, disclaimer: ENGINE_DISCLAIMER });
  } catch (err) {
    console.error("analyze error", err);
    return NextResponse.json(
      { error: "Failed to run analysis. Please try again." },
      { status: 500 }
    );
  }
}
