export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  generationStatus?: "pending" | "accepted" | "rejected";
};

export type PendingGeneration = {
  messageId: string;
  from: number;
  to: number;
  originalText: string;
  isReplacingOriginal: boolean;
};