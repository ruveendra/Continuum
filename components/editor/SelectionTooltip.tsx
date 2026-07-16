"use client";

import { useEffect, useState } from "react";
import { useFloating, offset, flip, shift, autoUpdate } from "@floating-ui/react";
import type { Editor } from "@tiptap/react";
import {
  getSelectionRect,
  getEditorSelection,
  getSelectionNodeType,
  getSelectionNodeAttrs,
} from "@/lib/editor/selection";
import { useAISessionStore, MAX_SESSIONS } from "@/lib/ai/aiSessionStore";
import { requestAIEdit } from "@/lib/ai/client";

type Props = { editor: Editor };

// This is the "LIVE" tooltip — it follows whatever text is CURRENTLY
// selected, and its only job is to let the user type an instruction and
// CREATE a new session. Once a session is created, this component's job is
// done for that piece of text — a separate, PINNED tooltip
// (PinnedSessionTooltip) takes over showing that session's progress.
export default function SelectionTooltip({ editor }: Props) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [instruction, setInstruction] = useState("");
  const [capReached, setCapReached] = useState(false);

  const addSession = useAISessionStore((s) => s.addSession);
  const updateSession = useAISessionStore((s) => s.updateSession);

  // useFloating is Floating UI's core hook — it calculates WHERE the
  // tooltip should render relative to a "reference" point, applying the
  // middleware rules below.
  const { refs, floatingStyles } = useFloating({
    open: rect !== null,
    placement: "top", // prefer showing above the selection
    middleware: [
      offset(8),              // 8px gap so the tooltip isn't glued to the text
      flip(),                  // if there's no room above, flip to below automatically
      shift({ padding: 8 }),  // nudge sideways to stay within the viewport near screen edges
    ],
    whileElementsMounted: autoUpdate, // keep position correct on scroll/resize
  });

  useEffect(() => {
    const updateRect = () => {
      const selectionRect = getSelectionRect(editor);
      setRect(selectionRect);
      setCapReached(false); // reset any old warning whenever selection changes

      if (selectionRect) {
        // Floating UI normally positions against a real DOM element. We
        // don't have one — we only have pixel coordinates from ProseMirror.
        // Floating UI supports this via a "virtual element": any object
        // with a getBoundingClientRect() method works as a reference,
        // real DOM node or not.
        refs.setReference({ getBoundingClientRect: () => selectionRect });
      } else {
        setInstruction(""); // clear the input once selection is gone
      }
    };

    editor.on("selectionUpdate", updateRect);
    return () => {
      editor.off("selectionUpdate", updateRect); // cleanup: avoid duplicate listeners on re-render
    };
  }, [editor, refs]);

  const handleSubmit = async () => {
    if (!instruction.trim()) return;

    const selection = getEditorSelection(editor);
    if (selection.isEmpty) return;

    // Snapshot everything we know about this selection AT THIS MOMENT —
    // this becomes the new session object.
    const session = {
      id: crypto.randomUUID(),
      from: selection.from,
      to: selection.to,
      originalText: selection.text,
      originalNodeType: getSelectionNodeType(editor),
      originalNodeAttrs: getSelectionNodeAttrs(editor),
      instruction,
      status: "loading" as const, // "as const" tells TS this is literally the string "loading", not just any string
      createdAt: Date.now(),
    };

    if (!addSession(session)) {
      // addSession returned false = we're already at MAX_SESSIONS
      setCapReached(true);
      return;
    }

    setInstruction("");
    setRect(null); // hide THIS tooltip — the pinned tooltip takes over from here

    try {
      const resultText = await requestAIEdit(session.originalText, session.instruction);
      updateSession(session.id, { status: "success", resultText });
    } catch {
      updateSession(session.id, { status: "error", error: "AI request failed" });
    }
  };

  if (!rect) return null; // nothing selected = render nothing

  return (
    <div ref={refs.setFloating} style={floatingStyles} className="selection-tooltip">
      {capReached ? (
        <div className="cap-warning">
          Max {MAX_SESSIONS} active suggestions — resolve one first.
        </div>
      ) : (
        <div className="selection-tooltip-form">
          <div className="selection-tooltip-input-wrap">
            <input
              type="text"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="Ask AI to edit this…"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit();
              }}
            />
            <button type="button" onClick={handleSubmit} aria-label="Submit">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M4 12L20 4L14 20L11 13L4 12Z"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}