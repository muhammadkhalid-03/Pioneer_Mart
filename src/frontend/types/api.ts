import AsyncStorage from "@react-native-async-storage/async-storage";
// putting this api service so that we don't need another api file
import axios from "axios";
import type { InternalAxiosRequestConfig } from "axios";
import Constants from "expo-constants";
import {
  notifySessionInvalidated,
  notifyTokensRefreshed,
} from "@/utils/auth-token-bridge";
import { getAppVersionHeaderValue } from "@/utils/client-version";
import { presentForceUpgradeFromApiError } from "@/utils/force-upgrade";

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

const DEFAULT_API_URL = "https://env-2325023.us.reclaim.cloud";
const API_BASE_URL = Constants?.expoConfig?.extra?.apiUrl || DEFAULT_API_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

async function clearStoredAuth() {
  await AsyncStorage.multiRemove(["authToken", "refreshToken"]);
}

/** Single in-flight refresh so parallel 401s share one rotation. */
let refreshInFlight: Promise<string | null> | null = null;

function refreshAccessTokenOnce(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const refreshToken = await AsyncStorage.getItem("refreshToken");
        if (!refreshToken) {
          await clearStoredAuth();
          notifySessionInvalidated();
          return null;
        }
        const response = await axios.post(
          `${API_BASE_URL}/api/v1/auth/token/refresh/`,
          { refresh: refreshToken },
          {
            headers: {
              "Content-Type": "application/json",
              "X-App-Version": getAppVersionHeaderValue(),
            },
          }
        );
        const { access, refresh: newRefresh } = response.data;
        const refreshToStore = newRefresh ?? refreshToken;
        await AsyncStorage.setItem("authToken", access);
        await AsyncStorage.setItem("refreshToken", refreshToStore);
        notifyTokensRefreshed(access, refreshToStore);
        return access;
      } catch (err) {
        if (axios.isAxiosError(err)) {
          const status = err.response?.status;
          if (status === 401 || status === 403) {
            await clearStoredAuth();
            notifySessionInvalidated();
          }
        }
        return null;
      }
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

function isRefreshTokenRequest(config: InternalAxiosRequestConfig) {
  const path = config.url ?? "";
  return path.includes("token/refresh");
}

try {
  // request interceptor to add auth token to requests
  api.interceptors.request.use(
    async (config) => {
      config.headers["X-App-Version"] = getAppVersionHeaderValue();
      try {
        const token = await AsyncStorage.getItem("authToken");
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch {}
      // Let React Native set Content-Type (with boundary) for multipart uploads
      if (config.data instanceof FormData) {
        delete config.headers["Content-Type"];
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // response interceptor to handle token refresh
  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config as
        | (InternalAxiosRequestConfig & { _retry?: boolean })
        | undefined;

      if (!originalRequest) {
        return Promise.reject(error);
      }

      const resData = error.response?.data;
      const upgradeCode =
        resData &&
        typeof resData === "object" &&
        "code" in resData &&
        (resData as { code?: string }).code === "upgrade_required";
      if (error.response?.status === 426 || upgradeCode) {
        presentForceUpgradeFromApiError(resData);
        return Promise.reject(error);
      }

      if (error.response?.status === 401 && isRefreshTokenRequest(originalRequest)) {
        await clearStoredAuth();
        notifySessionInvalidated();
        return Promise.reject(error);
      }

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        const access = await refreshAccessTokenOnce();
        if (!access) {
          return Promise.reject(error);
        }
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      }

      // Errors are surfaced by callers (toasts/alerts) to avoid duplicate messages.
      return Promise.reject(error);
    }
  );
} catch (error) {
  if (__DEV__) {
    console.warn("Failed to set up API interceptors:", error);
  }
}

export default api;
