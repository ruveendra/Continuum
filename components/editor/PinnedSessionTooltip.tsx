"use client";

import { useEffect, useState } from "react";
import { useFloating, offset, flip, shift, autoUpdate } from "@floating-ui/react";
import type { Editor } from "@tiptap/react";
import { useAISessionStore } from "@/lib/ai/aiSessionStore";
import { getLiveSessionRange } from "@/lib/editor/sessionPositions";
import { applySessionAccept } from "@/lib/editor/document";
import type { AISession } from "@/types/ai";

type Props = { editor: Editor; session: AISession };

export default function PinnedSessionTooltip({ editor, session }: Props) {
  const removeSession = useAISessionStore((s) => s.removeSession);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const { refs, floatingStyles } = useFloating({
    open: rect !== null,
    placement: "bottom",
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  useEffect(() => {
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
  }, [editor, session, refs]);

  const handleReject = () => removeSession(session.id);
  const handleAccept = () => {
    applySessionAccept(editor, session);
    removeSession(session.id);
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