import {
  Dimensions,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  FlatList,
  ScrollView,
} from "react-native";
import { TapGestureHandler } from "react-native-gesture-handler";

import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import Entypo from "@expo/vector-icons/Entypo";
import { FontAwesome } from "@expo/vector-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import ItemPurchaseModal from "@/components/item-purchase-modal";
import { useUserStore } from "@/stores/user-store";
import React from "react";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import ZoomModal from "@/components/zoom-modal";
import { useItemsStore } from "@/stores/listings/use-items-store";
import ReportModal from "@/components/report-modal";
import { showAppToast } from "@/utils/app-toast";
import { listingsApi } from "@/services/listings-api";
import { getErrorMessage } from "@/utils/error-utils";
import { useTheme } from "../contexts/theme-context";

const { width, height } = Dimensions.get("window");

const ItemDetails = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const { id, item: itemString, source } = useLocalSearchParams();
  const [item, setItem] = useState(() => {
    if (!itemString) return null;
    try {
      return JSON.parse(itemString as string);
    } catch {
      return null;
    }
  });
  const hasFetched = useRef(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isReportModalVisible, setIsReportModalVisible] = useState(false);
  const [hasRequestedItem, setHasRequestedItem] = useState(false);
  const [hasReportedItem, setHasReportedItem] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [isZoomVisible, setIsZoomVisible] = useState(false);
  const { userData } = useUserStore();
  const { toggleReport } = useItemsStore();

  // image carousel stuff
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    return () => {
      setIsLoading(false);
      setItem(null);
      setIsVisible(false);
    };
  }, []);

  // useCallback will memoize the function and return the same instance across renders unless item has changed
  const getItemImages = useCallback(() => {
    if (!item) return [];

    const primary = item.image ? [item.image] : [];

    const additional =
      item.additional_images && Array.isArray(item.additional_images)
        ? item.additional_images.map((img: any) => img.image)
        : [];
    return [...primary, ...additional];
  }, [item]);

  // ensure that the images array is only recalculated if the getItemImages function changes(which only happens when item changes)
  const images = React.useMemo(() => getItemImages(), [getItemImages]);
  const selectedImageUri = images[currentImageIndex] ?? item?.image ?? null;

  useEffect(() => {
    if (currentImageIndex >= images.length) {
      setCurrentImageIndex(0);
    }
  }, [currentImageIndex, images.length]);

  // fetch the latest item data from the API
  const fetchItemDetails = useCallback(async () => {
    if (!id) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      const response = await listingsApi.getItem(id as string);
      const fetchedItem = response.data;
      setItem(fetchedItem);
      if (
        fetchedItem.purchase_requesters &&
        userData &&
        fetchedItem.purchase_requesters.some(
          (requester: { id: number }) => requester.id === userData.id
        )
      ) {
        setHasRequestedItem(true);
      } else {
        setHasRequestedItem(false);
      }

      setHasReportedItem(fetchedItem.is_reported || false);
    } catch (error) {
      console.error("Error fetching item details:", error);
      Alert.alert(
        "Error",
        "Unable to load item details. Please try again later."
      );
    } finally {
      setIsLoading(false);
    }
  }, [id, userData]);

  useFocusEffect(
    React.useCallback(() => {
      if (!hasFetched.current) {
        fetchItemDetails();
        hasFetched.current = true;
      }

      return () => {
        // reset the ref when the screen loses focus
        hasFetched.current = false;
      };
    }, [fetchItemDetails])
  );

  const openModal = () => {
    setIsVisible(true);
  };

  const closeModal = () => {
    setIsVisible(false);
  };

  const handleDelete = async () => {
    if (!id) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      await listingsApi.deleteListing(id as string);
      showAppToast({
        type: "success",
        text1: "Item deleted successfully",
      });
      router.replace("/(tabs)");
    } catch {
      showAppToast({
        type: "error",
        text1: "Unable to delete item. Please try again",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchaseRequest = React.useCallback(async () => {
    if (!item) return;
    try {
      await listingsApi.requestPurchase(item.id);
      setHasRequestedItem(true);
      openModal();
    } catch (error) {
      console.error("Error requesting purchase:", error);
      alert("Failed to send purchase request. Please try again.");
    }
  }, [item]);

  // Find out if the user is the owner of the item
  const isOwner = userData && item && item.seller === userData.id;

  // function to handle image scroll
  const handleScroll = (event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = Math.floor(event.nativeEvent.contentOffset.x / slideSize);
    if (index !== currentImageIndex) {
      setCurrentImageIndex(index);
    }
  };

  // render each image in the carousel
  const renderImageItem = ({ item: imageUrl }: { item: string }) => {
    return (
      <View style={styles.imageSlide}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.itemImage}
          resizeMode="contain"
        />
      </View>
    );
  };

  // Render pagination dots
  const renderPaginationDots = () => {
    if (images.length <= 1) {
      return null;
    }

    return (
      <View style={styles.paginationContainer}>
        {images.map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              currentImageIndex === index && styles.paginationDotActive,
            ]}
          />
        ))}
      </View>
    );
  };

  const startChat = async () => {
    if (!item || !userData) return;

    setChatLoading(true);

    try {
      const response = await listingsApi.resolveChatRoom(item.seller, item.id);
      const chatRoom = response.data.room;
      if (!chatRoom || !chatRoom.id) {
        throw new Error("Invalid room data received");
      }
      // Navigate to the chat room
      router.push({
        pathname: `/chat/[id]`,
        params: {
          id: chatRoom.id.toString(),
          user_id: userData?.id,
          username: item.seller_name, // CAUTION: variable names are a bit weird here
          receiver_id: item.seller.toString(),
          itemTitle: item.title || "No item",
          item_id: item.id.toString(),
        }, // Assuming item.seller_name is the seller's name
      });
    } catch (error) {
      console.error("Error starting chat:", error);
      Alert.alert("Error", getErrorMessage(error));
    } finally {
      setChatLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (isLoading || !item) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator
          testID="activity-indicator"
          size="large"
          color={colors.accent}
        />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: item.title,
          headerTitleAlign: "center",
          headerShown: true,
          headerBackTitle: "Back",
        }}
      />
      <SafeAreaView
        style={styles.container}
        edges={["left", "right", "bottom"]}
      >
        <ReportModal
          isVisible={isReportModalVisible}
          onClose={() => {
            setIsReportModalVisible(false);
            setHasReportedItem(true);
          }}
          itemId={item.id}
        />
        <ItemPurchaseModal
          isVisible={isVisible}
          onClose={closeModal}
          email={item.seller_name}
        />
        {isZoomVisible && (
          <ZoomModal
            isVisible={isZoomVisible}
            onClose={() => setIsZoomVisible(false)}
            imageUri={selectedImageUri}
          />
        )}
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          <TapGestureHandler
            numberOfTaps={1}
            onActivated={() => setIsZoomVisible(true)}
          >
            <View style={styles.carouselContainer}>
              <FlatList
                ref={flatListRef}
                data={
                  images.length > 0
                    ? images
                    : ["src/frontend/assets/images/defaultpic.png"]
                }
                renderItem={renderImageItem}
                keyExtractor={(_, index) => index.toString()}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
              />

              {renderPaginationDots()}

              {/* image counter overlay */}
              <View style={styles.imageCounterContainer}>
                <Text style={styles.imageCounter}>
                  {currentImageIndex + 1} of {images.length || 1}
                </Text>
              </View>
            </View>
          </TapGestureHandler>

          {/* Item details section */}
          <View style={styles.detailsContainer}>
            <View style={styles.headerRow}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.price}>${item.price}</Text>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <FontAwesome
                  name="user"
                  size={16}
                  color={colors.textSecondary}
                  style={styles.infoIcon}
                />
                <Text style={styles.infoText}>{item.seller_name}</Text>
              </View>
              <View style={styles.infoItem}>
                <FontAwesome
                  name="calendar"
                  size={16}
                  color={colors.textSecondary}
                  style={styles.infoIcon}
                />
                <Text style={styles.infoText}>
                  {formatDate(item.created_at)}
                </Text>
              </View>
            </View>

            <View style={styles.categoryContainer}>
              <FontAwesome
                name="tag"
                size={16}
                color={colors.textSecondary}
                style={styles.infoIcon}
              />
              <Text style={styles.categoryText}>{item.category_name}</Text>
            </View>

            <View style={styles.descriptionContainer}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.descriptionText}>{item.description}</Text>
            </View>

            {/* Action buttons */}
            <View style={styles.actionsContainer}>
              {isOwner ? (
                <>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => {
                      router.push({
                        pathname: "/item/[id]/edit",
                        params: {
                          id: item.id.toString(),
                          item: JSON.stringify(item),
                        },
                      });
                    }}
                  >
                    <FontAwesome
                      name="edit"
                      size={18}
                      color="white"
                      style={styles.buttonIcon}
                    />
                    <Text style={styles.buttonText}>Edit Listing</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={handleDelete}
                  >
                    <FontAwesome
                      name="trash"
                      size={18}
                      color="white"
                      style={styles.buttonIcon}
                    />
                    <Text style={styles.buttonText}>Delete Item</Text>
                  </TouchableOpacity>
                </>
              ) : (
                source !== "myItems" && (
                  <>
                    <TouchableOpacity
                      style={[
                        styles.purchaseRequestButton,
                        hasRequestedItem && styles.disabledButton,
                      ]}
                      onPress={() => handlePurchaseRequest()}
                      disabled={hasRequestedItem}
                    >
                      <FontAwesome
                        name={hasRequestedItem ? "check" : "shopping-cart"}
                        size={18}
                        color="white"
                        style={styles.buttonIcon}
                      />
                      <Text style={styles.buttonText}>
                        {hasRequestedItem
                          ? "Purchase Requested"
                          : "Request Purchase"}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.chatButton}
                      onPress={startChat}
                      disabled={chatLoading}
                    >
                      {chatLoading ? (
                        <ActivityIndicator
                          testID="activity-indicator"
                          size="small"
                          color="white"
                        />
                      ) : (
                        <>
                          <Entypo
                            name="chat"
                            size={20}
                            color="white"
                            style={styles.buttonIcon}
                          />
                          <Text style={styles.buttonText}>Message Seller</Text>
                        </>
                      )}
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.reportItemButton,
                        hasReportedItem && styles.disabledButton,
                      ]}
                      onPress={async (e) => {
                        e.stopPropagation();
                        try {
                          if (!hasReportedItem) {
                            setIsReportModalVisible(true);
                          } else {
                            await toggleReport(item.id, "");
                            setHasReportedItem(false);
                          }
                        } catch (error) {
                          console.error("Error toggling report:", error);
                          Alert.alert(
                            "Error",
                            "Failed to report item. Please try again"
                          );
                        }
                      }}
                      disabled={hasReportedItem}
                    >
                      <FontAwesome
                        name="flag"
                        size={18}
                        color="white"
                        style={styles.buttonIcon}
                      />
                      <Text style={styles.buttonText}>
                        {hasReportedItem ? "Item Reported" : "Report Item"}
                      </Text>
                    </TouchableOpacity>
                  </>
                )
              )}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
};

