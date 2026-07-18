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

// Cheap classifier deciding which of two mechanisms should handle a chat
// instruction with no selection: does it refer to something that ALREADY
// EXISTS in the document (needs to be located, then edited — the plan
// loop, whether that ends up being one step or several), or is it asking
// to write BRAND NEW content (insert-at-cursor)? This is deliberately NOT
// "is this a big job" — a one-word find-and-replace ("change X to Y")
// is just as narrow as inserting a sentence, but it still needs the
// document search the plan loop does, not fresh generation. Kept as its
// own tiny call (same pattern as buildSelectionIntentPrompt) so a wrong
// guess here is fast and cheap, not a wasted full generation.
export function buildPlanIntentPrompt(instruction: string): string {
  return `A user typed this instruction into a writing assistant's chat, without selecting any text first: "${instruction}"

Does this instruction refer to changing something that ALREADY EXISTS somewhere in the document (e.g. "replace the word X with Y", "fix the typo in the second paragraph", "make the tone consistent throughout", "reorganize this document")? Or is it asking to write BRAND NEW content that isn't there yet (e.g. "write an intro paragraph", "add a conclusion")?

Answer with exactly one word: "existing" or "new". If unsure, answer "existing" — it's safer to search the document first than to insert unrelated new content.`;
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

${historySection}First, decide: is the user's OVERALL instruction, by itself, specific enough to define a concrete edit? This is a property of the instruction's WORDING alone — decide it independently of whether any section still needs changing right now. Two things that do NOT make an instruction unspecific:
- A deletion/removal instruction (e.g. "remove the duplicate paragraph") is fully specific even though it has no replacement text — the specified change is simply "make this text gone," so newText should just be an empty string.
- Having already fully satisfied the instruction in earlier steps (see steps already taken, above) is a normal, successful completion — respond with instructionIsSpecific: true and done: true, NOT instructionIsSpecific: false. Running out of matching sections is a different situation from never having known what to do.

An instruction IS unspecific only when it omits a detail you would have to invent yourself to act on it (e.g. "change the word earth" never says what to change it to — there is no way to know the intended replacement without guessing).

Only if the instruction is specific, decide ONE next section that still needs a change to satisfy it, or decide none do.

Respond with ONLY a JSON object — no markdown formatting, no code fences — in exactly this shape:
{
  "instructionIsSpecific": <true if the instruction's wording defines a concrete edit — deletions count, and so does an instruction already fully satisfied by prior steps; false ONLY if it omits a detail you'd have to invent>,
  "targetIndex": <the section number to change, or -1 if done>,
  "targetText": "<the EXACT existing text of that section, copied verbatim>",
  "description": "<short plain-language summary, e.g. 'Reword the Introduction to a formal tone'>",
  "newText": "<the full replacement text for that section, or an empty string if this step deletes it>",
  "done": <true if no more sections need changes — whether because the instruction is fully satisfied, or because instructionIsSpecific is false — false otherwise>
}

Rules:
- instructionIsSpecific describes the instruction's own wording, never "is there still work left." Successfully finishing every matching section is instructionIsSpecific: true.
- If instructionIsSpecific is false: set targetIndex to -1, done to true, and leave targetText/newText empty. Do this instead of guessing a replacement, even one that seems reasonable — an incomplete instruction should stop the plan, not be completed on the user's behalf.
- Propose only ONE section per response, even if several still need changes.
- Never propose a section already listed above as accepted or rejected.
- Each line above starts with a "[N] (type)" LABEL we added so you can reference it — that label is NOT part of the document. targetText and newText must start with the actual sentence, never with a "[N]" or "(type)" prefix.
- targetText must be copied character-for-character from the document content (the part AFTER the label) — not paraphrased.
- If done is true, the other fields besides instructionIsSpecific are ignored and can be left empty/-1.`;
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

// Decides WHERE brand-new content should be inserted, since the instruction
// itself might specify a position ("at the very bottom", "at the start")
// instead of leaving it at wherever the cursor happens to be. Deliberately
// only distinguishes start/end/cursor for now — anything more specific
// ("after the Methodology section") would need block-index awareness like
// the plan loop has, which is a separate, bigger piece of work.
export function buildInsertPositionPrompt(instruction: string): string {
  return `A user typed this instruction into a writing assistant's chat: "${instruction}"

Does this instruction specify WHERE new content should be inserted in the document? Answer with exactly one word:
- "end" if it says to add something at the end/bottom of the document
- "start" if it says to add something at the beginning/top of the document
- "cursor" if it doesn't specify a position at all

Answer with exactly one word: "end", "start", or "cursor".`;
}