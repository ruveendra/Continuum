import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { useAISessionStore } from "@/lib/ai/aiSessionStore";
import { useChatStore } from "@/lib/chat/chatStore";

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
            const mapped = old.map(tr.mapping, tr.doc);
            const docSize = tr.doc.content.size;

            // Guard against stale positions from before a remount/resync —
            // skip building a decoration for anything currently out of range
            // rather than let Decoration.inline/DecorationSet.create throw
            // or silently fail. A later transaction (once sync catches up)
            // will retry with valid positions.
            const inBounds = (from: number, to: number) =>
              from >= 0 && to <= docSize && from <= to;

            const { sessions } = useAISessionStore.getState();
            const { pendingGeneration } = useChatStore.getState();

            const sessionDecorations = sessions.flatMap((session) => {
              const existing = mapped.find(undefined, undefined, (spec: any) => spec?.sessionId === session.id);
              const from = existing.length > 0 ? existing[0].from : session.from;
              const to = existing.length > 0 ? existing[0].to : session.to;

              if (!inBounds(from, to)) return [];

              return [
                Decoration.inline(
                  from,
                  to,
                  { class: `ai-session-highlight ai-session-${session.status}` },
                  { sessionId: session.id }
                ),
              ];
            });

            const chatDecorations = (() => {
              if (!pendingGeneration) return [];
              const existing = mapped.find(undefined, undefined, (spec: any) => spec?.chatGenerationId === pendingGeneration.messageId);
              const from = existing.length > 0 ? existing[0].from : pendingGeneration.from;
              const to = existing.length > 0 ? existing[0].to : pendingGeneration.to;

              if (!inBounds(from, to)) return [];

              const decorations = [
                Decoration.inline(
                  from,
                  to,
                  { class: "chat-generation-highlight" },
                  { chatGenerationId: pendingGeneration.messageId }
                ),
              ];

              if (pendingGeneration.isReplacingOriginal && pendingGeneration.originalText) {
                decorations.push(
                  Decoration.widget(
                    from,
                    () => {
                      const span = document.createElement("span");
                      span.className = "chat-generation-strikethrough";
                      span.textContent = pendingGeneration.originalText;
                      return span;
                    },
                    { side: -1 }
                  )
                );
              }

              return decorations;
            })();

            const { from: selFrom, to: selTo } = tr.selection;
            const pendingSelectionDecorations =
              selFrom !== selTo
                ? [Decoration.inline(selFrom, selTo, { class: "ai-pending-highlight" }, { pending: true })]
                : [];

            return DecorationSet.create(tr.doc, [
              ...sessionDecorations,
              ...chatDecorations,
              ...pendingSelectionDecorations,
            ]);
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