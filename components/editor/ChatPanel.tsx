"use client";

import { useState } from "react";
import type { Editor } from "@tiptap/react";
import { useChatStore } from "@/lib/chat/chatStore";
import { usePersonalizeStore } from "@/lib/personalize/personalizeStore";
import { useEditorStore } from "@/lib/editor/editorStore";
import { requestDocumentGeneration, requestAIEdit, requestSelectionIntent } from "@/lib/ai/client";
import { insertTextAtCursor, rejectChatGeneration, replaceChatGeneration } from "@/lib/editor/document";
import { getLiveChatGenerationRange } from "@/lib/editor/sessionPositions";
import { SparkleIcon } from "./ToolbarIcons";

type Props = { editor: Editor };

export default function ChatPanel({ editor }: Props) {
  const messages = useChatStore((s) => s.messages);
  const addMessage = useChatStore((s) => s.addMessage);
  const updateMessage = useChatStore((s) => s.updateMessage);
  const pendingGeneration = useChatStore((s) => s.pendingGeneration);
  const setPendingGeneration = useChatStore((s) => s.setPendingGeneration);

  const tiles = usePersonalizeStore((s) => s.tiles);
  const activeTileId = usePersonalizeStore((s) => s.activeTileId);
  const activeTile = tiles.find((t) => t.id === activeTileId) ?? null;

  const selection = useEditorStore((s) => s.selection);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = {
      id: crypto.randomUUID(),
      role: "user" as const,
      content: input,
      createdAt: Date.now(),
    };
    addMessage(userMessage);
    setInput("");
    setIsLoading(true);

    try {
      if (pendingGeneration) {
        const range = getLiveChatGenerationRange(editor, pendingGeneration.messageId) ?? pendingGeneration;
        const currentText = editor.state.doc.textBetween(range.from, range.to, " ");

        const resultText = await requestAIEdit(currentText, userMessage.content);

        replaceChatGeneration(editor, range.from, range.to, resultText);
        updateMessage(pendingGeneration.messageId, { generationStatus: "rejected" });

        const newMessageId = crypto.randomUUID();
        addMessage({
          id: newMessageId,
          role: "assistant",
          content: resultText,
          createdAt: Date.now(),
          generationStatus: "pending",
        });

        setPendingGeneration({
          messageId: newMessageId,
          from: range.from,
          to: range.from + resultText.length,
          originalText: pendingGeneration.originalText,
          isReplacingOriginal: pendingGeneration.isReplacingOriginal,
        });
        return;
      }

      const targetsSelection = !selection.isEmpty
        ? await requestSelectionIntent(selection.text, userMessage.content)
        : false;

      if (targetsSelection) {
        const originalText = selection.text;
        const resultText = await requestAIEdit(originalText, userMessage.content);

        replaceChatGeneration(editor, selection.from, selection.to, resultText);

        const newMessageId = crypto.randomUUID();
        addMessage({
          id: newMessageId,
          role: "assistant",
          content: resultText,
          createdAt: Date.now(),
          generationStatus: "pending",
        });

        setPendingGeneration({
          messageId: newMessageId,
          from: selection.from,
          to: selection.from + resultText.length,
          originalText,
          isReplacingOriginal: true,
        });
      } else {
        const documentText = editor.getText();
        const { from } = editor.state.selection;

        const resultText = await requestDocumentGeneration(
          documentText,
          activeTile?.prompt ?? null,
          messages,
          userMessage.content
        );

        insertTextAtCursor(editor, resultText);

        const newMessageId = crypto.randomUUID();
        addMessage({
          id: newMessageId,
          role: "assistant",
          content: resultText,
          createdAt: Date.now(),
          generationStatus: "pending",
        });

        setPendingGeneration({
          messageId: newMessageId,
          from,
          to: from + resultText.length,
          originalText: "",
          isReplacingOriginal: false,
        });
      }
    } catch {
      addMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Something went wrong generating that.",
        createdAt: Date.now(),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = (messageId: string) => {
    updateMessage(messageId, { generationStatus: "accepted" });
    setPendingGeneration(null);
  };

  const handleReject = (messageId: string) => {
    if (pendingGeneration) {
      const range = getLiveChatGenerationRange(editor, messageId) ?? pendingGeneration;
      rejectChatGeneration(editor, range.from, range.to, pendingGeneration.originalText);
    }
    updateMessage(messageId, { generationStatus: "rejected" });
    setPendingGeneration(null);
  };

  return (
    <div className="chat-panel">
      <div className="chat-panel-header">
        <div className="chat-panel-header-icon">
          <SparkleIcon />
        </div>
        <div className="chat-panel-header-text">
          <span className="chat-panel-header-title">AI Chat</span>
          <span className="chat-panel-header-subtitle">
            {activeTile ? activeTile.title : "General writing style"}
          </span>
        </div>
      </div>

      <div className="chat-panel-messages">
        {messages.map((m) => (
          <div key={m.id} className={`chat-message chat-message-${m.role}`}>
            <div>{m.content}</div>
            {m.generationStatus === "pending" && (
              <div className="chat-message-actions">
                <button type="button" className="chat-accept" onClick={() => handleAccept(m.id)} aria-label="Accept">
                  ✓
                </button>
                <button type="button" className="chat-reject" onClick={() => handleReject(m.id)} aria-label="Reject">
                  ✕
                </button>
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="chat-message chat-message-assistant">
            <div className="chat-typing">
              <span className="chat-typing-dot" />
              <span className="chat-typing-dot" />
              <span className="chat-typing-dot" />
            </div>
          </div>
        )}
      </div>

      <div className="chat-panel-input">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            pendingGeneration
              ? "Ask for a change…"
              : !selection.isEmpty
                ? "Ask AI to edit the selected text…"
                : "Ask AI to write something…"
          }
          disabled={isLoading}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
        />
        <button
          type="button"
          className="chat-send-button"
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          aria-label="Send"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M4 12L20 4L14 20L11 13L4 12Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}