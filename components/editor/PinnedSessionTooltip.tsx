"use client";

import { useEffect, useState } from "react";
import { useFloating, offset, flip, shift, autoUpdate } from "@floating-ui/react";
import type { Editor } from "@tiptap/react";
import { useAISessionStore } from "@/lib/ai/aiSessionStore";
import { getLiveSessionRange } from "@/lib/editor/sessionPositions";
import { applySessionAccept } from "@/lib/editor/document";
import type { AISession } from "@/types/ai";
import { SparkleIcon } from "./ToolbarIcons";

type Props = { editor: Editor; session: AISession };

export default function PinnedSessionTooltip({ editor, session }: Props) {
  const removeSession = useAISessionStore((s) => s.removeSession);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const { refs, floatingStyles, isPositioned } = useFloating({
    open: rect !== null,
    placement: "bottom",
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  useEffect(() => {
    const updatePosition = () => {
      const range = getLiveSessionRange(editor, session.id) ?? session;

      const docSize = editor.state.doc.content.size;
      if (range.from > docSize || range.to > docSize) {
        setRect(null);
        return;
      }

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

    updatePosition();
    editor.on("transaction", updatePosition);
    return () => {
      editor.off("transaction", updatePosition);
    };
  }, [editor, session, refs]);

  const handleReject = () => removeSession(session.id);
  const handleAccept = () => {
    applySessionAccept(editor, session);
    removeSession(session.id);
  };

  if (!rect) return null;

  // An empty resultText means the AI's suggestion IS the removal of the
  // highlighted text (see narrowToChangedSpan) — there's no new text to
  // preview, so show it as a deletion instead of an empty suggestion box.
  const isDeletion = (session.resultText ?? "").trim() === "";

  return (
    <div
      ref={refs.setFloating}
      // The very first render has to happen at floating-ui's default (0, 0)
      // position before it can even measure and compute the real one — that
      // gap is what caused the "appears top-left, then jumps" glitch. Staying
      // mounted but invisible until `isPositioned` is true means the jump
      // still happens, just while nothing is visible yet.
      style={{ ...floatingStyles, visibility: isPositioned ? "visible" : "hidden" }}
      className="session-tooltip"
    >
      <div className="session-tooltip-inner">
        {session.status === "loading" && (
          <div className="session-loading">
            <span className="session-typing-dot" />
            <span className="session-typing-dot" />
            <span className="session-typing-dot" />
          </div>
        )}

        {session.status === "error" && (
          <div className="session-error">
            <span>{session.error ?? "Something went wrong"}</span>
            <button type="button" className="session-dismiss" onClick={handleReject}>
              Dismiss
            </button>
          </div>
        )}

        {session.status === "success" && (
          <div className="session-result-card">
            <div className="session-result-header">
              <span className="session-result-icon">
                <SparkleIcon />
              </span>
              <span className="session-result-label">{isDeletion ? "Delete suggestion" : "Suggestion"}</span>
            </div>
            <p className="session-result-text">
              {isDeletion ? "Delete the highlighted text?" : session.resultText}
            </p>
            <div className="session-actions">
              <button
                type="button"
                className="session-accept"
                onClick={handleAccept}
                aria-label="Accept"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 13L9.5 17.5L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                type="button"
                className="session-reject"
                onClick={handleReject}
                aria-label="Reject"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}