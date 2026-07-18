import type { ChatMessage } from "@/types/chat";
import type { DocumentBlock, PlanHistoryEntry } from "@/types/plan";

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

// Cheap classifier: decides whether a chat instruction is broad enough to
// need the multi-step plan flow, or is really just a normal single edit.
// Kept as its own tiny call (same pattern as buildSelectionIntentPrompt)
// so a wrong guess here is fast and cheap, not a wasted full generation.
export function buildPlanIntentPrompt(instruction: string): string {
  return `A user typed this instruction into a writing assistant's chat: "${instruction}"

Does this instruction ask for a BROAD change likely touching MULTIPLE separate sections of a document (e.g. "make the tone consistent throughout", "reorganize this document", "check all headings for consistency")? Or is it a NARROW request for one piece of new/edited content (e.g. "write an intro paragraph", "make this more formal", "add a conclusion")?

Answer with exactly one word: "broad" or "narrow". If unsure, answer "narrow" — a single edit is the safer default.`;
}

// Asks the AI for exactly ONE next step in an ongoing plan. It sees the
// document as a numbered list of sections (not one long string) so it can
// refer to a section by number instead of having to quote unique text —
// see documentBlocks.ts for why that matters. `history` tells it what's
// already been proposed so it doesn't repeat itself or revisit resolved
// sections.
export function buildPlanStepPrompt(
  blocks: DocumentBlock[],
  tilePrompt: string | null,
  instruction: string,
  history: PlanHistoryEntry[]
): string {
  const blockList = blocks.map((b) => `[${b.index}] (${b.type}) ${b.text}`).join("\n");

  const styleSection = tilePrompt ? `Follow this writing style:\n"""\n${tilePrompt}\n"""\n\n` : "";

  const historySection = history.length
    ? `Steps already taken in this plan:\n${history
        .map((h, i) => `${i + 1}. ${h.description} (${h.outcome})`)
        .join("\n")}\n\n`
    : "";

  return `You are a writing assistant working through a document section by section.

${styleSection}The user's overall instruction: "${instruction}"

The document, numbered into sections:
${blockList}

${historySection}Decide ONE next section that still needs a change to satisfy the instruction, or decide none do.

Respond with ONLY a JSON object — no markdown formatting, no code fences — in exactly this shape:
{
  "targetIndex": <the section number to change, or -1 if done>,
  "targetText": "<the EXACT existing text of that section, copied verbatim>",
  "description": "<short plain-language summary, e.g. 'Reword the Introduction to a formal tone'>",
  "newText": "<the full replacement text for that section>",
  "done": <true if no more sections need changes, false otherwise>
}

Rules:
- Propose only ONE section per response, even if several still need changes.
- Never propose a section already listed above as accepted or rejected.
- targetText must be copied character-for-character from the section list above — not paraphrased.
- If done is true, the other fields are ignored and can be left empty/-1.`;
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