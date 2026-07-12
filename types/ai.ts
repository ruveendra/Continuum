// The three states a session can be in. No "idle" state exists on purpose —
// a session object only gets created once the user actually submits an
// instruction. Before that, there's simply no session yet.
export type AISessionStatus = "loading" | "success" | "error";

export type AISession = {
  id: string;              // unique ID (crypto.randomUUID()) so we can find/update/remove this exact session
  from: number;             // document position where the selection STARTED at creation time
  to: number;                // document position where the selection ENDED at creation time
  // NOTE: from/to go stale the instant the user edits the doc elsewhere.
  // We only use them as a fallback — the real, "live" position is tracked
  // separately via ProseMirror decorations (see highlightExtension.ts).

  originalText: string;         // plain text that was selected — this is what we send to the AI
  originalNodeType: string;     // e.g. "heading", "paragraph" — lets us preserve formatting when we replace the text later
  originalNodeAttrs?: Record<string, unknown>; // e.g. { level: 2 } for a heading — needed to rebuild the exact same heading level

  instruction: string;          // what the user typed, e.g. "make this more formal"

  status: AISessionStatus;
  resultText?: string;          // filled in once the AI responds successfully
  error?: string;                // filled in if the AI request fails

  createdAt: number;            // Date.now() — not used yet, but useful later for sorting/expiring sessions
};