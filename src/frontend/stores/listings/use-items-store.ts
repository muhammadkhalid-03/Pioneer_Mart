import { create } from "zustand";

import type { ItemsStoreState } from "./types";
import { createListingsSlice } from "./listings-slice";
import { createToggleSlice } from "./toggle-slice";

export const useItemsStore = create<ItemsStoreState>()((...a) => ({
  ...createListingsSlice(...a),
  ...createToggleSlice(...a),
}));
