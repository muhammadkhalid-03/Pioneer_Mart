import React, { useCallback, useMemo, useState } from "react";

import { Stack } from "expo-router";

import { useItemsStore } from "@/stores/listings/use-items-store";
import ProductList from "@/components/product-list";
import Header from "@/components/header";
import Categories from "@/components/categories";
import { Alert, StyleSheet, TouchableOpacity, View, Text } from "react-native";
import { useUserStore } from "@/stores/user-store";
import { useFocusEffect } from "@react-navigation/native";
import { listingsApi } from "@/services/listings-api";
import { useTheme } from "../contexts/theme-context";
import { listingFromRow } from "@/stores/listings/row-helpers";
import type { ItemType } from "@/types/types";

const FavoritesScreen = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { screens, setActiveScreen, loadItems, loadCategories, categories } =
    useItemsStore();

  const screenId = "favorites";
  const { items, isLoading } = screens[screenId];
  const [isRequesting, setIsRequesting] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);
  const { userData } = useUserStore();

  const notRequestedItems = useMemo(() => {
    return items
      .map(listingFromRow)
      .filter((item): item is ItemType => Boolean(item))
      .filter((item) =>
        !item.purchase_requesters?.some(
          (requester: any) => requester.id === userData?.id
        )
      );
  }, [items, userData]);

  useFocusEffect(
    useCallback(() => {
      setActiveScreen(screenId);
      loadItems(screenId);
      loadCategories();
    }, [loadCategories, loadItems, setActiveScreen])
  );

  const handleRequestAllItems = async () => {
    if (notRequestedItems.length < 1) return;
    setIsRequesting(true);
    let successCount = 0;
    let failCount = 0;
    try {
      for (const item of notRequestedItems) {
        try {
          await listingsApi.requestPurchase(item.id);
          successCount++;
        } catch (error) {
          console.error(
            `Error requesting purchase for item ${item.id}:`,
            error
          );
          failCount++;
        }
      }
      setRequestSuccess(true);
      setTimeout(() => setRequestSuccess(false), 3000);
    } catch (error) {
      console.error("Error in batch request process:", error);
    } finally {
      setIsRequesting(false);
      await loadItems(screenId);
      if (failCount > 0) {
        Alert.alert(
          "Error:",
          `Requested ${successCount} items successfully. ${failCount} items failed.`
        );
      } else if (successCount > 0) {
        Alert.alert(`${successCount} items were requested successfully!`);
      }
    }
  };
  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          header: () => <Header screenId={screenId} />,
        }}
      />
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <Categories screenId={screenId} categories={categories} />
        <ProductList
          items={items}
          isLoading={isLoading}
          source={"favorites"}
        />
        {notRequestedItems.length > 0 && (
          <View style={styles.floatingButtonContainer}>
            {requestSuccess && (
              <View style={styles.successMessageContainer}>
                <Text style={styles.successMessage}>
                  Request sent successfully!
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.floatingButton,
                { backgroundColor: colors.accent },
                isRequesting && styles.floatingButtonDisabled,
              ]}
              onPress={handleRequestAllItems}
              disabled={isRequesting}
            >
              <Text style={styles.floatingButtonText}>
                {isRequesting ? "Requesting..." : "Request All"}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </>
  );
};
export default FavoritesScreen;

const createStyles = (colors: {
  accent: string;
  accentContrast: string;
  disabled: string;
  success: string;
}) =>
  StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
  floatingButtonContainer: {
    position: "absolute",
    right: 20,
    bottom: 30,
    alignItems: "flex-end",
  },
  floatingButton: {
    backgroundColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25, // More rounded corners
    elevation: 5, // Android shadow
    shadowColor: "#000", // iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  floatingButtonDisabled: {
    backgroundColor: colors.disabled,
  },
  floatingButtonText: {
    color: colors.accentContrast,
    fontWeight: "600",
    fontSize: 14,
  },
  successMessageContainer: {
    backgroundColor: colors.success,
    padding: 8,
    borderRadius: 15,
    marginBottom: 10,
  },
  successMessage: {
    color: colors.accentContrast,
    fontWeight: "500",
    fontSize: 12,
  },
});
