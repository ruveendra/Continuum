import type { Editor } from "@tiptap/react";
import type { DecorationSet } from "@tiptap/pm/view";
import { sessionHighlightPluginKey } from "./highlightExtension";

export function getLiveSessionRange(
  editor: Editor,
  sessionId: string
): { from: number; to: number } | null {
  const decorationSet = sessionHighlightPluginKey.getState(editor.state) as
    | DecorationSet
    | undefined;
  if (!decorationSet) return null;

  const found = decorationSet.find(undefined, undefined, (spec: any) => spec.sessionId === sessionId);
  if (found.length === 0) return null;

  return { from: found[0].from, to: found[0].to };
}