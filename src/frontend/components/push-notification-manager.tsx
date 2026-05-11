import { useAuth } from "@/app/contexts/auth-context";
import { useNotification } from "@/app/contexts/notification-context";
import {
  getNotificationsRuntime,
  syncDevicePushToken,
} from "@/services/push-notifications";
import { router } from "expo-router";
import { useEffect } from "react";

export const PushNotificationManager = () => {
  const { isAuthenticated } = useAuth();
  const { refreshUnreadCount } = useNotification();

  useEffect(() => {
    if (!isAuthenticated) return;

    const syncToken = async () => {
      try {
        await syncDevicePushToken(false);
      } catch (error) {
        if (__DEV__) {
          console.warn("Push token sync failed:", error);
        }
      }
    };

    void syncToken();
  }, [isAuthenticated]);

  useEffect(() => {
    let receivedSubscription: { remove: () => void } | null = null;
    let responseSubscription: { remove: () => void } | null = null;

    const attachListeners = async () => {
      const notifications = await getNotificationsRuntime();
      if (!notifications) return;

      receivedSubscription =
        notifications.addNotificationReceivedListener(() => {
          void refreshUnreadCount();
        });

      responseSubscription =
        notifications.addNotificationResponseReceivedListener(() => {
          void refreshUnreadCount();
          router.push("/(tabs)/notifications");
        });
    };

    void attachListeners();

    return () => {
      receivedSubscription?.remove();
      responseSubscription?.remove();
    };
  }, [refreshUnreadCount]);

  return null;
};
