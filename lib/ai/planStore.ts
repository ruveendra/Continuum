import { create } from "zustand";
import type { PlanHistoryEntry } from "@/types/plan";

// Hard ceiling on total steps in one plan, independent of MAX_SESSIONS —
// this bounds how many times we'll ask the AI for "the next step" even if
// it never says done, protecting against a confused model looping forever.
export const MAX_PLAN_STEPS = 8;

// "generating"      — waiting on the next plan-step API call
// "awaiting-review" — a step is highlighted in the editor, waiting on accept/reject
// "done"            — the plan finished (AI said done, or we hit MAX_PLAN_STEPS)
export type PlanStatus = "generating" | "awaiting-review" | "done";

type ActivePlan = {
  instruction: string;
  history: PlanHistoryEntry[];
  // Which AISession (in aiSessionStore) the current step belongs to, so we
  // can tell when THAT specific session gets resolved vs. some unrelated
  // manual selection-tooltip session the user also has open.
  currentSessionId: string | null;
  status: PlanStatus;
};

type PlanStore = {
  activePlan: ActivePlan | null;

  startPlan: (instruction: string) => void;
  setStatus: (status: PlanStatus) => void;
  setCurrentSession: (sessionId: string | null) => void;
  appendHistory: (entry: PlanHistoryEntry) => void;
  endPlan: () => void;
};

export const usePlanStore = create<PlanStore>((set) => ({
  activePlan: null,

  startPlan: (instruction) =>
    set({ activePlan: { instruction, history: [], currentSessionId: null, status: "generating" } }),

  setStatus: (status) =>
    set((state) => (state.activePlan ? { activePlan: { ...state.activePlan, status } } : state)),

  setCurrentSession: (sessionId) =>
    set((state) => (state.activePlan ? { activePlan: { ...state.activePlan, currentSessionId: sessionId } } : state)),

  appendHistory: (entry) =>
    set((state) =>
      state.activePlan
        ? { activePlan: { ...state.activePlan, history: [...state.activePlan.history, entry] } }
        : state
    ),

  endPlan: () => set({ activePlan: null }),
}));
