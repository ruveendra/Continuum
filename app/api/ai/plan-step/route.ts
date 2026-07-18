import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { buildPlanStepPrompt } from "@/lib/ai/prompts";
import type { DocumentBlock, PlanHistoryEntry, PlanStepResponse } from "@/types/plan";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// A "done" step with nothing to apply — used both when the AI genuinely
// says it's finished, and as the fail-safe fallback below. Treating a
// broken response as "done" rather than throwing keeps the plan loop from
// getting stuck on a step it can't make sense of.
const DONE_STEP: PlanStepResponse = {
  targetIndex: -1,
  targetText: "",
  description: "",
  newText: "",
  done: true,
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { blocks, tilePrompt, instruction, history } = body as {
      blocks: DocumentBlock[];
      tilePrompt: string | null;
      instruction: string;
      history: PlanHistoryEntry[];
    };

    if (!instruction || !blocks) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const prompt = buildPlanStepPrompt(blocks, tilePrompt, instruction, history ?? []);
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
    });

    // The prompt asks for raw JSON, but models sometimes wrap it in a
    // ```json fence anyway — strip that before parsing rather than
    // assuming it followed instructions exactly.
    const raw = (response.text ?? "")
      .trim()
      .replace(/^```(json)?/i, "")
      .replace(/```$/, "")
      .trim();

    const step: PlanStepResponse = JSON.parse(raw);
    return NextResponse.json(step);
  } catch (error) {
    console.error("AI plan-step route error:", error);
    return NextResponse.json(DONE_STEP);
  }
}
