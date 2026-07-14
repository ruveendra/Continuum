// One "tile" = one reusable writing-style prompt (tone, structure, rules —
// whatever the user wants the AI to follow). This is the core unit of the
// Personalize feature.
export type PersonalizeTile = {
  id: string;
  title: string;   // short label shown on the tile card, e.g. "Formal Tone"
  prompt: string;  // the actual instruction text sent to the AI when this tile is active
  isDefault: boolean;
};