import type { Editor } from "@tiptap/react";
import type { DocumentBlock, BlockRange } from "@/types/plan";

// Walks the document's top-level nodes and returns them as a flat, numbered
// list. This is what gets sent to the AI instead of one long string, and
// the index it assigns here is the same index a plan step will later refer
// back to.
export function getDocumentBlocks(editor: Editor): DocumentBlock[] {
  const blocks: DocumentBlock[] = [];

  editor.state.doc.forEach((node) => {
    // textBetween with a " " separator matches the convention already used
    // in selection.ts — block children get joined with spaces instead of
    // running together with no gap.
    const text = node.textBetween(0, node.content.size, " ").trim();
    if (!text) return; // skip empty paragraphs — nothing there to target

    blocks.push({ index: blocks.length, type: node.type.name, text });
  });

  return blocks;
}

// Locates a plan step's target by the index getDocumentBlocks assigned it,
// then CONFIRMS that block still actually contains the expected text before
// trusting the match. If the document changed enough that the index no
// longer lines up, this returns null rather than guessing — the caller can
// fall back to findTextRangeAnywhere, or give up on this step entirely.
export function findBlockRange(
  editor: Editor,
  targetIndex: number,
  targetText: string
): BlockRange | null {
  const needle = targetText.trim();
  let match: BlockRange | null = null;
  let currentIndex = -1;

  editor.state.doc.forEach((node, offset) => {
    if (match) return; // already found — doc.forEach has no early-exit

    const text = node.textBetween(0, node.content.size, " ").trim();
    if (!text) return;

    currentIndex++;
    if (currentIndex !== targetIndex) return;
    if (!text.includes(needle)) return; // index lined up, but content didn't — don't trust it

    match = {
      from: offset + 1,
      to: offset + 1 + node.content.size,
      nodeType: node.type.name,
      nodeAttrs: node.attrs,
    };
  });

  return match;
}

// Fallback for when the index doesn't resolve: search every block for an
// EXACT occurrence of the target text. If it shows up in more than one
// block, that's ambiguous — we refuse the match rather than picking one,
// since a confident wrong guess is worse than an honest "couldn't find it."
export function findTextRangeAnywhere(editor: Editor, targetText: string): BlockRange | null {
  const needle = targetText.trim();
  let match: BlockRange | null = null;
  let matchCount = 0;

  editor.state.doc.forEach((node, offset) => {
    const text = node.textBetween(0, node.content.size, " ");
    const matchIndex = text.indexOf(needle);
    if (matchIndex === -1) return;

    matchCount++;
    if (matchCount === 1) {
      match = {
        from: offset + 1 + matchIndex,
        to: offset + 1 + matchIndex + needle.length,
        nodeType: node.type.name,
        nodeAttrs: node.attrs,
      };
    }
  });

  return matchCount === 1 ? match : null;
}
