import { ItemType, ReportMineEntry } from "@/types/types";
import {
  Dimensions,
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import AntDesign from "@expo/vector-icons/AntDesign";
import { router } from "expo-router";
import { useRoute } from "@react-navigation/native";
import { useItemsStore } from "@/stores/listings/use-items-store";
import useSingleItemStore from "@/stores/single-item-store";
import { useState } from "react";

import { useUserStore } from "@/stores/user-store";
import React from "react";
import ReportModal from "./report-modal";
import { MaterialIcons } from "@expo/vector-icons";
import { useLatestItem } from "@/hooks/use-latest-item";
import { useTheme } from "@/app/contexts/theme-context";

type Props = {
  item: ItemType;
  source?: string;
};

function findListingAmongRows(
  rows: readonly (ItemType | ReportMineEntry)[],
  listingId: number
): ItemType | undefined {
  for (const row of rows) {
    if ("item" in row) {
      if (row.item?.id === listingId) return row.item;
      continue;
    }
    const listing = row as ItemType;
    if (listing.id === listingId) return listing;
  }
  return undefined;
}

const width = Dimensions.get("window").width - 40;

const SingleItem = ({ item, source }: Props) => {
  const route = useRoute();
  const { toggleFavorite, toggleReport } = useItemsStore();
  const { showFavoritesIcon, setShowFavoritesIcon } = useSingleItemStore();
  const { userData } = useUserStore();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  // Subscribe to the active screen and get updated items
  const activeScreen = useItemsStore((state) => state.activeScreen);
  const items = useItemsStore((state) => state.screens[activeScreen].items);

  // Get the latest version of this item from the store (reported tab rows wrap ItemType)
  const currentItem =
    findListingAmongRows(items, item.id) ?? item;

  // find the latest version of this item in any screen
  const latestItem = useLatestItem(item.id, item);

  // check if the current user is the owner of this item
  const isOwner = currentItem.seller === userData?.id;

  const [isReportModalVisible, setIsReportModalVisible] = useState(false);
  const handleItemPress = () => {
    if (source === "myItems") {
      setShowFavoritesIcon(false);
    } else {
      setShowFavoritesIcon(true);
    }
    router.push({
      pathname: `/item/[id]`,
      params: { id: item.id.toString(), source },
    });
  };

  const handleFavoriteToggle = async () => {
    await toggleFavorite(item.id);
  };
  // Check if we're already on the item details page
  const isDetailsPage = route.name === "item/[id]";
  return (
    <TouchableOpacity onPress={handleItemPress}>
      <View
        style={[
          styles.container,
          route.name === "ItemDetails" && { width: width },
          // isOwner && styles.myItemContainer,
        ]}
      >
        {isOwner && (
          <View style={styles.ownershipTag}>
            <Text style={styles.ownershipTagText}>Your Item</Text>
          </View>
        )}
        <ReportModal
          isVisible={isReportModalVisible}
          onClose={() => setIsReportModalVisible(false)}
          itemId={currentItem.id}
        />
        <Image
          source={{ uri: currentItem.image }}
          style={[isOwner ? styles.myItemImage : styles.itemImage]}
        />
        {/* sold tag */}
        {currentItem.is_sold && (
          <View style={styles.soldTagContainer}>
            <Text style={styles.soldTagText}>Sold</Text>
          </View>
        )}
        <View style={styles.buttonsContainer}>
          {showFavoritesIcon &&
          !isOwner &&
          route.name !== "additional-info/my-items" ? (
            <>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={async (e) => {
                  e.stopPropagation();
                  if (latestItem.is_reported) {
                    await toggleReport(latestItem.id, "");
                  } else {
                    setIsReportModalVisible(true);
                  }
                }}
              >
                <MaterialIcons
                  testID={
                    latestItem.is_reported ? "flag-icon" : "outlined-flag-icon"
                  }
                  name={latestItem.is_reported ? "flag" : "outlined-flag"}
                  size={24}
                  color={
                    latestItem.is_reported ? colors.accent : colors.textPrimary
                  }
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.favBtn}
                onPress={handleFavoriteToggle}
              >
                <AntDesign
                  testID={
                    latestItem.is_favorited ? "heart-icon" : "hearto-icon"
                  }
                  name={latestItem.is_favorited ? "heart" : "hearto"}
                  size={22}
                  color={
                    latestItem.is_favorited ? colors.accent : colors.textPrimary
                  }
                />
              </TouchableOpacity>
            </>
          ) : null}
        </View>
        {!isDetailsPage && (
          <View style={styles.infoRow}>
            <Text style={styles.price}>${currentItem.price}</Text>
            {currentItem.purchase_request_count !== undefined && (
              <Text style={styles.requestersCount}>
                ({currentItem.purchase_request_count}{" "}
                {currentItem.purchase_request_count === 1
                  ? "request"
                  : "requests"}
                )
              </Text>
            )}
          </View>
        )}
        {!isDetailsPage && (
          <Text style={styles.title}>{currentItem.title}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default React.memo(SingleItem);

const createStyles = (colors: {
  accent: string;
  accentSoft: string;
  accentContrast: string;
  textPrimary: string;
  warning: string;
}) =>
  StyleSheet.create({
  container: {
    width: (width - 10) / 2,
    marginHorizontal: 5,
    position: "relative",
  },
  itemImage: {
    width: "100%",
    height: 200,
    borderRadius: 15,
    marginTop: 10,
    marginBottom: 10,
  },
  myItemImage: {
    width: "100%",
    height: 200,
    borderRadius: 15,
    marginTop: 10,
    marginBottom: 10,
    borderColor: colors.accent,
    borderWidth: 3,
    backgroundColor: colors.accentSoft,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 2,
    elevation: 2,
  },
  buttonsContainer: {
    position: "absolute",
    right: 10,
    top: 20,
    flexDirection: "row",
    gap: 10,
  },
  iconBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    borderWidth: 1,
    borderColor: "rgba(185, 28, 28, 0.12)",
    padding: 5,
    borderRadius: 30,
  },
  favBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    borderWidth: 1,
    borderColor: "rgba(185, 28, 28, 0.12)",
    padding: 5,
    borderRadius: 30,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  price: {
    fontSize: 16,
    fontWeight: "bold",
    color: colors.textPrimary,
  },
  requestersCount: {
    fontSize: 12,
    color: colors.textPrimary,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  soldTagContainer: {
    position: "absolute",
    right: 10,
    top: "10%",
    paddingVertical: 8,
    transform: [{ translateY: -15 }],
  },
  soldTagText: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
    fontSize: 16,
  },
  detailsContainer: {
    paddingHorizontal: 5,
    paddingBottom: 8,
  },
  ownerLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.warning,
    marginTop: 2,
  },
  ownershipTag: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: colors.accent,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    zIndex: 10,
  },
  ownershipTagText: {
    fontSize: 10,
    color: colors.accentContrast,
    fontWeight: "600",
  },
});
