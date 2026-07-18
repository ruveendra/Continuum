import { create } from "zustand";
import type { AISession } from "@/types/ai";

export const MAX_SESSIONS = 4;

type AISessionStore = {
  sessions: AISession[];
  addSession: (session: AISession) => boolean;
  updateSession: (id: string, patch: Partial<AISession>) => void;
  removeSession: (id: string) => void;
  clearSessions: () => void;
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

  // Drops every pending session at once — used when the user confirms
  // leaving the editor tab despite pending suggestions, rather than
  // resolving them one at a time.
  clearSessions: () => set({ sessions: [] }),
}));

// Lets async code (the plan loop) pause until a specific session is
// resolved — accepted or rejected, doesn't matter which, both paths end
// with removeSession(id). Deliberately doesn't touch PinnedSessionTooltip's
// accept/reject handlers at all; it just watches the store for the session
// to disappear.
export function waitForSessionRemoval(sessionId: string): Promise<void> {
  return new Promise((resolve) => {
    const unsubscribe = useAISessionStore.subscribe((state) => {
      if (!state.sessions.some((s) => s.id === sessionId)) {
        unsubscribe();
        resolve();
      }
    });
  });
}