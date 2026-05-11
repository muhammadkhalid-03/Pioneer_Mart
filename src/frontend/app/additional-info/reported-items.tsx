import React, { useEffect } from "react";

import { router, Stack } from "expo-router";

import { useItemsStore } from "@/stores/listings/use-items-store";
import ProductList from "@/components/product-list";
import Header from "@/components/header";
import Categories from "@/components/categories";
import {
  TouchableOpacity,
  StyleSheet,
  View,
  ActivityIndicator,
} from "react-native";
import { Entypo } from "@expo/vector-icons";
import { useTheme } from "../contexts/theme-context";

const ReportedItemsScreen = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { screens, setActiveScreen, loadItems, loadCategories, categories } =
    useItemsStore();

  const screenId = "reported";
  const { items, isLoading } = screens[screenId];

  useEffect(() => {
    setActiveScreen(screenId);
    loadItems(screenId);
    loadCategories();
  }, [loadCategories, loadItems, setActiveScreen]);

  const reportedItems =
    screenId === "reported"
      ? items
          .filter((report: any) => report.item) // only keep reports with items
          .map((report: any) => report.item)
      : items;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerLeft: () => (
            <TouchableOpacity
              style={{ padding: 8 }}
              onPress={() => router.back()}
            >
              <Entypo
                name="chevron-left"
                size={24}
                color={colors.textPrimary}
              />
            </TouchableOpacity>
          ),
          header: () => <Header screenId={screenId} />,
        }}
      />
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={colors.accent}
            testID="loading-indicator"
          />
        </View>
      ) : (
        <>
          <View style={{ flex: 1, backgroundColor: colors.background }}>
            <Categories screenId={screenId} categories={categories} />
            <ProductList
              items={reportedItems}
              isLoading={isLoading}
              source="myItems"
            />
          </View>
        </>
      )}
    </>
  );
};
export default ReportedItemsScreen;
const createStyles = (colors: {
  background: string;
}) =>
  StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
});
