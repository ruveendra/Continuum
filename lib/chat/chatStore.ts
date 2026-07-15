import { create } from "zustand";
import type { ChatMessage, PendingGeneration } from "@/types/chat";

type ChatStore = {
  messages: ChatMessage[];
  pendingGeneration: PendingGeneration | null;

  addMessage: (message: ChatMessage) => void;
  updateMessage: (id: string, patch: Partial<ChatMessage>) => void;
  setPendingGeneration: (pending: PendingGeneration | null) => void;
  reset: () => void;
};

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  pendingGeneration: null,

  addMessage: (message) => {
    set((state) => ({ messages: [...state.messages, message] }));
  },

  updateMessage: (id, patch) => {
    set((state) => ({
      messages: state.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    }));
  },

  setPendingGeneration: (pending) => set({ pendingGeneration: pending }),

  reset: () => set({ messages: [], pendingGeneration: null }),
}));