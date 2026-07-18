import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { buildPlanIntentPrompt } from "@/lib/ai/prompts";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const { instruction } = await request.json();

    if (!instruction) {
      return NextResponse.json({ error: "Missing instruction" }, { status: 400 });
    }

    const prompt = buildPlanIntentPrompt(instruction);
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite", // small/fast — this is a cheap classification, not real generation
      contents: prompt,
    });

    const answer = (response.text ?? "").trim().toLowerCase();
    return NextResponse.json({ isPlan: answer.startsWith("existing") });
  } catch (error) {
    console.error("AI classify-plan route error:", error);
    // Fail safe: default to TRUE (search the document) rather than false.
    // Wrongly searching just means the plan loop finds nothing and says so;
    // wrongly skipping the search means inserting unrelated new content
    // into the document, which is the worse mistake of the two.
    return NextResponse.json({ isPlan: true });
  }
}
