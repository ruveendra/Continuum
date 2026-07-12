import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { buildRewritePrompt } from "@/lib/ai/prompts";

// Client is created once per server process, not per-request — this is
// just good practice, avoids re-initializing the SDK on every call.
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, instruction } = body;

    // Basic guard: don't even call the AI if the request is malformed.
    if (!text || !instruction) {
      return NextResponse.json(
        { error: "Missing required fields: text and instruction" },
        { status: 400 }
      );
    }

    const prompt = buildRewritePrompt(text, instruction);

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
    });

    return NextResponse.json({ resultText: response.text });
  } catch (error) {
    console.error("AI route error:", error);
    return NextResponse.json(
      { error: "AI request failed" },
      { status: 500 }
    );
  }
}