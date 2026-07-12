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

          // Runs on EVERY transaction now — both real edits/selection
          // changes, and the "please re-check the store" pings we dispatch
          // manually from RichTextEditor. No more special-casing based on
          // WHY this ran; it just always rebuilds correctly from the two
          // sources of truth: the session store, and the live selection.
          apply(tr, old) {
            const mapped = old.map(tr.mapping, tr.doc);
            const { sessions } = useAISessionStore.getState();

            // Sessions: reuse each one's current (already-remapped)
            // position if it has one; only fall back to its originally
            // stored position if it's brand new this transaction.
            const sessionDecorations = sessions.map((session) => {
              const existing = mapped.find(undefined, undefined, (spec: any) => spec?.sessionId === session.id);
              const from = existing.length > 0 ? existing[0].from : session.from;
              const to = existing.length > 0 ? existing[0].to : session.to;
              return Decoration.inline(
                from,
                to,
                { class: `ai-session-highlight ai-session-${session.status}` },
                { sessionId: session.id }
              );
            });

            // Pending: read straight off tr.selection, no stored copy.
            // ProseMirror guarantees this is already correctly positioned
            // for the CURRENT document, no matter what just changed.
            const { from: selFrom, to: selTo } = tr.selection;
            const pendingDecorations =
              selFrom !== selTo
                ? [Decoration.inline(selFrom, selTo, { class: "ai-pending-highlight" }, { pending: true })]
                : [];

            return DecorationSet.create(tr.doc, [...sessionDecorations, ...pendingDecorations]);
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