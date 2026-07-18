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

type Token = { text: string; start: number; end: number };

// Splits on whitespace while keeping each word's exact character position —
// diffing at the WORD level (not character level) means a trimmed span
// always lands on a word boundary, never mid-word.
function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  for (const match of text.matchAll(/\S+/g)) {
    tokens.push({ text: match[0], start: match.index, end: match.index + match[0].length });
  }
  return tokens;
}

// Below this many words in the "changed middle," or below this fraction of
// matching words in it, we assume it's one localized edit. Above both, it's
// more likely two-or-more separate word swaps sharing this block — these
// thresholds are a heuristic judgment call, not an exact science.
const SCATTERED_MIN_MIDDLE_WORDS = 6;
const SCATTERED_MATCH_RATIO = 0.5;

// A block-level range covers the WHOLE section, and newText is the whole
// replacement section — so without this, even a one-word change would
// highlight and replace the entire paragraph. This finds the smallest
// word-aligned span that actually differs, trimming off whatever matching
// words sit at the start and end. If the leftover "changed middle" still
// contains a long stretch of words that match one-to-one between old and
// new, that's a sign of multiple separate edits packed into one step —
// narrowing to that whole stretch would still be misleading, so we fall
// back to highlighting the entire block instead.
export function narrowToChangedSpan(
  range: BlockRange,
  originalText: string,
  newText: string
): { from: number; to: number; originalText: string; newText: string } | null {
  const origTokens = tokenize(originalText);
  const newTokens = tokenize(newText);

  let prefixCount = 0;
  while (
    prefixCount < origTokens.length &&
    prefixCount < newTokens.length &&
    origTokens[prefixCount].text === newTokens[prefixCount].text
  ) {
    prefixCount++;
  }

  const maxSuffixCount = Math.min(origTokens.length, newTokens.length) - prefixCount;
  let suffixCount = 0;
  while (
    suffixCount < maxSuffixCount &&
    origTokens[origTokens.length - 1 - suffixCount].text === newTokens[newTokens.length - 1 - suffixCount].text
  ) {
    suffixCount++;
  }

  const origMiddleStart = prefixCount;
  const origMiddleEnd = origTokens.length - 1 - suffixCount; // inclusive
  const newMiddleStart = prefixCount;
  const newMiddleEnd = newTokens.length - 1 - suffixCount; // inclusive

  const hasOrigMiddle = origMiddleStart <= origMiddleEnd;
  const hasNewMiddle = newMiddleStart <= newMiddleEnd;

  if (!hasOrigMiddle && !hasNewMiddle) return null; // same words in the same order — nothing actually changed

  if (hasOrigMiddle && hasNewMiddle) {
    const origMiddle = origTokens.slice(origMiddleStart, origMiddleEnd + 1);
    const newMiddle = newTokens.slice(newMiddleStart, newMiddleEnd + 1);
    const matchCount =
      origMiddle.length === newMiddle.length
        ? origMiddle.filter((t, i) => t.text === newMiddle[i].text).length
        : 0;

    if (
      origMiddle.length === newMiddle.length &&
      origMiddle.length > SCATTERED_MIN_MIDDLE_WORDS &&
      matchCount / origMiddle.length > SCATTERED_MATCH_RATIO
    ) {
      return { from: range.from, to: range.to, originalText, newText };
    }
  }

  const origStart = hasOrigMiddle ? origTokens[origMiddleStart].start : prefixCount > 0 ? origTokens[prefixCount - 1].end : 0;
  const origEnd = hasOrigMiddle ? origTokens[origMiddleEnd].end : origStart;
  const newStart = hasNewMiddle ? newTokens[newMiddleStart].start : prefixCount > 0 ? newTokens[prefixCount - 1].end : 0;
  const newEnd = hasNewMiddle ? newTokens[newMiddleEnd].end : newStart;

  return {
    from: range.from + origStart,
    to: range.from + origEnd,
    originalText: originalText.slice(origStart, origEnd),
    newText: newText.slice(newStart, newEnd),
  };
}
