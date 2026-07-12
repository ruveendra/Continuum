import type { Editor } from "@tiptap/react";
import type { AISession } from "@/types/ai";
import { getLiveSessionRange } from "./sessionPositions";

// Given a session, builds the ProseMirror-style node object we'll insert
// to replace the original text — using the ORIGINAL node type/attrs (from
// when the selection was made) but the NEW text from the AI's response.
// This is what preserves formatting: "rewrite this heading" replaces the
// WORDS but keeps it a heading.
function buildReplacementNode(session: AISession) {
  const text = session.resultText ?? "";
  // ProseMirror doesn't allow empty text nodes, so if the AI somehow
  // returned nothing, we build an empty content array instead of a
  // zero-length text node.
  const content = text ? [{ type: "text", text }] : [];

  if (session.originalNodeType === "heading") {
    return { type: "heading", attrs: session.originalNodeAttrs ?? {}, content };
  }

  // Anything we don't explicitly handle (bulletList, listItem, etc.) falls
  // back to a plain paragraph for now. This is a known simplification —
  // fine for typical single-paragraph or single-heading selections, but
  // worth revisiting if you start selecting list items often.
  return { type: "paragraph", content };
}

export function applySessionAccept(editor: Editor, session: AISession) {
  // Prefer the LIVE, remapped position; fall back to the session's
  // originally-stored from/to only if the decoration can't be found for
  // some reason (shouldn't normally happen, but better than crashing).
  const range = getLiveSessionRange(editor, session.id) ?? session;

  editor
    .chain()               // start a chainable sequence of editor commands
    .focus()                // ensure the editor has focus before editing
    .deleteRange({ from: range.from, to: range.to })  // remove the original text
    .insertContentAt(range.from, buildReplacementNode(session)) // insert the new node in its place
    .run();                  // actually commit all of the above as ONE transaction
}