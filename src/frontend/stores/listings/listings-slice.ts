import type { StateCreator } from "zustand";

import api, { PaginatedResponse } from "@/types/api";
import type {
  CategoryType,
  ItemType,
  ReportMineEntry,
  ScreenId,
} from "@/types/types";
import { getErrorMessage } from "@/utils/error-utils";
import { showAppToast } from "@/utils/app-toast";

import { buildListingRequestParams, patchRowWithListing } from "./row-helpers";
import type { ItemsStoreState, ListingsSlice, ScreenListRow } from "./types";
import { initialScreenState } from "./types";

export const createListingsSlice: StateCreator<
  ItemsStoreState,
  [],
  [],
  ListingsSlice
> = (set, get) => ({
  screens: {
    home: { ...initialScreenState },
    favorites: { ...initialScreenState },
    reported: { ...initialScreenState },
    myItems: { ...initialScreenState },
    notifications: { ...initialScreenState },
  },
  activeScreen: "home",
  categories: [],
  isReturningFromDetails: false,
  setIsReturningFromDetails: (value) => set({ isReturningFromDetails: value }),
  isConnected: true,
  setIsConnected: (status: boolean) => set({ isConnected: status }),
  setActiveScreen: (screenId) => set({ activeScreen: screenId }),

  applyFilters: async (screenId, filterOptions) => {
    if (screenId === "notifications") return;
    set((state) => ({
      screens: {
        ...state.screens,
        [screenId]: {
          ...state.screens[screenId],
          filterOptions,
          isLoading: true,
        },
      },
    }));
    await get().fetchWithParams(screenId);
  },

  resetFilters: async (screenId) => {
    if (screenId === "notifications") return;
    const defaultFilters = initialScreenState.filterOptions;
    set((state) => ({
      screens: {
        ...state.screens,
        [screenId]: {
          ...state.screens[screenId],
          filterOptions: defaultFilters,
          isLoading: true,
        },
      },
    }));
    await get().fetchWithParams(screenId);
  },

  fetchWithParams: async (screenId: ScreenId) => {
    if (screenId === "notifications") return;
    const { isConnected } = get();
    if (!isConnected) {
      showAppToast({
        type: "error",
        text1: "You're offline",
        text2: "Please check your internet connection",
      });
      set((state) => ({
        screens: {
          ...state.screens,
          [screenId]: { ...state.screens[screenId], isLoading: false },
        },
      }));
      return;
    }

    let endpoint = "";
    if (screenId === "home") {
      endpoint = "/api/v1/listings/";
    } else if (screenId === "favorites") {
      endpoint = "/api/v1/listings/favorites/";
    } else if (screenId === "reported") {
      endpoint = "/api/v1/reports/mine/";
    } else {
      endpoint = "/api/v1/listings/mine/";
    }

    const screen = get().screens[screenId];
    const params = buildListingRequestParams(screen, screenId);

    try {
      const response =
        screenId === "reported"
          ? await api.get<PaginatedResponse<ReportMineEntry>>(endpoint, {
              params,
            })
          : await api.get<PaginatedResponse<ItemType>>(endpoint, {
              params,
            });

      set((state) => ({
        screens: {
          ...state.screens,
          [screenId]: {
            ...state.screens[screenId],
            items: response.data.results as ScreenListRow[],
            isLoading: false,
            lastUpdated: Date.now(),
            nextPage: response.data.next,
            hasMore: response.data.next !== null,
          },
        },
      }));
    } catch (error) {
      console.error(`Error loading items for ${screenId}:`, error);
      const message = getErrorMessage(error);

      showAppToast({
        type: "error",
        text1: "Loading items failed",
        text2: message,
      });

      set((state) => ({
        screens: {
          ...state.screens,
          [screenId]: {
            ...state.screens[screenId],
            items: [],
            isLoading: false,
            nextPage: null,
            hasMore: false,
          },
        },
      }));
    }
  },

  updateItem: (updatedItem: ItemType) => {
    set((state) => {
      const updatedScreens = { ...state.screens };
      for (const key in updatedScreens) {
        const screenId = key as ScreenId;
        const screen = updatedScreens[screenId];
        updatedScreens[screenId] = {
          ...screen,
          items: screen.items.map((row) =>
            patchRowWithListing(row, updatedItem),
          ),
        };
      }
      return { screens: updatedScreens };
    });
  },

  refreshItems: async (screenId: ScreenId) => {
    if (screenId === "notifications") return;
    const { isConnected } = get();
    if (!isConnected) {
      showAppToast({
        type: "error",
        text1: "You're offline",
        text2: "Please check your internet connection",
      });
      return;
    }
    const currentScreen = get().screens[screenId];
    const now = Date.now();

    if (
      now - currentScreen.lastUpdated < 5000 &&
      currentScreen.items.length > 0
    ) {
      return;
    }
    set((state) => ({
      screens: {
        ...state.screens,
        [screenId]: { ...state.screens[screenId], isLoading: true },
      },
    }));

    let endpoint = "";
    if (screenId === "home") {
      endpoint = "/api/v1/listings/";
    } else if (screenId === "favorites") {
      endpoint = "/api/v1/listings/favorites/";
    } else if (screenId === "reported") {
      endpoint = "/api/v1/reports/mine/";
    } else {
      endpoint = "/api/v1/listings/mine/";
    }

    try {
      const params = buildListingRequestParams(currentScreen, screenId);
      const response =
        screenId === "reported"
          ? await api.get<PaginatedResponse<ReportMineEntry>>(endpoint, {
              params: { ...params, _t: Date.now() },
            })
          : await api.get<PaginatedResponse<ItemType>>(endpoint, {
              params: { ...params, _t: Date.now() },
            });

      set((state) => ({
        screens: {
          ...state.screens,
          [screenId]: {
            ...state.screens[screenId],
            items: response.data.results as ScreenListRow[],
            isLoading: false,
            lastUpdated: Date.now(),
            nextPage: response.data.next,
            hasMore: response.data.next !== null,
          },
        },
      }));
    } catch (error) {
      console.error(`Error refreshing items for ${screenId}:`, error);

      const message = getErrorMessage(error);

      showAppToast({
        type: "error",
        text1: "Refresh failed",
        text2: message,
      });

      set((state) => ({
        screens: {
          ...state.screens,
          [screenId]: {
            ...state.screens[screenId],
            isLoading: false,
          },
        },
      }));
    }
  },

  loadItems: async (screenId: ScreenId) => {
    if (screenId === "notifications") return;

    const currentScreen = get().screens[screenId];
    const now = Date.now();
    if (
      now - currentScreen.lastUpdated < 2000 &&
      currentScreen.items.length > 0
    ) {
      return;
    }
    set((state) => ({
      screens: {
        ...state.screens,
        [screenId]: { ...state.screens[screenId], isLoading: true },
      },
    }));
    await get().fetchWithParams(screenId);
  },

  loadMoreItems: async (screenId: ScreenId) => {
    if (screenId === "notifications") return;

    const currentScreen = get().screens[screenId];

    if (!currentScreen.nextPage || currentScreen.isLoadingMore) {
      return;
    }
    set((state) => ({
      screens: {
        ...state.screens,
        [screenId]: { ...state.screens[screenId], isLoadingMore: true },
      },
    }));
    try {
      const response =
        screenId === "reported"
          ? await api.get<PaginatedResponse<ReportMineEntry>>(
              currentScreen.nextPage,
            )
          : await api.get<PaginatedResponse<ItemType>>(currentScreen.nextPage);

      const updatedItems = [
        ...currentScreen.items,
        ...response.data.results,
      ] as ScreenListRow[];

      set((state) => ({
        screens: {
          ...state.screens,
          [screenId]: {
            ...state.screens[screenId],
            items: updatedItems,
            isLoadingMore: false,
            nextPage: response.data.next,
            hasMore: response.data.next !== null,
          },
        },
      }));
    } catch (error) {
      console.error(`Error loading more items for ${screenId}:`, error);
      const message = getErrorMessage(error);

      showAppToast({
        type: "error",
        text1: "Loading more items failed",
        text2: message,
      });
      set((state) => ({
        screens: {
          ...state.screens,
          [screenId]: {
            ...state.screens[screenId],
            isLoadingMore: false,
          },
        },
      }));
    }
  },

  loadCategories: async () => {
    try {
      const response = await api.get<CategoryType[]>(
        "/api/v1/listing-categories/",
      );
      set({ categories: response.data });
    } catch (error) {
      const message = getErrorMessage(error);

      showAppToast({
        type: "error",
        text1: "Error getting categories",
        text2: message,
      });
      set({ categories: [] });
    }
  },

  performSearch: async (screenId: ScreenId, query: string) => {
    if (screenId === "notifications") return;

    set((state) => ({
      screens: {
        ...state.screens,
        [screenId]: {
          ...state.screens[screenId],
          searchQuery: query,
          isLoading: true,
        },
      },
    }));

    await get().fetchWithParams(screenId);
  },

  filterByCategory: async (screenId: ScreenId, categoryId: number | null) => {
    if (screenId === "notifications") return;
    set((state) => {
      const currentScreen = state.screens[screenId];
      return {
        screens: {
          ...state.screens,
          [screenId]: {
            ...currentScreen,
            selectedCategory: categoryId,
            isLoading: true,
          },
        },
      };
    });
    await get().fetchWithParams(screenId);
  },

  clearSearch: (screenId: ScreenId) => {
    if (screenId === "notifications") return;
    set((state) => ({
      screens: {
        ...state.screens,
        [screenId]: {
          ...state.screens[screenId],
          searchQuery: "",
        },
      },
    }));

    void get().loadItems(screenId);
  },
});
