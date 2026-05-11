import { Stack, Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import React, { useEffect } from "react";
import { AppInitializer } from "@/components/app-initializer";
import { AnimatedTabBarButton } from "@/components/animated-tab-bar-button";
import { PushNotificationManager } from "@/components/push-notification-manager";
import { useNotification } from "../contexts/notification-context";
import { useTheme } from "../contexts/theme-context";

// This defines the basic layout of the app after user's logged in
export default function TabLayout() {
  const { unreadCount, refreshUnreadCount } = useNotification();
  const { colors } = useTheme();

  useEffect(() => {
    refreshUnreadCount();
    const interval = setInterval(refreshUnreadCount, 120000);
    return () => clearInterval(interval);
  }, [refreshUnreadCount]);

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
          gestureEnabled: false, // Disable gesture navigation
          headerBackVisible: false, // Hide back button
          animation: "none", // Optional: removes animation which can help with navigation issues
        }}
      />
      <AppInitializer />
      <PushNotificationManager />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingTop: 6,
          },
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarLabelStyle: {
            fontSize: 12,
          },
          tabBarButton: (props) => <AnimatedTabBarButton {...props} />,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ focused }) => (
              <Ionicons
                name={focused ? "home" : "home-outline"}
                size={22}
                color={focused ? colors.accent : colors.textSecondary}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="notifications"
          options={{
            title: "Notification",
            tabBarBadge: unreadCount ? unreadCount : undefined,
            tabBarIcon: ({ focused }) => (
              <Ionicons
                name={focused ? "notifications" : "notifications-outline"}
                size={22}
                color={focused ? colors.accent : colors.textSecondary}
              />
            ),
          }}
        />

        <Tabs.Screen
          name="add-item"
          options={{
            title: "Add Item",
            tabBarIcon: ({ focused }) => (
              <Ionicons
                name="add"
                size={24}
                color={focused ? colors.accent : colors.textSecondary}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="favorites"
          options={{
            title: "Favorites",
            tabBarIcon: ({ focused }) => (
              <MaterialIcons
                name={focused ? "favorite" : "favorite-outline"}
                size={22}
                color={focused ? colors.accent : colors.textSecondary}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: "Settings",
            tabBarIcon: ({ focused }) => (
              <Ionicons
                name={focused ? "settings" : "settings-outline"}
                size={22}
                color={focused ? colors.accent : colors.textSecondary}
              />
            ),
          }}
        />
      </Tabs>
    </>
  );
}
