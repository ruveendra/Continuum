import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { useAISessionStore } from "@/lib/ai/aiSessionStore";

// A PluginKey is just a unique, typed identifier for this specific
// ProseMirror plugin. We export it because other files (sessionPositions.ts,
// RichTextEditor.tsx) need to reference THIS exact plugin's state later —
// without a shared key, there'd be no way to look it up from outside.
export const sessionHighlightPluginKey = new PluginKey("sessionHighlight");

// This is a custom Tiptap Extension whose only job is to visually highlight
// each active AI session's text range in the document, and — critically —
// keep that highlight correctly positioned even as the user types elsewhere.
export const SessionHighlight = Extension.create({
  name: "sessionHighlight",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: sessionHighlightPluginKey,

        // ProseMirror plugins can carry their own piece of state, separate
        // from the document itself. Ours holds a DecorationSet — think of
        // decorations as "visual overlays" that don't change the actual
        // document content, just how it's rendered (like a highlighter,
        // not an edit).
        state: {
          // Called once, when the editor first mounts. We start with no
          // highlights.
          init: () => DecorationSet.empty,

          // Called on EVERY transaction (every keystroke, every selection
          // change, everything). This is the heart of the whole mechanism.
          apply(tr, old) {
            // Step 1: take our OLD decorations and remap them through
            // whatever just changed in the document (tr.mapping describes
            // exactly what shifted, was inserted, or deleted). This is what
            // makes a highlight "stick" to its text even if you type five
            // new paragraphs above it — the positions auto-adjust.
            let set = old.map(tr.mapping, tr.doc);

            // Step 2: Zustand (our session store) lives OUTSIDE ProseMirror
            // entirely, so ProseMirror has no automatic way of knowing "a
            // session was just added/removed, please rebuild your
            // decorations." We solve this by manually attaching a flag
            // (via tr.setMeta) to a transaction whenever sessions change —
            // see the useEffect in RichTextEditor.tsx that does this.
            // When we see that flag here, we throw away the remapped set
            // and rebuild decorations fresh from the CURRENT list of
            // sessions in the store.
            if (tr.getMeta(sessionHighlightPluginKey)) {
              const sessions = useAISessionStore.getState().sessions;

              const decorations = sessions.map((session) =>
                // Decoration.inline(from, to, attrs, spec):
                //  - from/to: the range to highlight
                //  - attrs: real DOM attributes applied to the highlighted
                //    span — here, CSS classes that control color based on
                //    session.status (loading = yellow, success = green, etc.
                //    — see the CSS file)
                //  - spec: arbitrary metadata WE attach for our own use
                //    later (sessionId) — this isn't rendered, it's just how
                //    we find "which decoration belongs to which session"
                //    when we need to look one up (see sessionPositions.ts)
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

        // This is what actually tells ProseMirror's VIEW layer "here are
        // decorations, please render them" — without this, the plugin
        // state above would be tracked but never actually shown on screen.
        props: {
          decorations(state) {
            return sessionHighlightPluginKey.getState(state);
          },
        },
      }),
    ];
  },
});