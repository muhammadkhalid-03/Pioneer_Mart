import { create } from "zustand";
import { UserInfo } from "@/types/types";
import api, { PaginatedResponse } from "@/types/api";
import { getErrorMessage } from "@/utils/error-utils";

interface UserState {
  userData: UserInfo | null;
  isLoading: boolean;
  error: string | null;
  fetchUserData: () => Promise<UserInfo[] | undefined>;
  updateUserData: (userData: Partial<UserInfo>) => Promise<void>;
  clearUserData: () => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  userData: null,
  isLoading: false,
  error: null,

  fetchUserData: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await api.get<PaginatedResponse<UserInfo>>(
        "/api/v1/users/"
      );
      if (response.data.results && response.data.results.length > 0) {
        set({ userData: response.data.results[0], isLoading: false });
        return response.data.results;
      } else {
        set({ userData: null, isLoading: false, error: "No user data found" });
      }
    } catch (error) {
      console.error("Error getting user profile:", error);
      set({
        error: getErrorMessage(error),
        isLoading: false,
      });
      throw error;
    }
  },

  updateUserData: async (updatedData: Partial<UserInfo>) => {
    try {
      set({ isLoading: true, error: null });
      const userData = get().userData;
      if (!userData || !userData.id) {
        throw new Error("No user data available to update");
      }
      const response = await api.patch(
        `/api/v1/users/${userData.id}/`,
        updatedData
      );
      set({
        userData: { ...userData, ...response.data },
        isLoading: false,
      });
      return response.data;
    } catch (error) {
      console.error("Error updating user data:", error);
      set({
        error: getErrorMessage(error),
        isLoading: false,
      });
    }
  },

  clearUserData: () => {
    set({ userData: null, error: null });
  },
}));
