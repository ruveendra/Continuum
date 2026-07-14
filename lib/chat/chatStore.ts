import { create } from "zustand";
import type { ChatMessage } from "@/types/chat";

type ChatStore = {
  messages: ChatMessage[];
  addMessage: (message: ChatMessage) => void;
  reset: () => void; // clears the conversation, e.g. a "New conversation" button later
};

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],

  addMessage: (message) => {
    set((state) => ({ messages: [...state.messages, message] }));
  },

  reset: () => set({ messages: [] }),
}));