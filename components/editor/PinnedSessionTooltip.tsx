"use client";

import { useEffect, useState } from "react";
import { useFloating, offset, flip, shift, autoUpdate } from "@floating-ui/react";
import type { Editor } from "@tiptap/react";
import { useAISessionStore } from "@/lib/ai/aiSessionStore";
import { getLiveSessionRange } from "@/lib/editor/sessionPositions";
import { applySessionAccept } from "@/lib/editor/document";
import type { AISession } from "@/types/ai";

type Props = { editor: Editor; session: AISession };

// Unlike SelectionTooltip (one instance, follows the live cursor), THIS
// component gets rendered ONCE PER ACTIVE SESSION (see the .map() in
// RichTextEditor.tsx) — so if you have 3 pending AI suggestions, there are
// 3 separate instances of this component on screen simultaneously, each
// anchored to its own piece of text.
export default function PinnedSessionTooltip({ editor, session }: Props) {
  const removeSession = useAISessionStore((s) => s.removeSession);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const { refs, floatingStyles } = useFloating({
    open: rect !== null,
    placement: "bottom", // pinned tooltips sit BELOW their text (live tooltip is above) so they don't visually collide
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  useEffect(() => {
  const updatePosition = () => {
    const range = getLiveSessionRange(editor, session.id) ?? session;

    const start = editor.view.coordsAtPos(range.from);
    const end = editor.view.coordsAtPos(range.to);

    const newRect = new DOMRect(
      Math.min(start.left, end.left),
      Math.min(start.top, end.top),
      Math.abs(end.right - start.left),
      Math.max(start.bottom, end.bottom) - Math.min(start.top, end.top)
    );

    setRect(newRect);
    refs.setReference({ getBoundingClientRect: () => newRect });
  };

  updatePosition(); // run once immediately, same as before

  // NEW: also re-run on every editor transaction, so the tooltip tracks
  // the highlight's live-remapped position instead of freezing at its
  // original spot.
  editor.on("transaction", updatePosition);
  return () => {
    editor.off("transaction", updatePosition);
  };
}, [editor, session, refs]);

  const handleReject = () => removeSession(session.id); // just remove — document is untouched
  const handleAccept = () => {
    applySessionAccept(editor, session); // actually replace the text in the document
    removeSession(session.id);            // then remove the session — its job is done
  };

  return (
    <div ref={refs.setFloating} style={floatingStyles} className="session-tooltip">
      {session.status === "loading" && <div className="session-loading">Thinking…</div>}

      {session.status === "error" && (
        <div className="session-error">
          {session.error ?? "Something went wrong"}
          <button onClick={handleReject}>Dismiss</button>
        </div>
      )}

      {session.status === "success" && (
        <div className="session-result">
          <p className="session-result-text">{session.resultText}</p>
          <div className="session-actions">
            <button className="accept" onClick={handleAccept}>Accept</button>
            <button className="reject" onClick={handleReject}>Reject</button>
          </div>
        </div>
      )}
    </div>
  );
}