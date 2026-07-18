// A "block" is one top-level node in the document (a heading, a paragraph,
// a list, ...). Instead of handing the AI one long string, we hand it this
// flat numbered list — the INDEX is what a plan step uses to say "change
// block 3", which stays unambiguous even if two blocks contain identical
// text (e.g. two sections both titled "Overview").
export type DocumentBlock = {
  index: number;
  type: string; // ProseMirror node type name, e.g. "heading", "paragraph"
  text: string;
};

// A located block, translated into real ProseMirror document positions —
// this is the shape both findBlockRange and findTextRangeAnywhere return.
export type BlockRange = {
  from: number;
  to: number;
  nodeType: string;
  nodeAttrs: Record<string, unknown>;
};

// What the AI returns for a single plan step. `instructionIsSpecific` is
// answered BEFORE the rest — if the instruction doesn't say enough to
// determine a concrete edit (e.g. "change the word earth" never says what
// to change it to), this comes back false and the other fields are empty,
// rather than the AI inventing the missing detail itself.
export type PlanStepResponse = {
  instructionIsSpecific: boolean;
  targetIndex: number;
  targetText: string;
  description: string;
  newText: string;
  done: boolean;
};

// One entry in a plan's running history, sent back on every following
// request so the AI has context and doesn't repeat itself. `outcome` is
// worked out afterwards by re-reading the document — not by hooking into
// the accept/reject buttons themselves.
export type PlanStepOutcome = "accepted" | "rejected" | "skipped";

export type PlanHistoryEntry = {
  description: string;
  outcome: PlanStepOutcome;
};
