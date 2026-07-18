import type { ChatMessage } from "@/types/chat";
import type { DocumentBlock, PlanHistoryEntry, PlanStepResponse } from "@/types/plan";

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

export type InsertPosition = "start" | "end" | "cursor";

export async function requestInsertPosition(instruction: string): Promise<InsertPosition> {
  const response = await fetch("/api/ai/classify-position", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ instruction }),
  });

  if (!response.ok) return "cursor"; // same fail-safe default as the route

  const data = await response.json();
  return data.position === "start" || data.position === "end" ? data.position : "cursor";
}

export async function requestPlanIntent(instruction: string): Promise<boolean> {
  const response = await fetch("/api/ai/classify-plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ instruction }),
  });

  if (!response.ok) return true; // same fail-safe default as the route: search first, don't risk inserting unrelated new content

  const data = await response.json();
  return data.isPlan === true;
}

const DONE_STEP: PlanStepResponse = {
  instructionIsSpecific: true,
  targetIndex: -1,
  targetText: "",
  description: "",
  newText: "",
  done: true,
};

export async function requestNextPlanStep(
  blocks: DocumentBlock[],
  tilePrompt: string | null,
  instruction: string,
  history: PlanHistoryEntry[]
): Promise<PlanStepResponse> {
  const response = await fetch("/api/ai/plan-step", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ blocks, tilePrompt, instruction, history }),
  });

  if (!response.ok) return DONE_STEP; // same fail-safe as the route: stop rather than loop on a broken response

  return response.json();
}