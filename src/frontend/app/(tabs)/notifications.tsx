import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Stack } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";
import Header from "@/components/header";
import { notificationsApi } from "@/services/notifications-api";
import { showAppToast } from "@/utils/app-toast";
import { useFocusEffect } from "@react-navigation/native";
import { useNotification } from "../contexts/notification-context";
import { useTheme } from "../contexts/theme-context";
import { AppNotification } from "@/types/types";

const NotificationIcon = ({ type }: { type: AppNotification["type"] }) => {
  const { colors } = useTheme();

  const iconProps = {
    purchase: { name: "shopping-cart", color: colors.accent },
    chat: { name: "chat", color: colors.accent },
  }[type];

  return (
    <MaterialIcons
      name={iconProps.name as any}
      size={24}
      color={iconProps.color}
      style={styles.icon}
    />
  );
};

const NotificationCard = ({
  item,
  colors,
}: {
  item: AppNotification;
  colors: any;
}) => (
  <View
    style={[
      styles.card,
      {
        backgroundColor: colors.card,
        borderColor: colors.border,
      },
    ]}
  >
    <NotificationIcon type={item.type} />
    <View style={styles.messageContainer}>
      <Text style={[styles.message, { color: colors.textPrimary }]}>
        {item.message}
      </Text>
      <Text style={[styles.time, { color: colors.textSecondary }]}>
        {item.time}
      </Text>
    </View>
  </View>
);

export default function NotificationsScreen() {
  const screenId = "notifications";
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [filterType, setFilterType] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { resetUnreadCount } = useNotification();
  const { colors } = useTheme();

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const data = await notificationsApi.getNotifications("all");
      setNotifications(data);
    } catch {
      showAppToast({
        type: "error",
        text1: "Failed to load notifications",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        await fetchNotifications();
        resetUnreadCount();
      };
      loadData();
    }, [fetchNotifications, resetUnreadCount])
  );

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications, filterType]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const handleFilterChange = (type: string) => {
    setFilterType(type);
  };

  const filteredNotifications = useMemo(() => {
    return filterType === "all"
      ? notifications
      : notifications.filter((n) => n.type === filterType);
  }, [filterType, notifications]);

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          header: () => <Header screenId={screenId} />,
        }}
      />

      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.filterOuter}>
          <View
            style={[
              styles.filterContainer,
              {
                backgroundColor: colors.cardMuted,
                borderColor: colors.border,
              },
            ]}
          >
            {["all", "purchase", "chat"].map((type) => (
              <TouchableOpacity
                key={type}
                onPress={() => handleFilterChange(type)}
                style={[
                  styles.filterButton,
                  {
                    backgroundColor: "transparent",
                  },
                  filterType === type && {
                    backgroundColor: colors.background,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: colors.textSecondary },
                    filterType === type && {
                      color: colors.accent,
                      fontWeight: "700",
                    },
                  ]}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : (
          <FlatList
            data={filteredNotifications}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <NotificationCard item={item} colors={colors} />
            )}
            ListEmptyComponent={
              <Text style={[styles.empty, { color: colors.textSecondary }]}>
                No notifications to show.
              </Text>
            }
            contentContainerStyle={styles.listContent}
            scrollIndicatorInsets={{ top: 0, bottom: 0 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[colors.accent]}
                tintColor={colors.accent}
              />
            }
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 28,
    flexGrow: 1,
  },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderWidth: 1,
    borderRadius: 18,
    marginBottom: 10,
  },
  icon: {
    marginRight: 12,
    marginTop: 4,
  },
  messageContainer: {
    flex: 1,
  },
  message: {
    fontSize: 15,
  },
  time: {
    fontSize: 12,
    marginTop: 4,
  },
  empty: {
    textAlign: "center",
    marginTop: 60,
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  filterContainer: {
    flexDirection: "row",
    padding: 4,
    borderWidth: 1,
    borderRadius: 18,
  },
  filterButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  filterText: {
    fontSize: 14,
  },
  filterOuter: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
});
