import { create } from "zustand";
import api from "@/types/api";

interface ChatState {
  unreadCount: number;
  isLoading: boolean;
  fetchUnreadCount: () => Promise<void>;
  resetUnreadCount: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  unreadCount: 0,
  isLoading: false,

  fetchUnreadCount: async () => {
    try {
      set({ isLoading: true });
      const response = await api.get("/api/v1/chat-rooms/unread-count/");
      set({ unreadCount: response.data.unread_count, isLoading: false });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      set({ isLoading: false });
    }
  },

  resetUnreadCount: () => {
    set({ unreadCount: 0 });
  },
}));
