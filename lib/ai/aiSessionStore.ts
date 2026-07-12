import { create } from "zustand";
import type { AISession } from "@/types/ai";

export const MAX_SESSIONS = 4;

type AISessionStore = {
  sessions: AISession[];
  addSession: (session: AISession) => boolean;
  updateSession: (id: string, patch: Partial<AISession>) => void;
  removeSession: (id: string) => void;
};

export const useAISessionStore = create<AISessionStore>((set, get) => ({
  sessions: [],

  addSession: (session) => {
    if (get().sessions.length >= MAX_SESSIONS) return false;
    set((state) => ({ sessions: [...state.sessions, session] }));
    return true;
  },

  updateSession: (id, patch) => {
    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));
  },

  removeSession: (id) => {
    set((state) => ({ sessions: state.sessions.filter((s) => s.id !== id) }));
  },
}));