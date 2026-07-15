import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { buildChatGenerationPrompt } from "@/lib/ai/prompts";
import type { ChatMessage } from "@/types/chat";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { documentText, tilePrompt, history, instruction } = body as {
      documentText: string;
      tilePrompt: string | null;
      history: ChatMessage[];
      instruction: string;
    };

    if (!instruction) {
      return NextResponse.json({ error: "Missing instruction" }, { status: 400 });
    }

    const prompt = buildChatGenerationPrompt(documentText, tilePrompt, history, instruction);

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: prompt,
    });

    return NextResponse.json({ resultText: response.text });
  } catch (error) {
    console.error("AI generate route error:", error);
    return NextResponse.json({ error: "AI request failed" }, { status: 500 });
  }
}