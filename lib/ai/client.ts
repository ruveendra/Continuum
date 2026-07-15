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

export async function requestSelectionIntent(selectedText: string, instruction: string): Promise<boolean> {
  const response = await fetch("/api/ai/classify-intent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ selectedText, instruction }),
  });

  if (!response.ok) return false; // same fail-safe default as the route

  const data = await response.json();
  return data.targetsSelection === true;
}