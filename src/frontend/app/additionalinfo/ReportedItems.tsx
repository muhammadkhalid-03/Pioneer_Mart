import React, { useEffect } from "react";

import { router, Stack } from "expo-router";

import { useAuth } from "../contexts/AuthContext";
import { useItemsStore } from "@/stores/useSearchStore";
import ProductList from "@/components/ProductList";
import Header from "@/components/Header";
import Categories from "@/components/Categories";
import {
  TouchableOpacity,
  StyleSheet,
  View,
  ActivityIndicator,
} from "react-native";
import { Entypo } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";

const ReportedItemsScreen = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { authToken } = useAuth();
  const { screens, setActiveScreen, loadItems, loadCategories, categories } =
    useItemsStore();

  const screenId = "reported"; // current screen state
  const { filteredItems, isLoading } = screens[screenId];

  useEffect(() => {
    setActiveScreen(screenId);
    loadItems(screenId, authToken || "");
    loadCategories(authToken || "");
  }, [authToken]);

  const reportedItems =
    screenId === "reported"
      ? filteredItems
          .filter((report: any) => report.item) // only keep reports with items
          .map((report: any) => report.item)
      : filteredItems;

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: "Reported Items",
          headerTitleAlign: "center",
          headerShown: true,
          headerBackTitle: "Back",
          // headerTintColor: colors.accent,
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
const createStyles = (colors: any) =>
  StyleSheet.create({
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.background,
    },
  });
