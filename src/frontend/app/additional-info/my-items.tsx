import Categories from "@/components/categories";
import Header from "@/components/header";
import ProductList from "@/components/product-list";
import { router, Stack } from "expo-router";
import { useEffect } from "react";
import {
  ActivityIndicator,
  TouchableOpacity,
  View,
  StyleSheet,
} from "react-native";
import { useItemsStore } from "@/stores/listings/use-items-store";
import { Entypo } from "@expo/vector-icons";
import React from "react";
import { useTheme } from "../contexts/theme-context";

const MyItems = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { screens, setActiveScreen, loadItems, loadCategories, categories } =
    useItemsStore();

  const screenId = "myItems";
  const { items, isLoading } = screens[screenId];

  useEffect(() => {
    setActiveScreen(screenId);
    loadItems(screenId);
    loadCategories();
  }, [loadCategories, loadItems, setActiveScreen]);

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
              items={items}
              isLoading={isLoading}
              source="myItems"
            />
          </View>
        </>
      )}
    </>
  );
};

export default MyItems;

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
