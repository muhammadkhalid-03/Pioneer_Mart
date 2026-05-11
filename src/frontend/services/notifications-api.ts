import api, { PaginatedResponse } from "@/types/api";
import { AppNotification } from "@/types/types";

export interface PushNotificationStatus {
  push_notifications_enabled: boolean;
  has_push_token: boolean;
}

export const notificationsApi = {
  getNotifications: async (type = "all") => {
    const response = await api.get<PaginatedResponse<AppNotification>>(
      `/api/v1/notifications/?type=${type}`
    );
    return response.data.results;
  },

  resetUnreadCount: () =>
    api.post("/api/v1/notifications/reset-unread-count/", {}),

  getUnreadCount: async () => {
    const response = await api.get("/api/v1/notifications/unread-count/");
    return response.data.unread_count as number;
  },

  registerPushToken: async (token: string) => {
    const response = await api.post("/api/v1/notifications/push-token/", {
      token,
    });
    return response.data;
  },

  getPushStatus: async () => {
    const response = await api.get<PushNotificationStatus>(
      "/api/v1/notifications/push-status/"
    );
    return response.data;
  },

  setPushNotifications: async (enabled: boolean) => {
    const response = await api.post<{
      push_notifications_enabled: boolean;
    }>("/api/v1/notifications/push-notifications/", {
      enabled,
    });
    return response.data;
  },
};
