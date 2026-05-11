import { useItemsStore } from "@/stores/listings/use-items-store";
import { ItemType } from "@/types/types";
import { listingFromRow } from "@/stores/listings/row-helpers";

// hook for fetching the most updated version of an item
export const useLatestItem = (
  itemId: number,
  fallbackItem: ItemType
): ItemType => {
  const homeItems = useItemsStore((state) => state.screens.home.items);
  const favoritesItems = useItemsStore(
    (state) => state.screens.favorites.items
  );
  const myItemsItems = useItemsStore((state) => state.screens.myItems.items);
  return (
    homeItems.map(listingFromRow).find((i) => i?.id === itemId) ||
    favoritesItems.map(listingFromRow).find((i) => i?.id === itemId) ||
    myItemsItems.map(listingFromRow).find((i) => i?.id === itemId) ||
    fallbackItem
  );
};
