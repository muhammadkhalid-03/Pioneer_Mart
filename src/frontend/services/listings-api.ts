import api, { PaginatedResponse } from "@/types/api";
import { ItemType } from "@/types/types";

export const listingsApi = {
  getItem: (id: number | string) =>
    api.get<ItemType>(`/api/v1/listings/${id}/`),

  createListing: (formData: FormData) =>
    api.post<ItemType>("/api/v1/listings/", formData),

  updateListing: (id: number | string, formData: FormData) =>
    api.put<ItemType>(`/api/v1/listings/${id}/`, formData),

  deleteListing: (id: number | string) =>
    api.delete(`/api/v1/listings/${id}/`),

  getFeed: (params?: Record<string, string | number>) =>
    api.get<PaginatedResponse<ItemType>>("/api/v1/listings/", { params }),

  moderateText: (text: string) =>
    api.post("/api/v1/listings/moderate-text/", { text }),

  moderateImage: (imageFormData: FormData) =>
    api.post("/api/v1/listings/moderate-image/", imageFormData),

  requestPurchase: (itemId: number | string) =>
    api.post(`/api/v1/listings/${itemId}/purchase-requests/`, {}),

  resolveChatRoom: (otherUserId: number | string, listingId: number | string) =>
    api.get("/api/v1/chat-rooms/resolve/", {
      params: { other_user_id: otherUserId, listing_id: listingId },
    }),

  toggleFavorite: (itemId: number | string) =>
    api.post(`/api/v1/listings/${itemId}/favorite-toggle/`, {}),

  toggleReport: (itemId: number | string, payload: Record<string, string>) =>
    api.post(`/api/v1/listings/${itemId}/report-toggle/`, payload),
};
