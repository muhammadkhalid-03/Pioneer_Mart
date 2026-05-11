import { NotificationContextType } from "@/types/types";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useAuth } from "./auth-context";
import { notificationsApi } from "@/services/notifications-api";

const NotificationContext = createContext<NotificationContextType>({
  unreadCount: 0,
  refreshUnreadCount: () => {},
  resetUnreadCount: () => {},
});

export const NotificationProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { authToken } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    if (!authToken) return;
    const count = await notificationsApi.getUnreadCount();
    setUnreadCount(count);
  }, [authToken]);

  const resetUnreadCount = async () => {
    if (!authToken) return;
    await notificationsApi.resetUnreadCount();
    setUnreadCount(0);
  };

  useEffect(() => {
    refreshUnreadCount();
  }, [refreshUnreadCount]);

  return (
    <NotificationContext.Provider
      value={{ unreadCount, refreshUnreadCount, resetUnreadCount }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => useContext(NotificationContext);
