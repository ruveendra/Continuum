import type { Editor } from "@tiptap/react";
import type { AISession } from "@/types/ai";
import { getLiveSessionRange } from "./sessionPositions";

function buildReplacementNode(session: AISession) {
  const text = session.resultText ?? "";
  const content = text ? [{ type: "text", text }] : [];

  if (session.originalNodeType === "heading") {
    return { type: "heading", attrs: session.originalNodeAttrs ?? {}, content };
  }

  return { type: "paragraph", content };
}

export function applySessionAccept(editor: Editor, session: AISession) {
  const range = getLiveSessionRange(editor, session.id) ?? session;

  // Figure out whether this selection covers the ENTIRE containing block
  // (e.g. the user selected a whole paragraph/heading start-to-end) or
  // just a portion of text WITHIN a larger block.
  const resolvedFrom = editor.state.doc.resolve(range.from);
  const parent = resolvedFrom.parent;
  const parentStart = resolvedFrom.start();
  const parentEnd = parentStart + parent.content.size;

  const isWholeBlock = range.from === parentStart && range.to === parentEnd;

  if (isWholeBlock) {
    // Safe to replace the whole node — this preserves the "rewrite a
    // heading and keep it a heading" behavior for full-block selections.
    editor
      .chain()
      .focus()
      .deleteRange({ from: range.from, to: range.to })
      .insertContentAt(range.from, buildReplacementNode(session))
      .run();
  } else {
    // Partial selection within a larger block — insert PLAIN TEXT only,
    // not a new block node. Inserting a block node here would split the
    // surrounding paragraph, which is exactly the "adds a new line" bug.
    const text = session.resultText ?? "";
    editor
      .chain()
      .focus()
      .deleteRange({ from: range.from, to: range.to })
      .insertContentAt(range.from, text)
      .run();
  }
}

// Takes an explicit position rather than always reading the cursor —
// callers decide WHERE (cursor, start, end, ...) based on what the
// instruction actually asked for; see requestInsertPosition in client.ts.
export function insertTextAt(editor: Editor, pos: number, text: string) {
  editor
    .chain()
    .focus()
    .insertContentAt(pos, text)
    .run();
}

// Reject: remove the AI-inserted text, and if there WAS pre-existing
// content before it (originalText non-empty), put that back exactly
// where it was. No-op insert if originalText is "".
export function rejectChatGeneration(editor: Editor, from: number, to: number, originalText: string) {
  editor
    .chain()
    .focus()
    .deleteRange({ from, to })
    .insertContentAt(from, originalText)
    .run();
}

// Edit-again: replace the CURRENT pending range with newly generated text,
// instead of inserting fresh content at the cursor.
export function replaceChatGeneration(editor: Editor, from: number, to: number, newText: string) {
  editor
    .chain()
    .focus()
    .deleteRange({ from, to })
    .insertContentAt(from, newText)
    .run();
}
