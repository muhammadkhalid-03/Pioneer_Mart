import type {
  ItemType,
  ReportMineEntry,
  ScreenId,
} from "@/types/types";

import type { ScreenListRow, ScreenState } from "./types";

export function isReportMineRow(row: ScreenListRow): row is ReportMineEntry {
  return typeof row === "object" && row !== null && "item" in row;
}

export function listingFromRow(row: ScreenListRow): ItemType | undefined {
  if (isReportMineRow(row)) {
    return row.item ?? undefined;
  }
  return row;
}

export function patchRowWithListing(
  row: ScreenListRow,
  listing: ItemType
): ScreenListRow {
  if (isReportMineRow(row)) {
    const it = row.item;
    if (!it || it.id !== listing.id) return row;
    return { ...row, item: listing };
  }
  if ((row as ItemType).id === listing.id) return listing;
  return row;
}

export function mapRowToggleFavorite(
  row: ScreenListRow,
  itemId: number,
  next: boolean
): ScreenListRow {
  if (isReportMineRow(row)) {
    const it = row.item;
    if (!it || it.id !== itemId) return row;
    return { ...row, item: { ...it, is_favorited: next } };
  }
  const item = row as ItemType;
  if (item.id !== itemId) return row;
  return { ...item, is_favorited: next };
}

export function mapRowToggleReport(
  row: ScreenListRow,
  itemId: number,
  next: boolean
): ScreenListRow {
  if (isReportMineRow(row)) {
    const it = row.item;
    if (!it || it.id !== itemId) return row;
    return { ...row, item: { ...it, is_reported: next } };
  }
  const item = row as ItemType;
  if (item.id !== itemId) return row;
  return { ...item, is_reported: next };
}

/** Query params aligned with Django `ListingFilter`, `SearchFilter` (`q`), and `OrderingFilter`. */
export function buildListingRequestParams(
  screen: ScreenState,
  screenId: ScreenId
): Record<string, string | number | boolean> {
  const params: Record<string, string | number | boolean> = {};

  const qText = screen.searchQuery.trim();
  if (qText) {
    params.q = qText;
  }

  if (screen.selectedCategory !== null) {
    params.category = screen.selectedCategory;
  }

  const [priceMin, priceMax] = screen.filterOptions.priceRange;
  params.price_min = priceMin;
  params.price_max = priceMax;

  if (screen.filterOptions.hasActivePurchaseRequest) {
    params.has_purchase_requests = true;
  }

  let ordering: string | undefined;
  const { filterOptions } = screen;
  if (filterOptions.sortByPrice === "asc") ordering = "price";
  else if (filterOptions.sortByPrice === "desc") ordering = "-price";
  else if (filterOptions.sortByDatePosted === "recent") {
    ordering = "-created_at";
  } else if (filterOptions.sortByDatePosted === "older")
    ordering = "created_at";

  if (screenId === "reported" && ordering) {
    ordering = mapOrderingForReportEndpoint(ordering);
  }
  if (ordering) {
    params.ordering = ordering;
  }

  if (screenId === "home" && !params.q && !params.ordering) {
    params.seed = Math.floor(Math.random() * 2147483647);
  }

  return params;
}

function mapOrderingForReportEndpoint(ordering: string): string {
  const sign = ordering.startsWith("-") ? "-" : "";
  const field = ordering.replace(/^-/, "");
  const inner: Record<string, string> = {
    price: "item__price",
    created_at: "item__created_at",
    title: "item__title",
  };
  const mapped = inner[field];
  return mapped ? `${sign}${mapped}` : ordering;
}