export default ItemDetails;

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
  disabled: string;
}) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  carouselContainer: {
    width: width,
    height: height * 0.4,
    position: "relative",
    backgroundColor: colors.cardMuted,
  },
  imageSlide: {
    width: width,
    height: "100%",
    backgroundColor: colors.cardMuted,
  },
  itemImage: {
    width: "100%",
    height: "100%",
  },
  paginationContainer: {
    position: "absolute",
    bottom: 20,
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
    backgroundColor: "rgba(255, 255, 255, 0.55)",
  },
  paginationDotActive: {
    backgroundColor: "#FFFFFF",
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  imageCounterContainer: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  imageCounter: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  detailsContainer: {
    padding: 20,
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: 0,
    flex: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 10,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  itemTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
    flex: 1,
  },
  price: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.accent,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 20,
  },
  infoIcon: {
    marginRight: 6,
  },
  infoText: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  categoryContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginBottom: 24,
  },
  categoryText: {
    fontSize: 14,
    color: colors.accent,
    fontWeight: "600",
    marginLeft: 6,
  },
  descriptionContainer: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  actionsContainer: {
    gap: 12,
  },
  editButton: {
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  deleteButton: {
    backgroundColor: colors.accentMuted,
    paddingVertical: 14,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  purchaseRequestButton: {
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reportItemButton: {
    backgroundColor: colors.accentMuted,
    paddingVertical: 14,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledButton: {
    backgroundColor: colors.disabled,
  },
  chatButton: {
    backgroundColor: colors.success,
    paddingVertical: 14,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: colors.accentContrast,
    fontSize: 16,
    fontWeight: "600",
  },
  buttonIcon: {
    marginRight: 8,
  },
});
