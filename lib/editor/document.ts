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