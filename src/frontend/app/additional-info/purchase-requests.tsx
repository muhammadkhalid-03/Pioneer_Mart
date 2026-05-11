/**
 * purchase-requests.tsx
 *
 * This screen displays all active purchase requests for a user, separated into two tabs:
 *  - Sent Requests: Items the user has requested to purchase
 *  - Received Requests: Requests received for items the user is selling
 *
 * Functionality:
 * - Fetches and filters active purchase requests from the backend API.
 * - Allows users to cancel their sent requests.
 * - Uses FlatList with pull-to-refresh functionality.
 * - Dynamically renders content based on tab selection and request availability.
 *
 * Features:
 * - Modern tab interface with animation
 * - Header navigation with back button using Expo Router
 * - Elevated card design for request items
 * - Responsive design and improved empty state handling
 *
 * Dependencies:
 * - React Navigation (Expo Router)
 * - Axios for HTTP requests
 * - Zustand/Context for auth state
 * - React Native FlatList & RefreshControl
 * - Custom components: SingleItem
 *
 * Author: Joyce Gill
 * Date: April 2025
 */

import { PurchaseRequest } from "@/types/types";
import { Ionicons } from "@expo/vector-icons";
import { Stack, router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Alert,
  Animated,
  Platform,
  Image,
} from "react-native";
import React from "react";
import api from "@/types/api";
import { getErrorMessage } from "@/utils/error-utils";
import { useTheme } from "../contexts/theme-context";

