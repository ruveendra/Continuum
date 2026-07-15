import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { buildSelectionIntentPrompt } from "@/lib/ai/prompts";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const { selectedText, instruction } = await request.json();

    if (!selectedText || !instruction) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const prompt = buildSelectionIntentPrompt(selectedText, instruction);
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite", // small/fast — this is a cheap classification, not real generation
      contents: prompt,
    });

    const answer = (response.text ?? "").trim().toLowerCase();
    return NextResponse.json({ targetsSelection: answer.startsWith("yes") });
  } catch (error) {
    console.error("AI classify-intent route error:", error);
    // Fail safe: if classification breaks, default to NOT touching the
    // selection — safer to generate fresh content than to accidentally
    // overwrite something the user didn't ask to change.
    return NextResponse.json({ targetsSelection: false });
  }
}