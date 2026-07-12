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

export default function SelectionTooltip({ editor }: Props) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [instruction, setInstruction] = useState("");
  const [capReached, setCapReached] = useState(false);

  const addSession = useAISessionStore((s) => s.addSession);
  const updateSession = useAISessionStore((s) => s.updateSession);

  const { refs, floatingStyles } = useFloating({
    open: rect !== null,
    placement: "top",
    middleware: [offset(8), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  useEffect(() => {
    const updateRect = () => {
      const selectionRect = getSelectionRect(editor);
      setRect(selectionRect);
      setCapReached(false);
      if (selectionRect) {
        refs.setReference({ getBoundingClientRect: () => selectionRect });
      } else {
        setInstruction("");
      }
    };
    editor.on("selectionUpdate", updateRect);
    return () => {
      editor.off("selectionUpdate", updateRect);
    };
  }, [editor, refs]);

  const handleSubmit = async () => {
    if (!instruction.trim()) return;

    const selection = getEditorSelection(editor);
    if (selection.isEmpty) return;

    const session = {
      id: crypto.randomUUID(),
      from: selection.from,
      to: selection.to,
      originalText: selection.text,
      originalNodeType: getSelectionNodeType(editor),
      originalNodeAttrs: getSelectionNodeAttrs(editor),
      instruction,
      status: "loading" as const,
      createdAt: Date.now(),
    };

    if (!addSession(session)) {
      setCapReached(true);
      return;
    }

    setInstruction("");
    setRect(null); // hand off to the pinned tooltip

    try {
      const resultText = await requestAIEdit(session.originalText, session.instruction);
      updateSession(session.id, { status: "success", resultText });
    } catch {
      updateSession(session.id, { status: "error", error: "AI request failed" });
    }
  };

  if (!rect) return null;

  return (
    <div ref={refs.setFloating} style={floatingStyles} className="selection-tooltip">
      {capReached ? (
        <div className="cap-warning">Max {MAX_SESSIONS} active suggestions — resolve one first.</div>
      ) : (
        <div className="selection-tooltip-form">
          <input
            type="text"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="Ask AI to edit this…"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
          />
          <button type="button" onClick={handleSubmit}>Go</button>
        </div>
      )}
    </div>
  );
}