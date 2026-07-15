import type { ChatMessage } from "@/types/chat";

export async function requestAIEdit(text: string, instruction: string): Promise<string> {
  const response = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, instruction }),
  });

  if (!response.ok) {
    throw new Error("AI request failed");
  }

  const data = await response.json();
  return data.resultText;
}

export async function requestDocumentGeneration(
  documentText: string,
  tilePrompt: string | null,
  history: ChatMessage[],
  instruction: string
): Promise<string> {
  const response = await fetch("/api/ai/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ documentText, tilePrompt, history, instruction }),
  });

  if (!response.ok) {
    throw new Error("AI generation failed");
  }

  const data = await response.json();
  return data.resultText;
}