const PurchaseRequests = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [activeTab, setActiveTab] = useState("sent");
  const tabPosition = useRef(new Animated.Value(0));
  const [sentRequests, setSentRequests] = useState<PurchaseRequest[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<PurchaseRequest[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const activeRequests = activeTab === "sent" ? sentRequests : receivedRequests;

  const fetchRequests = useCallback(async () => {
    try {
      setIsLoading(true);
      const [sentResponse, receivedResponse] = await Promise.all([
        api.get("/api/v1/purchase-requests/sent/"),
        api.get("/api/v1/purchase-requests/received/"),
      ]);
      setSentRequests(sentResponse.data);
      setReceivedRequests(receivedResponse.data);
    } catch (error) {
      console.error("Error fetching purchase requests:", error);
      Alert.alert("Error", getErrorMessage(error), [{ text: "OK" }]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Animate tab indicator when tab changes
  useEffect(() => {
    Animated.spring(tabPosition.current, {
      toValue: activeTab === "sent" ? 0 : 1,
      useNativeDriver: false,
      friction: 8,
      tension: 70,
    }).start();
  }, [activeTab]);

  /**
   * @function onRefresh
   * @description Handles the refresh action of the FlatList by setting the `refreshing` state to true and calling `fetchRequests`.
   */
  const onRefresh = () => {
    setRefreshing(true);
    fetchRequests();
  };

  /**
   * @function acceptRequest
   * @async
   * @param {number} requestId - The ID of the purchase request to accept.
   * @description Sends a request to the backend API to accept a specific purchase request.
   * Upon successful acceptance, it updates the local `receivedRequests` state.
   */
  const acceptRequest = async (requestId: number) => {
    try {
      await api.post(`/api/v1/purchase-requests/${requestId}/accept/`, {});
      // update all requests related to this listing
      fetchRequests(); // we need to re-fetch everything since multiple listings might be affected?
      Alert.alert("Success", "Purchase request accepted successfully", [
        { text: "OK" },
      ]);
    } catch (error) {
      console.error("Error accepting request:", error);
      Alert.alert("Error", getErrorMessage(error), [{ text: "OK" }]);
    }
  };

  /**
   * @function declineRequest
   * @async
   * @param {number} requestId - The ID of the purchase request to decline.
   * @description Sends a request to the backend API to decline a specific purchase request.
   * Upon successful decline, it updates the local `receivedRequests` state.
   */
  const declineRequest = async (requestId: number) => {
    try {
      await api.post(`/api/v1/purchase-requests/${requestId}/decline/`, {});

      // update the local state with the new status
      setReceivedRequests((prevRequests) =>
        prevRequests.map((request) =>
          request.id === requestId
            ? { ...request, status: "declined" }
            : request,
        ),
      );
      Alert.alert("Success", "Purchase request declined successfully", [
        { text: "OK" },
      ]);
    } catch (error) {
      console.error("Error declining request:", error);
      Alert.alert("Error", getErrorMessage(error), [{ text: "OK" }]);
    }
  };

  /**
   * @function removeRequest
   * @async
   * @param {number} requestId - The ID of the purchase request to remove.
   * @description Sends a request to the backend API to remove a specific purchase request.
   * Upon successful removal, it updates the local state to remove the item from the view.
   */
  const removeRequest = async (requestId: number) => {
    Alert.alert(
      "Remove Request",
      "Are you sure you want to delete this request? This will also cancel the request.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete(
                `/api/v1/purchase-requests/${requestId}/remove/`,
              );

              //remove the request from the appropriate list
              if (activeTab === "sent") {
                setSentRequests((prevRequests) =>
                  prevRequests.filter((request) => request.id !== requestId),
                );
              } else {
                setReceivedRequests((prevRequests) =>
                  prevRequests.filter((request) => request.id !== requestId),
                );
              }
              Alert.alert("Success", "Request cancelled & deleted", [
                { text: "OK" },
              ]);
            } catch (error) {
              console.error("Error removing request:", error);
              Alert.alert("Error", getErrorMessage(error), [{ text: "OK" }]);
            }
          },
        },
      ],
    );
  };

  /**
   * @function getStatusColor
   * @param {string} status - The status of the purchase request.
   * @returns {string} - The color code corresponding to the status.
   * @description Returns a color code based on the status of the purchase request.
   */
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return colors.warning;
      case "accepted":
        return colors.success;
      case "declined":
        return colors.accent;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusTone = (status: string) => {
    switch (status) {
      case "pending":
        return "rgba(194, 122, 26, 0.12)";
      case "accepted":
        return "rgba(47, 133, 90, 0.12)";
      case "declined":
        return "rgba(212, 79, 79, 0.12)";
      default:
        return colors.cardMuted;
    }
  };

  /**
   * @function renderRequestItem
   * @param {object} { item } - An object containing the `PurchaseRequest` item to render.
   * @returns {JSX.Element} - A View component representing a single purchase request item in the list.
   * @description Renders a single purchase request item, displaying the associated listing details,
   * the request date, and the status. For sent pending requests, it also includes a "Cancel" button.
   * For received pending requests, it includes "Accept" and "Decline" buttons.
   * All requests include a "Remove" button to remove the request from the user's view.
   */
  const renderRequestItem = ({ item }: { item: PurchaseRequest }) => {
    const formattedDate = new Date(item.created_at).toLocaleDateString(
      "en-US",
      {
        year: "numeric",
        month: "short",
        day: "numeric",
      },
    );
    const statusColor = getStatusColor(item.status);
    const counterpartName =
      activeTab === "sent" ? item.seller_name : item.requester_name;
    const priceValue = Number(item.listing.price);
    const formattedPrice = Number.isFinite(priceValue)
      ? priceValue.toFixed(2)
      : String(item.listing.price ?? "");
    const statusTone = getStatusTone(item.status);

    return (
      <View style={styles.requestItem}>
        <View style={styles.requestContentRow}>
          <TouchableOpacity
            style={styles.imageColumn}
            onPress={() =>
              router.push({
                pathname: "/item/[id]",
                params: {
                  id: item.listing.id.toString(),
                  source: "purchaseRequests",
                },
              })
            }
          >
            {activeTab === "received" && (
              <View style={styles.ownershipTag}>
                <Text style={styles.ownershipTagText}>Your Item</Text>
              </View>
            )}
            <Image
              source={{ uri: item.listing.image }}
              style={styles.itemImage}
            />
          </TouchableOpacity>

          <View style={styles.requestInfo}>
            <View style={styles.headerRow}>
              <Text style={styles.title} numberOfLines={1}>
                {item.listing.title}
              </Text>
              <TouchableOpacity
                style={styles.cardDeleteButton}
                onPress={(e) => {
                  e.stopPropagation();
                  removeRequest(item.id);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name="trash-outline"
                  size={16}
                  color={colors.accentMuted}
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.price}>${formattedPrice}</Text>

            <Text style={styles.metaValue} numberOfLines={1}>
              {counterpartName}
            </Text>

            <View style={styles.cardFooter}>
              <Text style={styles.requestDate}>{formattedDate}</Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: statusTone },
                ]}
              >
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                </Text>
              </View>
            </View>

            {item.status === "pending" && activeTab === "received" && (
              <View style={styles.actionButtonsContainer}>
                <TouchableOpacity
                  style={styles.acceptButton}
                  onPress={() => acceptRequest(item.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.acceptButtonText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.declineButton}
                  onPress={() => declineRequest(item.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.declineButtonText}>Decline</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  // Calculate the position for the animated tab indicator
  const indicatorLeft = tabPosition.current.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "50%"],
  });

  return (
    <>
      {/* Stack Screen configuration for the header */}
      <Stack.Screen
        options={{
          headerTitle: "Purchase Requests",
          headerTitleAlign: "center",
          headerShown: true,
          headerBackTitle: "Back",
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.textPrimary,
          headerShadowVisible: false,
        }}
      />
      {/* Main container for the component */}
      <View style={styles.container}>
        {/* Tabs for switching between sent and received requests */}
        <View style={styles.tabsOuterContainer}>
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={styles.tab}
              onPress={() => setActiveTab("sent")}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: colors.textSecondary },
                  activeTab === "sent" && styles.activeTabText,
                ]}
              >
                Sent Requests ({sentRequests.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.tab}
              onPress={() => setActiveTab("received")}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: colors.textSecondary },
                  activeTab === "received" && styles.activeTabText,
                ]}
              >
                Received Requests ({receivedRequests.length})
              </Text>
            </TouchableOpacity>
            <Animated.View
              style={[
                styles.tabIndicator,
                {
                  backgroundColor: colors.background,
                  left: indicatorLeft,
                },
              ]}
            />
          </View>
        </View>
        {/* Conditional rendering based on loading state */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="large"
              color={colors.accent}
              testID="activity-indicator"
            />
          </View>
        ) : (
          /* FlatList to display the list of purchase requests */
          <FlatList
            data={activeRequests}
            renderItem={renderRequestItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.listContent}
            refreshControl={
              /* Refresh control for pull-to-refresh functionality */
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[colors.accent]}
                tintColor={colors.accent}
              />
            }
            /* Component to display when the list is empty */
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons
                  name="document-text-outline"
                  size={64}
                  color={colors.border}
                />
                <Text style={styles.emptyTitle}>
                  No {activeTab === "sent" ? "Sent" : "Received"} Requests
                </Text>
                <Text style={styles.emptyText}>
                  {activeTab === "sent"
                    ? "You haven't requested to purchase any items yet."
                    : "You don't have any purchase requests for your items."}
                </Text>
              </View>
            }
          />
        )}
      </View>
    </>
  );
};

