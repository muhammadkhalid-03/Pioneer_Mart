import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { useAuth } from "../contexts/auth-context";
import { useItemsStore } from "@/stores/listings/use-items-store";
import Header from "@/components/header";
import Categories from "@/components/categories";
import ProductList from "@/components/product-list";
import { View } from "react-native";
import { useTheme } from "../contexts/theme-context";

const HomeScreen = () => {
  const {
    screens,
    setActiveScreen,
    loadItems,
    loadCategories,
    categories,
  } = useItemsStore();

  const screenId = "home";
  const { items, isLoading } = screens[screenId];
  const { colors } = useTheme();
  const { authToken } = useAuth();
  useEffect(() => {
    setActiveScreen(screenId);
    loadItems(screenId);
    loadCategories();
  }, [authToken, loadCategories, loadItems, setActiveScreen]);
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
          source={"home"}
        />
      </View>
    </>
  );
};

export default HomeScreen;
