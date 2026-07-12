import type { Editor } from "@tiptap/react";
import type { EditorSelection } from "@/types/editor";

export function getEditorSelection(editor: Editor): EditorSelection {
  const { from, to } = editor.state.selection;
  const text = editor.state.doc.textBetween(from, to, " ");

  return {
    from,
    to,
    text,
    isEmpty: from === to,
  };
}

export function getSelectionNodeType(editor: Editor): string {
  const { from } = editor.state.selection;
  return editor.state.doc.resolve(from).parent.type.name;
}

export function getSelectionNodeAttrs(editor: Editor): Record<string, unknown> {
  const { from } = editor.state.selection;
  return editor.state.doc.resolve(from).parent.attrs;
}

export function getSelectionRect(editor: Editor): DOMRect | null {
  const { from, to } = editor.state.selection;
  if (from === to) return null;

  const start = editor.view.coordsAtPos(from);
  const end = editor.view.coordsAtPos(to);

  const top = Math.min(start.top, end.top);
  const bottom = Math.max(start.bottom, end.bottom);
  const left = Math.min(start.left, end.left);
  const right = Math.max(start.right, end.right);

  return new DOMRect(left, top, right - left, bottom - top);
}