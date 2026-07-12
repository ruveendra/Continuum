import { create } from "zustand";
import type { EditorSelection } from "@/types/editor";

const EMPTY_SELECTION: EditorSelection = { from: 0, to: 0, text: "", isEmpty: true };

type EditorStore = {
  selection: EditorSelection;
  setSelection: (selection: EditorSelection) => void;
};

export const useEditorStore = create<EditorStore>((set) => ({
  selection: EMPTY_SELECTION,
  setSelection: (selection) => set({ selection }),
}));