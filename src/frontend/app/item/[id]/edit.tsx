import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  FlatList,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import React from "react";
import { MaterialIcons } from "@expo/vector-icons";
import CameraModal from "@/components/camera-modal";
import { SafeAreaView } from "react-native-safe-area-context";
import { useItemsStore } from "@/stores/listings/use-items-store";
import { listingsApi } from "@/services/listings-api";
import { messageFromApiError, getErrorMessage } from "@/utils/error-utils";
import {
  appendImageToFormData,
  createCapturedImage,
  createExistingImage,
  createPickedImage,
  isExistingImage,
  type UploadableImage,
} from "@/utils/image-upload";
import { useTheme } from "@/app/contexts/theme-context";

const EditItem = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { item: itemString } = useLocalSearchParams();
  let originalItem: any = null;
  try {
    originalItem = itemString ? JSON.parse(itemString as string) : null;
  } catch {
    originalItem = null;
  }

  const [title, setTitle] = useState(originalItem.title);
  const [description, setDescription] = useState(
    originalItem.description || "",
  );
  const [price, setPrice] = useState(originalItem.price.toString());
  const [selectedCategory, setSelectedCategory] = useState<string>(
    originalItem.category_name,
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [images, setImages] = useState<UploadableImage[]>([]);
  const [modifiedImages, setModifiedImages] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [loading, setLoading] = useState(false);
  const { categories } = useItemsStore();

  useEffect(() => {
    const imageArray: UploadableImage[] = [];
    if (originalItem.image) {
      imageArray.push(createExistingImage(originalItem.image));
    }
    // add additional iamges if they exist
    if (
      originalItem.additional_images &&
      Array.isArray(originalItem.additional_images)
    ) {
      const additionalUrls = originalItem.additional_images.map(
        (img: any) => createExistingImage(img.image),
      );
      imageArray.push(...additionalUrls);
    }
    setImages(imageArray);
  }, [originalItem.additional_images, originalItem.image]);

  const pickImage = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.status !== "granted") {
      if (!permissionResult.canAskAgain) {
        Alert.alert(
          "Permission required",
          "You've previously denied access to your photo library. Please enable it from your phone's settings to continue.",
        );
      } else {
        Alert.alert(
          "Permission needed",
          "Please allow access to your photo library",
        );
      }
      return;
    }
    // The thing for picking images, we can crop and stuff like that
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
      allowsMultipleSelection: true, //TODO: this only works on ios
    });
    if (!result.canceled && result.assets.length > 0) {
      const newImages = result.assets.map(createPickedImage);
      setImages((prevImages) => [...prevImages, ...newImages]); //update image uris
      setModifiedImages(true);
    }
  };
  // Function to handle this image
  const handleCapturedImage = (imageUri: string) => {
    setImages((prevImages) => [...prevImages, createCapturedImage(imageUri)]);
    setModifiedImages(true);
    setShowCamera(false);
  };

  const removeImage = (indexToRemove: number) => {
    setImages(images.filter((_, index) => index !== indexToRemove));
    setModifiedImages(true);
  };

  const prepareFormData = async () => {
    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("price", price);
    const category = categories.find((cat) => cat.name === selectedCategory);
    formData.append("category", category ? category.id.toString() : "7"); // Default to "Other" (8) if not found

    // only process images if they've been modified
    if (modifiedImages && images.length > 0) {
      // process primary image (i.e. the first one in the array)
      const image = images[0];
      if (!isExistingImage(image)) {
        await appendImageToFormData(formData, "image", image);
      }
    }
    // process additional images if there are any
    if (images.length > 1) {
      // skip the first image since it's already added as the primary image
      for (let i = 1; i < images.length; i++) {
        const additionalImage = images[i];
        if (isExistingImage(additionalImage)) {
          continue;
        }
        await appendImageToFormData(
          formData,
          "additional_images",
          additionalImage,
          `image_${i}.jpg`,
        );
      }
    }
    return formData;
  };

  // Function to open camera
  const openCamera = () => {
    setShowCamera(true);
  };

  const handleCategorySelect = (name: string) => {
    setSelectedCategory(name);
    setDropdownOpen(false);
  };

  const handleSubmit = async () => {
    if (!title || !price || !selectedCategory) {
      Alert.alert("Validation Error", "Please fill in all required fields.");
      return;
    }

    try {
      setLoading(true);
      const formData = await prepareFormData();

      const combinedText = `${title}\n${description}`;
      try {
        await listingsApi.moderateText(combinedText);
      } catch (moderationError: unknown) {
        const msg = messageFromApiError(
          moderationError,
          "Text moderation failed. Please revise your content.",
        );
        Alert.alert("NOT ALLOWED", msg);
        setLoading(false);
        return;
      }

      for (const image of images) {
        if (!image.uri || isExistingImage(image)) {
          continue;
        }
        if (image.uri) {
          const imageFormData = new FormData();
          await appendImageToFormData(imageFormData, "image", image);
          try {
            await listingsApi.moderateImage(imageFormData);
          } catch (imgError: unknown) {
            console.error("Image moderation request failed:", imgError);
            const msg = messageFromApiError(
              imgError,
              "Image moderation failed. Please use a different image.",
            );
            Alert.alert("NOT ALLOWED", msg);
            setLoading(false);
            return;
          }
        }
      }

      const response = await listingsApi.updateListing(
        originalItem.id,
        formData,
      );
      useItemsStore.getState().updateItem(response.data);

      Alert.alert("Success", "Item edited successfully", [
        {
          text: "OK",
          onPress: () => {
            // Go back to previous screen (which would be ItemDetails) with refreshed data
            router.back();

            // pass the updated item data back through URL params
            router.setParams({
              item: JSON.stringify(response.data),
              refreshKey: Date.now().toString(),
            });
          },
        },
      ]);
    } catch (error) {
      console.error("Error editting item:", error);
      Alert.alert("Error", getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const renderCategoryDropdown = () => {
    if (dropdownOpen) {
      return (
        <TouchableWithoutFeedback onPress={() => setDropdownOpen(false)}>
          <View style={styles.dropdownOverlay}>
            <View style={styles.dropdownContainer}>
              <ScrollView nestedScrollEnabled={true}>
                {categories.map((category) => (
                  <TouchableOpacity
                    key={category.name}
                    style={[
                      styles.dropdownItem,
                      selectedCategory === category.name &&
                        styles.dropdownItemSelected,
                    ]}
                    onPress={() => handleCategorySelect(category.name)}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        selectedCategory === category.name &&
                          styles.dropdownItemTextSelected,
                      ]}
                    >
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </TouchableWithoutFeedback>
      );
    }
    return null;
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: "Edit Item",
          headerTitleAlign: "center",
          headerShown: true,
          headerBackTitle: "Back",
        }}
      />
      <SafeAreaView style={{ flex: 1 }} edges={["left", "right", "bottom"]}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
          >
            <View style={styles.formGroup}>
              <Text style={styles.label}>Name *</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Item name"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Item Description"
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Price *</Text>
              <TextInput
                style={styles.input}
                value={price}
                onChangeText={setPrice}
                placeholder="0.00"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Category</Text>
              <TouchableOpacity
                testID="category-selector"
                style={styles.dropdownTrigger}
                onPress={() => setDropdownOpen(!dropdownOpen)}
              >
                <Text style={styles.dropdownTriggerText}>
                  {selectedCategory
                    ? categories.find((cat) => cat.name === selectedCategory)
                        ?.name
                    : "Select a category"}
                </Text>
                <MaterialIcons
                  name={dropdownOpen ? "arrow-drop-up" : "arrow-drop-down"}
                  size={24}
                  color={colors.accent}
                />
              </TouchableOpacity>
            </View>

            <View
              style={[styles.formGroup, { marginTop: dropdownOpen ? 120 : 0 }]}
            >
              <Text style={styles.label}>
                Images * ({images.length} selected)
              </Text>
              {images.length > 0 ? (
                <View style={styles.imageGallery}>
                  <FlatList
                    data={images}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(_, index) => index.toString()}
                    renderItem={({ item, index }) => (
                      <View style={styles.imageContainer}>
                        <Image
                          source={{ uri: item.uri }}
                          style={styles.thumbnailImage}
                        />
                        <TouchableOpacity
                          style={styles.removeIcon}
                          testID="remove-image-button"
                          onPress={() => removeImage(index)}
                        >
                          <MaterialIcons
                            name="close"
                            size={24}
                            color={colors.accentContrast}
                          />
                        </TouchableOpacity>
                        {index === 0 && (
                          <View style={styles.primaryBadge}>
                            <Text style={styles.primaryBadgeText}>Primary</Text>
                          </View>
                        )}
                      </View>
                    )}
                  />
                </View>
              ) : (
                <View style={styles.imagePicker}>
                  <Text style={styles.imagePickerText}>No Image Selected</Text>
                </View>
              )}
              <View style={styles.imageActions}>
                <TouchableOpacity
                  style={styles.imageButton}
                  onPress={pickImage}
                >
                  <MaterialIcons
                    name="photo-library"
                    size={24}
                    color={colors.accent}
                  />
                  <Text style={styles.imageButtonText}>Gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.imageButton}
                  onPress={openCamera}
                >
                  <MaterialIcons
                    name="camera-alt"
                    size={24}
                    color={colors.accent}
                  />
                  <Text style={styles.imageButtonText}>Camera</Text>
                </TouchableOpacity>
              </View>
              <CameraModal
                visible={showCamera}
                onClose={() => setShowCamera(false)}
                onCapture={handleCapturedImage}
              />
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator
                  testID="activity-indicator"
                  color={colors.accentContrast}
                />
              ) : (
                <Text style={styles.buttonText}>Save Item</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
          {/* Render the dropdown outside the ScrollView */}
          {renderCategoryDropdown()}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
};

