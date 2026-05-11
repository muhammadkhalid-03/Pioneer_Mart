import Constants from "expo-constants";
import { Platform } from "react-native";

import {
  notificationsApi,
  type PushNotificationStatus,
} from "@/services/notifications-api";

type NotificationsModule = typeof import("expo-notifications");

type PushSyncResult =
  | { ok: true; token: string }
  | { ok: false; message: string; code: "unsupported" | "denied" | "config" };

let notificationsHandlerConfigured = false;

function getProjectId(): string | null {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    null
  );
}

function isUnsupportedRuntime(): boolean {
  return (
    Constants.appOwnership === "expo" ||
    Constants.executionEnvironment === "storeClient"
  );
}

function getNotificationsModule(): NotificationsModule | null {
  if (isUnsupportedRuntime()) {
    return null;
  }
  try {
    return require("expo-notifications") as NotificationsModule;
  } catch {
    return null;
  }
}

async function configureNotificationsModule(
  notifications: NotificationsModule,
) {
  if (!notificationsHandlerConfigured) {
    notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
    notificationsHandlerConfigured = true;
  }

  if (Platform.OS === "android") {
    await notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#D44F4F",
    });
  }
}

export async function getNotificationsRuntime() {
  const notifications = getNotificationsModule();
  if (!notifications) return null;

  await configureNotificationsModule(notifications);
  return notifications;
}

export async function syncDevicePushToken(
  requestPermission: boolean,
): Promise<PushSyncResult> {
  if (Platform.OS === "web") {
    return {
      ok: false,
      code: "unsupported",
      message: "Push notifications are available only in the mobile app.",
    };
  }

  const notifications = await getNotificationsRuntime();
  if (!notifications) {
    return {
      ok: false,
      code: "unsupported",
      message:
        "Push notifications are not available in Expo Go or this simulator session. Please use a rebuilt app on a physical device to enable them.",
    };
  }

  const currentPermissions = await notifications.getPermissionsAsync();
  let finalStatus = currentPermissions.status;

  if (finalStatus !== "granted" && requestPermission) {
    const requestedPermissions = await notifications.requestPermissionsAsync();
    finalStatus = requestedPermissions.status;
  }

  if (finalStatus !== "granted") {
    return {
      ok: false,
      code: "denied",
      message:
        "Notifications are turned off for PioneerMart on this device. Please enable them in your device settings to receive alerts.",
    };
  }

  const projectId = getProjectId();
  if (!projectId) {
    return {
      ok: false,
      code: "config",
      message:
        "Push notifications are not configured correctly for this build.",
    };
  }

  try {
    const expoPushToken = await notifications.getExpoPushTokenAsync({
      projectId,
    });
    await notificationsApi.registerPushToken(expoPushToken.data);
    return { ok: true, token: expoPushToken.data };
  } catch {
    return {
      ok: false,
      code: "unsupported",
      message:
        "Push notifications could not be set up on this device right now.",
    };
  }
}

export async function enablePushNotifications(): Promise<PushNotificationStatus> {
  const result = await syncDevicePushToken(true);
  if (!result.ok) {
    throw new Error(result.message);
  }

  const response = await notificationsApi.setPushNotifications(true);
  return {
    push_notifications_enabled: response.push_notifications_enabled,
    has_push_token: true,
  };
}
