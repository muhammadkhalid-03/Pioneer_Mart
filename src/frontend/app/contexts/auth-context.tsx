// auth-context.tsx
import React, {
  createContext,
  useState,
  useContext,
  useEffect,
  useCallback,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import axios from "axios";
import api from "@/types/api";
import { registerAuthTokenBridge } from "@/utils/auth-token-bridge";

export type AuthContextType = {
  authToken: string | null;
  refreshToken: string | null;
  setTokens: (access: string | null, refresh: string | null) => void;
  isAuthenticated: boolean;
  onLogout: () => Promise<void>; //promise to log user out...going to use it with await
  refreshAccessToken: () => Promise<boolean>;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    // Load token from storage when the app starts
    const loadTokens = async () => {
      try {
        const storedAuthToken = await AsyncStorage.getItem("authToken");
        const storedRefreshToken = await AsyncStorage.getItem("refreshToken");
        if (storedAuthToken && storedRefreshToken) {
          setAuthToken(storedAuthToken);
          setRefreshToken(storedRefreshToken);
        }
      } catch (error) {
        console.error("Failed to load auth tokens", error);
      } finally {
        setLoading(false);
      }
    };
    loadTokens();
  }, []);

  const setTokens = async (access: string | null, refresh: string | null) => {
    try {
      if (access && refresh) {
        await AsyncStorage.setItem("authToken", access);
        await AsyncStorage.setItem("refreshToken", refresh);
        setAuthToken(access);
        setRefreshToken(refresh);
      } else {
        await AsyncStorage.removeItem("authToken");
        await AsyncStorage.removeItem("refreshToken");
        setAuthToken(null);
        setRefreshToken(null);
      }
    } catch (error) {
      console.error("Failed to set tokens", error);
    }
  };

  const onLogout = useCallback(async () => {
    try {
      await AsyncStorage.multiRemove(["authToken", "refreshToken"]);
      setAuthToken(null);
      setRefreshToken(null);
      router.replace("/(auth)");
    } catch (error) {
      console.error("Failed to log out", error);
    }
  }, []);

  const refreshAccessToken = async (): Promise<boolean> => {
    const rt = await AsyncStorage.getItem("refreshToken");
    if (!rt) return false;
    try {
      const response = await api.post("/api/v1/auth/token/refresh/", {
        refresh: rt,
      });
      const { access, refresh: newRefresh } = response.data;
      await setTokens(access, newRefresh || rt);
      return true;
    } catch (error) {
      console.error("Failed to refresh token", error);
      if (
        axios.isAxiosError(error) &&
        (error.response?.status === 401 || error.response?.status === 403)
      ) {
        await onLogout();
      }
      return false;
    }
  };

  useEffect(() => {
    registerAuthTokenBridge({
      onTokensRefreshed: (access, refresh) => {
        setAuthToken(access);
        setRefreshToken(refresh);
      },
      onSessionInvalidated: () => {
        setAuthToken(null);
        setRefreshToken(null);
        router.replace("/(auth)");
      },
    });
    return () => registerAuthTokenBridge(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        authToken,
        refreshToken,
        setTokens,
        isAuthenticated: !!authToken,
        loading,
        onLogout,
        refreshAccessToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context as AuthContextType; //type assertion to prevent undefined error
};

// export default AuthProvider;

export default function AuthContextComponent() {
  return <></>; //satisfy the requirement for a component with empty fragment
}
