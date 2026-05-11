import Constants from "expo-constants";
import { Alert, Linking } from "react-native";

let forceUpgradeAlertShown = false;

function isUpgradePayload(
  data: unknown
): data is { code?: string; error?: string } {
  return typeof data === "object" && data !== null;
}

/** Idempotent blocking prompt when API returns upgrade_required / 426. */
export function presentForceUpgradeFromApiError(errorResponseData: unknown): void {
  if (forceUpgradeAlertShown) return;
  if (!isUpgradePayload(errorResponseData)) return;
  if (errorResponseData.code !== "upgrade_required") return;

  forceUpgradeAlertShown = true;
  const message =
    typeof errorResponseData.error === "string"
      ? errorResponseData.error
      : "Please update Pioneer Mart from the App Store.";

  const storeUrl =
    (Constants.expoConfig?.extra as { iosAppStoreUrl?: string } | undefined)
      ?.iosAppStoreUrl ?? "";

  if (storeUrl) {
    Alert.alert("Update required", message, [
      { text: "App Store", onPress: () => void Linking.openURL(storeUrl) },
    ]);
  } else {
    Alert.alert("Update required", message);
  }
}
