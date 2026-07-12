export type AISessionStatus = "loading" | "success" | "error";

export type AISession = {
  id: string;
  from: number;
  to: number;
  originalText: string;
  originalNodeType: string;
  originalNodeAttrs?: Record<string, unknown>;
  instruction: string;
  status: AISessionStatus;
  resultText?: string;
  error?: string;
  createdAt: number;
};