import type { Editor } from "@tiptap/react";
import type { DecorationSet } from "@tiptap/pm/view";
import { sessionHighlightPluginKey } from "./highlightExtension";

// A session's `from`/`to` stored in Zustand are a SNAPSHOT — accurate only
// at the moment the session was created. If the user then types anywhere
// before that position, every position number after it shifts, and the
// stored from/to become wrong.
//
// The highlight decoration, on the other hand, is ALWAYS kept in sync
// (that's the whole point of the .map(tr.mapping, ...) logic in the
// extension above). So whenever we need to know "where is this session's
// text RIGHT NOW" — to position a tooltip, or to know what to replace on
// Accept — we ask the decoration, not the stored session object.
export function getLiveSessionRange(
  editor: Editor,
  sessionId: string
): { from: number; to: number } | null {
  const decorationSet = sessionHighlightPluginKey.getState(editor.state) as
    | DecorationSet
    | undefined;
  if (!decorationSet) return null;

  // .find() searches decorations by their spec — we're using the sessionId
  // we attached back in highlightExtension.ts to find the ONE decoration
  // that belongs to this specific session.
  const found = decorationSet.find(
    undefined,
    undefined,
    (spec: any) => spec.sessionId === sessionId
  );
  if (found.length === 0) return null;

  return { from: found[0].from, to: found[0].to };
}

// Same idea, keyed by the chat message id instead of a session id.
export function getLiveChatGenerationRange(editor: Editor, messageId: string) {
  const decorationSet = sessionHighlightPluginKey.getState(editor.state) as DecorationSet | undefined;
  if (!decorationSet) return null;
  const found = decorationSet.find(undefined, undefined, (spec: any) => spec.chatGenerationId === messageId);
  if (found.length === 0) return null;
  return { from: found[0].from, to: found[0].to };
}
