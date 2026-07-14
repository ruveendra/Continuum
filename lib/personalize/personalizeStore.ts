import { create } from "zustand";
import type { PersonalizeTile } from "@/types/personalize";

export const MAX_TILES = 10;

// The four built-in styles every user starts with. Marked isDefault: true
// so the UI knows not to show a delete button on these.
const DEFAULT_TILES: PersonalizeTile[] = [
  {
    id: "default-formal",
    title: "Formal",
    prompt: "Write in a formal, professional tone. Avoid contractions and casual phrasing.",
    isDefault: true,
  },
  {
    id: "default-casual",
    title: "Casual",
    prompt: "Write in a relaxed, conversational tone, like explaining something to a friend.",
    isDefault: true,
  },
  {
    id: "default-concise",
    title: "Concise",
    prompt: "Be brief and direct. Cut unnecessary words. Prefer short sentences.",
    isDefault: true,
  },
  {
    id: "default-descriptive",
    title: "Descriptive",
    prompt: "Use vivid, detailed language. Favor rich imagery over brevity.",
    isDefault: true,
  },
];

type PersonalizeStore = {
  tiles: PersonalizeTile[];
  activeTileId: string | null;

  addTile: (tile: PersonalizeTile) => boolean; // returns false if cap reached
  updateTile: (id: string, patch: Partial<PersonalizeTile>) => void;
  removeTile: (id: string) => void; // silently no-ops on default tiles
  setActiveTile: (id: string | null) => void;
};

export const usePersonalizeStore = create<PersonalizeStore>((set, get) => ({
  tiles: DEFAULT_TILES, // start every user with the 4 built-in styles already present
  activeTileId: null,

  addTile: (tile) => {
    if (get().tiles.length >= MAX_TILES) return false;
    set((state) => ({ tiles: [...state.tiles, tile] }));
    return true;
  },

  updateTile: (id, patch) => {
    set((state) => ({
      tiles: state.tiles.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));
  },

  removeTile: (id) => {
    const tile = get().tiles.find((t) => t.id === id);
    if (!tile || tile.isDefault) return; // guard: defaults can never be removed

    set((state) => ({
      tiles: state.tiles.filter((t) => t.id !== id),
      activeTileId: state.activeTileId === id ? null : state.activeTileId,
    }));
  },

  setActiveTile: (id) => set({ activeTileId: id }),
}));