import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { useAISessionStore } from "@/lib/ai/aiSessionStore";

export const sessionHighlightPluginKey = new PluginKey("sessionHighlight");

export const SessionHighlight = Extension.create({
  name: "sessionHighlight",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: sessionHighlightPluginKey,
        state: {
          init: () => DecorationSet.empty,
          apply(tr, old) {
            // Remap existing decorations through whatever edit just happened —
            // this is what keeps highlights glued to the right text even if
            // the user types/deletes elsewhere in the document.
            let set = old.map(tr.mapping, tr.doc);

            // Only rebuild from scratch when explicitly told to (see the
            // store subscription in TiptapEditor below).
            if (tr.getMeta(sessionHighlightPluginKey)) {
              const sessions = useAISessionStore.getState().sessions;
              const decorations = sessions.map((session) =>
                Decoration.inline(
                  session.from,
                  session.to,
                  { class: `ai-session-highlight ai-session-${session.status}` },
                  { sessionId: session.id }
                )
              );
              set = DecorationSet.create(tr.doc, decorations);
            }

            return set;
          },
        },
        props: {
          decorations(state) {
            return sessionHighlightPluginKey.getState(state);
          },
        },
      }),
    ];
  },
});