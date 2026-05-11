import type { StateCreator } from "zustand";

import api from "@/types/api";
import type { ItemType, ReportMineEntry, ScreenId } from "@/types/types";
import { getErrorMessage } from "@/utils/error-utils";
import { showAppToast } from "@/utils/app-toast";

import {
  isReportMineRow,
  listingFromRow,
  mapRowToggleFavorite,
  mapRowToggleReport,
} from "./row-helpers";
import type { ItemsStoreState, ToggleSlice } from "./types";

export const createToggleSlice: StateCreator<
  ItemsStoreState,
  [],
  [],
  ToggleSlice
> = (set, get) => ({
  toggleFavorite: async (itemId: number) => {
    try {
      let currentFavoriteStatus = false;
      let currentItem: ItemType | undefined;
      const state = get();

      outer: for (const screenKey of [
        "home",
        "favorites",
        "myItems",
        "reported",
        "notifications",
      ] as ScreenId[]) {
        for (const row of state.screens[screenKey].items) {
          const item = listingFromRow(row);
          if (item?.id === itemId) {
            currentFavoriteStatus = item.is_favorited;
            currentItem = item;
            break outer;
          }
        }
      }

      if (!currentItem) {
        console.error("Item not found in any screen");
        return;
      }

      const newFavoriteStatus = !currentFavoriteStatus;

      await api.post(`/api/v1/listings/${itemId}/favorite-toggle/`, {});

      set((state) => {
        const updatedScreens = { ...state.screens };

        (
          [
            "home",
            "favorites",
            "myItems",
            "reported",
            "notifications",
          ] as ScreenId[]
        ).forEach((screenKey) => {
          const screen = updatedScreens[screenKey];

          const updatedRows = screen.items.map((row) =>
            mapRowToggleFavorite(row, itemId, newFavoriteStatus)
          );

          if (screenKey === "favorites") {
            if (!newFavoriteStatus) {
              updatedScreens[screenKey] = {
                ...screen,
                items: updatedRows.filter((row) => {
                  const it = listingFromRow(row);
                  return it?.id !== itemId;
                }),
              };
            } else if (
              newFavoriteStatus &&
              !updatedRows.some((row) => listingFromRow(row)?.id === itemId)
            ) {
              const itemToAdd = { ...currentItem, is_favorited: true };
              const categoryOk =
                screen.selectedCategory === null ||
                Number(itemToAdd.category) === screen.selectedCategory;
              updatedScreens[screenKey] = {
                ...screen,
                items: categoryOk
                  ? [itemToAdd, ...updatedRows]
                  : updatedRows,
              };
            } else {
              updatedScreens[screenKey] = {
                ...screen,
                items: updatedRows,
              };
            }
          } else {
            updatedScreens[screenKey] = {
              ...screen,
              items: updatedRows,
            };
          }
        });

        return { screens: updatedScreens };
      });
    } catch (error) {
      const message = getErrorMessage(error);

      showAppToast({
        type: "error",
        text1: "Error favoriting your item",
        text2: message,
      });
    }
  },

  toggleReport: async (itemId: number, reason: string) => {
    try {
      let currentReportedStatus = false;
      let currentItem: ItemType | undefined;
      const state = get();

      outer: for (const screenKey of [
        "home",
        "favorites",
        "myItems",
        "reported",
        "notifications",
      ] as ScreenId[]) {
        for (const row of state.screens[screenKey].items) {
          const item = listingFromRow(row);
          if (item?.id === itemId) {
            currentReportedStatus = item.is_reported;
            currentItem = item;
            break outer;
          }
        }
      }

      if (!currentItem) {
        console.error("Item not found in any screen");
        return;
      }
      const payload = currentReportedStatus ? {} : { reason };
      const newReportedStatus = !currentReportedStatus;
      await api.post(`/api/v1/listings/${itemId}/report-toggle/`, payload);

      set((state) => {
        const updatedScreens = { ...state.screens };

        (
          [
            "home",
            "favorites",
            "myItems",
            "reported",
            "notifications",
          ] as ScreenId[]
        ).forEach((screenKey) => {
          const screen = updatedScreens[screenKey];

          const updatedRows = screen.items.map((row) =>
            mapRowToggleReport(row, itemId, newReportedStatus)
          );

          if (screenKey === "reported") {
            if (!newReportedStatus) {
              updatedScreens[screenKey] = {
                ...screen,
                items: updatedRows.filter((row) => {
                  if (isReportMineRow(row))
                    return row.item?.id !== itemId && row.item != null;
                  return (row as ItemType).id !== itemId;
                }),
              };
            } else if (
              newReportedStatus &&
              !updatedRows.some((row) =>
                isReportMineRow(row)
                  ? row.item?.id === itemId
                  : (row as ItemType).id === itemId
              )
            ) {
              const itemToAdd = {
                ...currentItem,
                is_reported: true,
              };
              updatedScreens[screenKey] = {
                ...screen,
                items:
                  screen.selectedCategory === null ||
                  Number(itemToAdd.category) === screen.selectedCategory
                    ? [
                        {
                          id: Date.now(),
                          item: itemToAdd,
                          reason,
                          resolved: false,
                          created_at: new Date().toISOString(),
                        } satisfies ReportMineEntry,
                        ...updatedRows,
                      ]
                    : updatedRows,
              };
            } else {
              updatedScreens[screenKey] = {
                ...screen,
                items: updatedRows,
              };
            }
          } else {
            updatedScreens[screenKey] = {
              ...screen,
              items: updatedRows,
            };
          }
        });

        return { screens: updatedScreens };
      });
    } catch (error: unknown) {
      const message = getErrorMessage(error);

      showAppToast({
        type: "error",
        text1: "Error reporting item",
        text2: message,
      });
    }
  },
});