const createStyles = (colors: {
  background: string;
  card: string;
  cardMuted: string;
  input: string;
  accent: string;
  accentSoft: string;
  accentContrast: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  overlay: string;
}) =>
  StyleSheet.create({
    container: {
      flex: 1,
      // padding: 16,
      paddingTop: 20,
      backgroundColor: colors.background,
    },
    title: {
      fontSize: 24,
      fontWeight: "bold",
      marginBottom: 20,
      textAlign: "center",
    },
    formGroup: {
      marginBottom: 20,
    },
    label: {
      fontSize: 16,
      marginBottom: 8,
      fontWeight: "500",
      color: colors.textPrimary,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      backgroundColor: colors.input,
      color: colors.textPrimary,
    },
    textarea: {
      height: 100,
      backgroundColor: colors.input,
      textAlignVertical: "top",
    },
    pickerContainer: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
    },
    imageActions: {
      flexDirection: "row",
      justifyContent: "space-around",
      marginTop: 10,
    },
    imageButton: {
      flexDirection: "row",
      alignItems: "center",
      padding: 10,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      backgroundColor: colors.cardMuted,
    },
    imageButtonText: {
      marginLeft: 8,
      fontWeight: "500",
      color: colors.textPrimary,
    },
    imagePicker: {
      height: 200,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.cardMuted,
      overflow: "hidden",
    },
    imageGallery: {
      height: 150,
      marginBottom: 10,
    },
    imageContainer: {
      width: 120,
      height: 120,
      margin: 5,
      borderRadius: 8,
      overflow: "hidden",
      position: "relative",
    },
    image: {
      width: "100%",
      height: "100%",
      resizeMode: "cover",
    },
    imagePickerText: {
      color: colors.textSecondary,
    },
    button: {
      backgroundColor: colors.accent,
      borderRadius: 8,
      padding: 16,
      alignItems: "center",
      marginVertical: 20,
    },
    buttonText: {
      color: colors.accentContrast,
      fontSize: 16,
      fontWeight: "bold",
    },
    dropdownStyle: {
      borderColor: colors.border,
      borderRadius: 8,
      backgroundColor: colors.card,
    },
    dropdownContainerStyle: {
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    dropdownItemStyle: {
      justifyContent: "flex-start",
    },
    dropdownTrigger: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      padding: 12,
      backgroundColor: colors.card,
    },
    dropdownTriggerText: {
      fontSize: 16,
      color: colors.textPrimary,
    },
    dropdownOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.overlay,
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1000,
    },
    dropdownContainer: {
      width: "80%",
      maxHeight: 300,
      backgroundColor: colors.card,
      borderRadius: 8,
      padding: 10,
      zIndex: 1001,
    },
    dropdownItem: {
      padding: 15,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    dropdownItemText: {
      fontSize: 16,
      color: colors.textPrimary,
    },
    dropdownItemSelected: {
      backgroundColor: colors.accentSoft,
    },
    dropdownItemTextSelected: {
      color: colors.accent,
      fontWeight: "bold",
    },

    primaryBadge: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: colors.accent,
      padding: 4,
      alignItems: "center",
    },
    primaryBadgeText: {
      color: colors.accentContrast,
      fontSize: 12,
      fontWeight: "bold",
    },
    removeIcon: {
      position: "absolute",
      top: 8,
      right: 8,
      padding: 4,
      zIndex: 10,
    },
    thumbnailImage: {
      width: "100%",
      height: "100%",
      resizeMode: "cover",
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 40,
    },
  });

export default EditItem;
