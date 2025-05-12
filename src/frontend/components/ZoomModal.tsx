import { useTheme } from "@/app/contexts/ThemeContext";
import { ItemType } from "@/types/types";
import { AntDesign } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  TouchableOpacity,
  View,
  StyleSheet,
  Image,
  Dimensions,
  FlatList,
  Text,
  Platform,
} from "react-native";

interface ZoomModalProps {
  isVisible: boolean;
  onClose: () => void;
  item: ItemType;
  initialImageIndex: number;
}

const { width, height } = Dimensions.get("window");
const contentWidth = Platform.OS === "web" ? 400 : width;

const ZoomModal: React.FC<ZoomModalProps> = ({
  isVisible,
  onClose,
  item,
  initialImageIndex = 0,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialImageIndex);
  const flatListRef = useRef<FlatList>(null);
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const getItemImages = () => {
    if (!item) return [];

    const primary = item.image ? [item.image] : [];
    const additional =
      item.additional_images && Array.isArray(item.additional_images)
        ? item.additional_images.map((img: any) => img.image)
        : [];
    return [...primary, ...additional];
  };

  const images = getItemImages();
  useEffect(() => {
    if (isVisible && flatListRef.current && initialImageIndex > 0) {
      setTimeout(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToIndex({
            index: initialImageIndex,
            animated: false,
          });
        }
      }, 100);
    }
  }, [isVisible, initialImageIndex]);
  // function to handle image scroll
  const handleScroll = (event: any) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = Math.floor(event.nativeEvent.contentOffset.x / slideSize);
    if (index !== currentIndex) {
      setCurrentIndex(index);
    }
  };

  const renderImageItem = ({ item: imageUrl }: { item: string }) => {
    return (
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.image}
          resizeMode="contain"
        />
      </View>
    );
  };
  const renderPaginationDots = () => {
    return (
      <View style={styles.paginationContainer}>
        {(images.length > 0
          ? images
          : ["src/frontend/assets/images/defaultpic.png"]
        ).map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              currentIndex === index && styles.paginationDotActive,
            ]}
          />
        ))}
      </View>
    );
  };
  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      testID="zoomable-view"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <AntDesign name="close" size={30} color={colors.card} />
          </TouchableOpacity>

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
            initialScrollIndex={initialImageIndex}
            getItemLayout={(data, index) => ({
              length: width,
              offset: width * index,
              index,
            })}
          />

          {renderPaginationDots()}
          <View style={styles.imageCounterContainer}>
            <Text style={styles.imageCounter}>
              {currentIndex + 1} of {images.length || 1}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
    modalContainer: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.9)",
      justifyContent: "center",
      alignItems: "center",
      width: contentWidth,
      alignSelf: "center",
    },
    modalContent: {
      width: contentWidth,
      alignSelf: "center",
    },
    imageContainer: {
      width: contentWidth,
      height,
      justifyContent: "center",
      alignItems: "center",
    },
    image: {
      width: contentWidth,
      height: height * 0.7,
    },
    closeButton: {
      position: "absolute",
      top: 50,
      right: 20,
      zIndex: 10,
    },
    paginationContainer: {
      position: "absolute",
      bottom: 50,
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
      backgroundColor: "rgba(255, 255, 255, 0.6)",
    },
    paginationDotActive: {
      backgroundColor: "#fff",
      width: 12,
      height: 12,
      borderRadius: 6,
    },
    imageCounterContainer: {
      position: "absolute",
      bottom: 100,
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
  });

export default ZoomModal;
