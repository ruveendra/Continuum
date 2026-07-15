"use client";

import { useEffect, useState } from "react";
import { useFloating, offset, flip, shift, autoUpdate } from "@floating-ui/react";
import type { Editor } from "@tiptap/react";
import { useChatStore } from "@/lib/chat/chatStore";
import { getLiveChatGenerationRange } from "@/lib/editor/sessionPositions";
import { rejectChatGeneration } from "@/lib/editor/document";

type Props = { editor: Editor };

// Small floating accept/reject buttons that sit right next to the chat's
// pending AI text in the editor — a compact companion to the buttons
// already shown in the chat bubble, so the user doesn't have to look
// away from what they're editing to approve/reject it.
export default function ChatGenerationTooltip({ editor }: Props) {
  const pendingGeneration = useChatStore((s) => s.pendingGeneration);
  const updateMessage = useChatStore((s) => s.updateMessage);
  const setPendingGeneration = useChatStore((s) => s.setPendingGeneration);

  const [rect, setRect] = useState<DOMRect | null>(null);

  const { refs, floatingStyles } = useFloating({
    open: rect !== null,
    placement: "top",
    middleware: [offset(4), flip(), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  useEffect(() => {
    if (!pendingGeneration) {
      setRect(null);
      return;
    }

      const updatePosition = () => {
          const range = getLiveChatGenerationRange(editor, pendingGeneration.messageId) ?? pendingGeneration;

          // Anchor to the END position only (range.to), not a bounding box over
          // the whole highlighted span — this is what places the buttons right
          // after the last character instead of floating above the middle.
          const end = editor.view.coordsAtPos(range.to);

          const newRect = new DOMRect(end.left, end.top, 0, end.bottom - end.top);

          setRect(newRect);
          refs.setReference({ getBoundingClientRect: () => newRect });
      };

    updatePosition();

    // Reposition on every edit, same as PinnedSessionTooltip — keeps this
    // glued to the highlighted text even if content shifts above it.
    editor.on("transaction", updatePosition);
    return () => {
      editor.off("transaction", updatePosition);
    };
  }, [editor, pendingGeneration, refs]);

  if (!pendingGeneration || !rect) return null;

  const handleAccept = () => {
    updateMessage(pendingGeneration.messageId, { generationStatus: "accepted" });
    setPendingGeneration(null);
  };

  const handleReject = () => {
    const range = getLiveChatGenerationRange(editor, pendingGeneration.messageId) ?? pendingGeneration;
    rejectChatGeneration(editor, range.from, range.to, pendingGeneration.originalText);
    updateMessage(pendingGeneration.messageId, { generationStatus: "rejected" });
    setPendingGeneration(null);
  };

  return (
    <div ref={refs.setFloating} style={floatingStyles} className="chat-inline-approval">
      <button type="button" className="chat-inline-accept" onClick={handleAccept} aria-label="Accept">
        ✓
      </button>
      <button type="button" className="chat-inline-reject" onClick={handleReject} aria-label="Reject">
        ✕
      </button>
    </div>
  );
}