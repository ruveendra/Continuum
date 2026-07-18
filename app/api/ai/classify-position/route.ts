import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { buildInsertPositionPrompt } from "@/lib/ai/prompts";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const { instruction } = await request.json();

    if (!instruction) {
      return NextResponse.json({ error: "Missing instruction" }, { status: 400 });
    }

    const prompt = buildInsertPositionPrompt(instruction);
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite", // small/fast — cheap classification, not real generation
      contents: prompt,
    });

    const answer = (response.text ?? "").trim().toLowerCase();
    const position = answer.startsWith("end") ? "end" : answer.startsWith("start") ? "start" : "cursor";
    return NextResponse.json({ position });
  } catch (error) {
    console.error("AI classify-position route error:", error);
    // Fail safe: default to the ORIGINAL behavior (cursor) — not knowing
    // where to insert shouldn't invent a new failure mode on top of it.
    return NextResponse.json({ position: "cursor" });
  }
}
