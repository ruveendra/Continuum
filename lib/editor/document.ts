import type { Editor } from "@tiptap/react";
import type { AISession } from "@/types/ai";
import { getLiveSessionRange } from "./sessionPositions";

function buildReplacementNode(session: AISession) {
  const text = session.resultText ?? "";
  const content = text ? [{ type: "text", text }] : [];

  if (session.originalNodeType === "heading") {
    return { type: "heading", attrs: session.originalNodeAttrs ?? {}, content };
  }

  // Punt: list items and anything else fall back to a plain paragraph for now.
  return { type: "paragraph", content };
}

export function applySessionAccept(editor: Editor, session: AISession) {
  const range = getLiveSessionRange(editor, session.id) ?? session;

  editor
    .chain()
    .focus()
    .deleteRange({ from: range.from, to: range.to })
    .insertContentAt(range.from, buildReplacementNode(session))
    .run();
}