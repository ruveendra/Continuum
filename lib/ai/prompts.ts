import type { ChatMessage } from "@/types/chat";

// Turns the user's selected text + instruction into a single prompt string
// for the AI. Kept separate from the route handler so prompt wording can
// be tuned independently of request/response plumbing.
export function buildRewritePrompt(text: string, instruction: string): string {
  return `You are a writing assistant embedded in a rich text editor.

The user selected the following text:
"""
${text}
"""

Their instruction: "${instruction}"

Rewrite the selected text according to the instruction. Return ONLY the
rewritten text — no explanations, no preamble, no quotation marks around
the output, no markdown formatting.`;
}


// Builds the prompt for the persistent chat panel. Unlike buildRewritePrompt
// (which only sees a selected snippet), this sees the WHOLE document, the
// active personalization style, and the conversation so far — so it can
// write NEW content that fits both the existing document and the user's
// chosen style.
export function buildChatGenerationPrompt(
  documentText: string,
  tilePrompt: string | null,
  history: ChatMessage[],
  instruction: string
): string {
  const styleSection = tilePrompt
    ? `Follow this writing style:\n"""\n${tilePrompt}\n"""\n\n`
    : "";

  // Only include past USER instructions as conversation context — the
  // assistant's own past replies aren't needed here since the document
  // itself already reflects whatever was generated before.
  const historySection = history
    .filter((m) => m.role === "user")
    .map((m) => `- ${m.content}`)
    .join("\n");

  return `You are a writing assistant embedded in a rich text editor.

${styleSection}Current document content:
"""
${documentText}
"""

${historySection ? `Earlier instructions in this conversation:\n${historySection}\n\n` : ""}New instruction: "${instruction}"

Write the content the user is asking for, taking the existing document and
any earlier instructions into account. Return ONLY the new text to insert —
no explanations, no preamble, no markdown formatting.`;
}

// Asks the AI a yes/no question: does this instruction actually want to
// change the currently selected text, or is it unrelated? Kept as a
// SEPARATE, cheap call rather than folding into the main generation
// prompt, so the classification logic stays simple to reason about and
// easy to test independently of the actual rewrite.
export function buildSelectionIntentPrompt(selectedText: string, instruction: string): string {
  return `A user has this text selected in their document:
"""
${selectedText}
"""

They then typed this instruction in a chat: "${instruction}"

Does the instruction intend to modify, rewrite, or change the MEANING of the selected text specifically? Answer with exactly one word: "yes" or "no". If the instruction is about writing something new or unrelated to the selected text, answer "no".`;
}