export default PurchaseRequests;

/**
 * @constant styles
 * @description StyleSheet for the PurchaseRequests component.
 */
const createStyles = (colors: {
  background: string;
  card: string;
  cardMuted: string;
  accent: string;
  accentMuted: string;
  accentSoft: string;
  accentContrast: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  success: string;
  successSoft: string;
  warning: string;
}) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    tabsOuterContainer: {
      marginHorizontal: 16,
      marginTop: 16,
      marginBottom: 10,
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.04,
          shadowRadius: 6,
        },
        android: {
          elevation: 1,
        },
      }),
    },
    tabsContainer: {
      flexDirection: "row",
      padding: 4,
      borderRadius: 18,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      position: "relative",
      height: 52,
    },
    tab: {
      flex: 1,
      paddingVertical: 12,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 1,
    },
    tabIndicator: {
      position: "absolute",
      width: "50%",
      height: "100%",
      borderRadius: 14,
      zIndex: 0,
      top: 4,
      bottom: 4,
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.05,
          shadowRadius: 2,
        },
        android: {
          elevation: 1,
        },
      }),
    },
    tabText: {
      fontWeight: "600",
      fontSize: 14,
    },
    activeTabText: {
      color: colors.accent,
      fontWeight: "700",
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    listContent: {
      padding: 16,
      paddingBottom: 36,
    },
    requestItem: {
      backgroundColor: colors.card,
      borderRadius: 16,
      marginBottom: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      ...Platform.select({
        ios: {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 6,
        },
        android: {
          elevation: 2,
        },
      }),
    },
    requestContentRow: {
      flexDirection: "row",
      gap: 12,
    },
    imageColumn: {
      width: 90,
      position: "relative",
    },
    itemImage: {
      width: 90,
      height: 90,
      borderRadius: 12,
      backgroundColor: colors.cardMuted,
    },
    ownershipTag: {
      position: "absolute",
      top: 6,
      left: 6,
      backgroundColor: colors.accent,
      paddingVertical: 2,
      paddingHorizontal: 6,
      borderRadius: 6,
      zIndex: 1,
    },
    ownershipTagText: {
      color: colors.accentContrast,
      fontSize: 10,
      fontWeight: "700",
    },
    requestInfo: {
      flex: 1,
      justifyContent: "center",
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      marginBottom: 2,
    },
    title: {
      fontSize: 16,
      fontWeight: "700",
      color: colors.textPrimary,
      flex: 1,
    },
    price: {
      fontSize: 15,
      fontWeight: "600",
      color: colors.textSecondary,
      marginBottom: 2,
    },
    metaValue: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 6,
    },
    cardFooter: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    requestDate: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    statusBadge: {
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 10,
    },
    statusText: {
      fontWeight: "700",
      fontSize: 11,
    },
    actionButtonsContainer: {
      flexDirection: "row",
      gap: 8,
      marginTop: 10,
    },
    acceptButton: {
      flex: 1,
      backgroundColor: colors.success,
      paddingVertical: 10,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    acceptButtonText: {
      color: "#FFFFFF",
      fontWeight: "600",
      fontSize: 14,
    },
    declineButton: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    cardDeleteButton: {
      padding: 4,
    },
    declineButtonText: {
      color: colors.textSecondary,
      fontWeight: "600",
      fontSize: 14,
    },
    emptyContainer: {
      padding: 30,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 70,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.textPrimary,
      marginTop: 16,
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 22,
    },
  });
