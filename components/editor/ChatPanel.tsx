"use client";

import { useState } from "react";
import type { Editor } from "@tiptap/react";
import { useChatStore } from "@/lib/chat/chatStore";
import { usePersonalizeStore } from "@/lib/personalize/personalizeStore";
import { requestDocumentGeneration } from "@/lib/ai/client";
import { insertTextAtCursor } from "@/lib/editor/document";

type Props = { editor: Editor };

export default function ChatPanel({ editor }: Props) {
  const messages = useChatStore((s) => s.messages);
  const addMessage = useChatStore((s) => s.addMessage);

  // Look up the CURRENTLY active tile's prompt text — this is what makes
  // the chat's output reflect whatever style is selected in Personalize.
  const tiles = usePersonalizeStore((s) => s.tiles);
  const activeTileId = usePersonalizeStore((s) => s.activeTileId);
  const activeTile = tiles.find((t) => t.id === activeTileId) ?? null;

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

    // Read the CURRENT document content fresh, right at send time — this
    // is what lets the AI see whatever's already been written, including
    // anything inserted by earlier chat messages in this same conversation.
    const documentText = editor.getText();

    try {
      const resultText = await requestDocumentGeneration(
        documentText,
        activeTile?.prompt ?? null,
        messages, // history BEFORE this new message, matching the prompt builder's expectation
        userMessage.content
      );

      insertTextAtCursor(editor, resultText);

      addMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        content: resultText,
        createdAt: Date.now(),
      });
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

  return (
    <div className="chat-panel">
      <div className="chat-panel-header">
        Chat
        {activeTile && <span className="chat-panel-active-style"> · {activeTile.title}</span>}
      </div>

      <div className="chat-panel-messages">
        {messages.map((m) => (
          <div key={m.id} className={`chat-message chat-message-${m.role}`}>
            {m.content}
          </div>
        ))}
        {isLoading && <div className="chat-message chat-message-assistant">Thinking…</div>}
      </div>

      <div className="chat-panel-input">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask AI to write something…"
          disabled={isLoading}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
        />
        <button type="button" onClick={handleSend} disabled={isLoading}>
          Send
        </button>
      </div>
    </div>
  );
}