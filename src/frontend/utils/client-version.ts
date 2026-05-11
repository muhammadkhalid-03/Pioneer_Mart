import Constants from "expo-constants";

/** Marketing version from app.config; must match what you enforce with MIN_APP_VERSION on the server. */
export function getAppVersionHeaderValue(): string {
  return Constants.expoConfig?.version ?? "0.0.0";
}
