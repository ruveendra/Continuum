"use client";

import { useState, useEffect, useRef } from "react";
import type { Editor } from "@tiptap/react";
import { useChatStore } from "@/lib/chat/chatStore";
import { usePersonalizeStore } from "@/lib/personalize/personalizeStore";
import { useEditorStore } from "@/lib/editor/editorStore";
import {
  requestDocumentGeneration,
  requestAIEdit,
  requestSelectionIntent,
  requestPlanIntent,
  requestNextPlanStep,
  requestInsertPosition,
} from "@/lib/ai/client";
import { insertTextAt, rejectChatGeneration, replaceChatGeneration } from "@/lib/editor/document";
import { getLiveChatGenerationRange } from "@/lib/editor/sessionPositions";
import { getDocumentBlocks, findBlockRange, findTextRangeAnywhere, narrowToChangedSpan } from "@/lib/editor/documentBlocks";
import { useAISessionStore, waitForSessionRemoval } from "@/lib/ai/aiSessionStore";
import { usePlanStore, MAX_PLAN_STEPS } from "@/lib/ai/planStore";
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

  const messagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Grows the textarea to fit its content (capped by max-height in CSS,
  // which switches to a scrollbar beyond that) — resetting height to "auto"
  // first lets scrollHeight shrink back down when text is removed, not just grow.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [input]);

  // Keeps the latest message in view — runs whenever a message is added AND
  // whenever the "thinking" dots appear/disappear, since those change the
  // scrollable content's height too.
  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isLoading]);

  // Drives the whole multi-step plan: ask for one step, locate it, let the
  // user review it, then ask for the next one — repeating until the AI
  // says it's done or we hit MAX_PLAN_STEPS. Every step still goes through
  // the exact same AISession/PinnedSessionTooltip review flow as a manual
  // selection edit; this function never touches the document directly.
  const runPlan = async (instruction: string) => {
    usePlanStore.getState().startPlan(instruction);
    let ranOutOfSteps = true;

    for (let stepCount = 0; stepCount < MAX_PLAN_STEPS; stepCount++) {
      const plan = usePlanStore.getState().activePlan;
      if (!plan) break; // shouldn't happen, but don't loop on nothing

      // Lock the editor only for the network round-trip — this is what
      // guarantees the document can't drift between the snapshot we send
      // and the step we get back, so the index-based lookup below can
      // trust its result instead of falling back to a guess.
      editor.setEditable(false);
      let step;
      try {
        const blocks = getDocumentBlocks(editor);
        step = await requestNextPlanStep(blocks, activeTile?.prompt ?? null, instruction, plan.history);
      } finally {
        editor.setEditable(true);
      }

      if (step.targetIndex === -1) {
        ranOutOfSteps = false; // AI genuinely found nothing left to do
        break;
      }

      // Index first (the common, reliable path); exact-text search only as
      // a fallback if the index didn't line up with what we expected.
      const range = findBlockRange(editor, step.targetIndex, step.targetText) ?? findTextRangeAnywhere(editor, step.targetText);

      if (!range) {
        // Couldn't safely locate this step's target — skip it rather than
        // guess, and immediately ask for the next one instead of stalling.
        usePlanStore.getState().appendHistory({ description: step.description, outcome: "skipped" });
        addMessage({
          id: crypto.randomUUID(),
          role: "assistant",
          content: `Skipped a step — couldn't locate "${step.description}" in the document.`,
          createdAt: Date.now(),
          planUpdate: {
            kind: "skipped",
            title: "Skipped a step",
            detail: `Couldn't locate "${step.description}" in the document.`,
          },
        });
        if (!step.done) continue;
        ranOutOfSteps = false;
        break;
      }

      // Narrow the whole-block range down to just the span that actually
      // differs — so a one-word change highlights one word, not the whole
      // paragraph. If there's no real difference, treat it like "nothing
      // to do here" rather than creating an empty highlight.
      const changed = narrowToChangedSpan(range, step.targetText, step.newText);
      if (!changed) {
        usePlanStore.getState().appendHistory({ description: step.description, outcome: "skipped" });
        if (!step.done) continue;
        ranOutOfSteps = false;
        break;
      }

      const session = {
        id: crypto.randomUUID(),
        from: changed.from,
        to: changed.to,
        originalText: changed.originalText,
        originalNodeType: range.nodeType,
        originalNodeAttrs: range.nodeAttrs,
        instruction: step.description,
        status: "success" as const,
        resultText: changed.newText,
        createdAt: Date.now(),
      };

      if (!useAISessionStore.getState().addSession(session)) {
        // Hit MAX_SESSIONS (other manual edits are open right now) — stop
        // here rather than silently drop the rest of the plan.
        addMessage({
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Paused the plan — you're at the active-suggestion limit. Resolve one, then ask me to continue.",
          createdAt: Date.now(),
          planUpdate: {
            kind: "paused",
            title: "Plan paused",
            detail: "You're at the active-suggestion limit. Resolve one, then ask me to continue.",
          },
        });
        break;
      }

      usePlanStore.getState().setCurrentSession(session.id);
      usePlanStore.getState().setStatus("awaiting-review");
      addMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        content: `Step: ${step.description} — review the highlighted suggestion in the editor.`,
        createdAt: Date.now(),
        planUpdate: {
          kind: "step",
          title: step.description,
          detail: "Review the highlighted suggestion in the editor.",
        },
      });

      // Deliberately NOT freeing isLoading here: since planStore only
      // tracks one activePlan at a time, letting the user fire off a second
      // handleSend mid-review could start a second plan that overwrites
      // this one's state while this loop is still suspended below —
      // simplest safe option is to keep the chat locked for the whole plan.
      await waitForSessionRemoval(session.id);

      // Work out accepted vs. rejected by re-reading the same block index
      // rather than tracking live positions — simple, and correct as long
      // as the fallback text-search path above wasn't needed (a known,
      // rare rough edge otherwise).
      const blockAfter = getDocumentBlocks(editor)[step.targetIndex];
      const outcome: "accepted" | "rejected" =
        blockAfter && changed.newText.trim() && blockAfter.text.includes(changed.newText.trim())
          ? "accepted"
          : "rejected";
      usePlanStore.getState().appendHistory({ description: step.description, outcome });

      if (step.done) {
        ranOutOfSteps = false;
        break;
      }
    }

    usePlanStore.getState().setStatus("done");
    const { history } = usePlanStore.getState().activePlan ?? { history: [] };
    const accepted = history.filter((h) => h.outcome === "accepted").length;
    const skipped = history.filter((h) => h.outcome === "skipped").length;
    addMessage({
      id: crypto.randomUUID(),
      role: "assistant",
      content: ranOutOfSteps
        ? `Stopped after ${MAX_PLAN_STEPS} steps — ${accepted} change(s) applied, ${skipped} skipped.`
        : `Plan finished — ${accepted} change(s) applied, ${skipped} skipped.`,
      createdAt: Date.now(),
      planUpdate: {
        kind: "finished",
        title: ranOutOfSteps ? `Stopped after ${MAX_PLAN_STEPS} steps` : "Plan finished",
        detail: `${accepted} change(s) applied, ${skipped} skipped.`,
      },
    });
    usePlanStore.getState().endPlan();
  };

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
      } else if (await requestPlanIntent(userMessage.content)) {
        await runPlan(userMessage.content);
      } else {
        const documentText = editor.getText();

        // Run these together — deciding WHERE to insert doesn't depend on
        // what gets generated, so there's no reason to wait on one before
        // starting the other.
        const [resultText, position] = await Promise.all([
          requestDocumentGeneration(documentText, activeTile?.prompt ?? null, messages, userMessage.content),
          requestInsertPosition(userMessage.content),
        ]);

        const from =
          position === "end"
            ? editor.state.doc.content.size
            : position === "start"
              ? 0
              : editor.state.selection.from;

        insertTextAt(editor, from, resultText);

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

      <div className="chat-panel-messages" ref={messagesRef}>
        {messages.map((m) =>
          m.planUpdate ? (
            <div key={m.id} className={`chat-plan-update chat-plan-update-${m.planUpdate.kind}`}>
              <div className="chat-plan-update-icon">
                <SparkleIcon />
              </div>
              <div className="chat-plan-update-body">
                <p className="chat-plan-update-title">{m.planUpdate.title}</p>
                <p className="chat-plan-update-detail">{m.planUpdate.detail}</p>
              </div>
            </div>
          ) : (
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
          )
        )}
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
        <textarea
          ref={inputRef}
          rows={1}
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
            // Enter sends; Shift+Enter inserts a line break instead.
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
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