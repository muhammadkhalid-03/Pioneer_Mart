import type {
  ItemType,
  ReportMineEntry,
  ScreenId,
} from "@/types/types";

export type ScreenListRow = ItemType | ReportMineEntry;

export interface FilterOptions {
  priceRange: [number, number];
  hasActivePurchaseRequest: boolean;
  isSold: boolean;
  sortByPrice: "asc" | "desc" | null;
  sortByDatePosted: "recent" | "older" | null;
}

export interface ScreenState {
  items: ScreenListRow[];
  searchQuery: string;
  selectedCategory: number | null;
  filterOptions: FilterOptions;
  isLoading: boolean;
  isLoadingMore: boolean;
  lastUpdated: number;
  nextPage: string | null;
  hasMore: boolean;
}

export interface ItemsStoreState {
  screens: Record<ScreenId, ScreenState>;
  activeScreen: ScreenId;
  categories: { id: number; name: string }[];
  refreshItems: (screenId: ScreenId) => Promise<void>;
  updateItem: (updatedItem: ItemType) => void;
  isConnected: boolean;
  setIsConnected: (status: boolean) => void;
  setIsReturningFromDetails: (value: boolean) => void;
  setActiveScreen: (screenId: ScreenId) => void;

  /** Updates filter modal options and reloads listings from API (excluding reported special shape). */
  applyFilters: (
    screenId: ScreenId,
    filterOptions: FilterOptions
  ) => Promise<void>;
  resetFilters: (screenId: ScreenId) => Promise<void>;

  isReturningFromDetails: boolean;

  loadItems: (screenId: ScreenId) => Promise<void>;
  loadCategories: () => Promise<void>;
  loadMoreItems: (screenId: ScreenId) => Promise<void>;

  performSearch: (screenId: ScreenId, query: string) => Promise<void>;
  filterByCategory: (
    screenId: ScreenId,
    categoryId: number | null
  ) => Promise<void>;
  clearSearch: (screenId: ScreenId) => void;

  /** Refetch current screen listing data using latest filter/category/search params. */
  fetchWithParams: (screenId: ScreenId) => Promise<void>;

  toggleFavorite: (itemId: number) => Promise<void>;
  toggleReport: (itemId: number, reason: string) => Promise<void>;
}

/** Keys owned by listings slice for StateCreator variance. */
export type ListingsSlice = Omit<
  ItemsStoreState,
  "toggleFavorite" | "toggleReport"
>;

export type ToggleSlice = Pick<
  ItemsStoreState,
  "toggleFavorite" | "toggleReport"
>;

export const initialScreenState: ScreenState = {
  items: [],
  searchQuery: "",
  selectedCategory: null,
  filterOptions: {
    priceRange: [0, 1000],
    hasActivePurchaseRequest: false,
    isSold: false,
    sortByPrice: null,
    sortByDatePosted: null,
  },
  isLoading: false,
  isLoadingMore: false,
  lastUpdated: 0,
  nextPage: null,
  hasMore: false,
};
