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