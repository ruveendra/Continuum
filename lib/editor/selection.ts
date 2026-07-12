import type { Editor } from "@tiptap/react";
import type { EditorSelection } from "@/types/editor";

// Converts Tiptap's internal selection (which uses ProseMirror's own
// coordinate system — integer positions, not DOM offsets) into a plain,
// serializable object. "Plain" matters: this is safe to put in Zustand,
// send over the network, or log — unlike the raw ProseMirror Selection object,
// which is tied to a specific document instance and isn't meant to be copied around.
export function getEditorSelection(editor: Editor): EditorSelection {
  const { from, to } = editor.state.selection;

  // textBetween walks the document tree between two positions and concatenates
  // the text content, ignoring node boundaries (so text split across multiple
  // nodes still comes back as one string). The second arg (" ") is the
  // separator inserted between blocks, so text from two paragraphs doesn't
  // get glued together with no space.
  const text = editor.state.doc.textBetween(from, to, " ");

  return {
    from,
    to,
    text,
    isEmpty: from === to, // no selection = cursor is just sitting somewhere, nothing highlighted
  };
}

// Converts a selection's document positions into actual on-screen pixel
// coordinates, so we know where to draw a tooltip. Returns null when nothing
// is selected — there's nothing to point a tooltip at.
export function getSelectionRect(editor: Editor): DOMRect | null {
  const { from, to } = editor.state.selection;
  if (from === to) return null;

  // coordsAtPos asks ProseMirror's view layer: "if this document position
  // were a place on screen, where would that be?" It returns the pixel
  // coordinates of that exact character position.
  const start = editor.view.coordsAtPos(from);
  const end = editor.view.coordsAtPos(to);

  // A selection can span multiple lines (e.g. dragging across a paragraph
  // break), which means `start` might not be strictly "above/left of" `end`
  // in screen space. Taking min/max of both builds one bounding box that
  // safely covers the whole selection regardless of direction.
  const top = Math.min(start.top, end.top);
  const bottom = Math.max(start.bottom, end.bottom);
  const left = Math.min(start.left, end.left);
  const right = Math.max(start.right, end.right);

  return new DOMRect(left, top, right - left, bottom - top);
}

// Figures out what KIND of block the selection lives inside — "paragraph",
// "heading", "bulletList", etc. We need this so that when we later replace
// the text with the AI's response, we can rebuild it as the SAME kind of
// block (so rewriting a heading doesn't turn it into a plain paragraph).
export function getSelectionNodeType(editor: Editor): string {
  const { from } = editor.state.selection;

  // resolve(pos) gives us a "ResolvedPos" — think of it as asking
  // "if I stand at this exact position in the document tree, what are all
  // the ancestor nodes wrapping me?" .parent is the immediate containing
  // block (the paragraph/heading/list item this position is inside).
  return editor.state.doc.resolve(from).parent.type.name;
}

// Same idea, but grabs the containing node's ATTRIBUTES rather than its
// type name. For a heading, this includes { level: 1-6 } — without this,
// we could tell "it's a heading" but not "specifically an H2", which
// would lose information when rebuilding it.
export function getSelectionNodeAttrs(editor: Editor): Record<string, unknown> {
  const { from } = editor.state.selection;
  return editor.state.doc.resolve(from).parent.attrs;
}