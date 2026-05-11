import { useAuth } from "@/app/contexts/auth-context";
import { useUserStore } from "@/stores/user-store";
import { useEffect } from "react";

export const AppInitializer = () => {
  const { isAuthenticated } = useAuth();
  const { fetchUserData } = useUserStore();

  useEffect(() => {
    const initializeApp = async () => {
      if (isAuthenticated) {
        try {
          await fetchUserData();
        } catch {
          console.log("Failed to fetch user data");
        }
      }
    };
    initializeApp();
  }, [isAuthenticated, fetchUserData]);
  return null;
};
