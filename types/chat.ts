// Present only on the plan-loop's own status messages (step proposed,
// skipped, paused, finished) — lets ChatPanel render these as a distinct,
// structured card instead of a plain reply bubble. `content` is still set
// on these messages too, as a plain-text fallback.
export type PlanUpdate = {
  kind: "step" | "skipped" | "paused" | "finished" | "clarify";
  title: string;
  detail: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  generationStatus?: "pending" | "accepted" | "rejected";
  planUpdate?: PlanUpdate;
};

export type PendingGeneration = {
  messageId: string;
  from: number;
  to: number;
  originalText: string;
  isReplacingOriginal: boolean;
};