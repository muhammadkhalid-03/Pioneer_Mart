import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  Switch,
  TextInput,
} from "react-native";
import { CategoryType, ScreenId } from "@/types/types";
import { useItemsStore } from "@/stores/listings/use-items-store";
import { MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/app/contexts/theme-context";

/**
 * Props for the Categories component.
 */
type CategoriesProps = {
  /** Identifier for the screen using this component */
  screenId: ScreenId;
  /** List of available categories to display */
  categories: CategoryType[] | null;
};

/**
 * Filter options for the items
 */
type FilterOptions = {
  priceRange: [number, number];
  hasActivePurchaseRequest: boolean;
  isSold: boolean;
  sortByPrice: "asc" | "desc" | null;
  sortByDatePosted: "recent" | "older" | null;
};

/**
 * A horizontal scrollable list of category filters used in different screens (Home, Favorites, MyItems).
 * Users can select a category to filter the displayed items by category.
 *
 * @param screenId - Screen context in which this component is rendered
 * @param categories - List of available categories to choose from
 */
const Categories: React.FC<CategoriesProps> = ({
  screenId,
  categories,
}: CategoriesProps) => {
  const { screens, filterByCategory } = useItemsStore();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  // const { selectedCategory } = screens[screenId];
  const screenState = screens[screenId];
  const selectedCategory = screenState.selectedCategory;
  const filterOptions = screenState.filterOptions;
  const [categoriesModalVisible, setCategoriesModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [localFilterOptions, setLocalFilterOptions] =
    useState<FilterOptions>(filterOptions);
  const [priceRangeValues, setPriceRangeValues] = useState<[number, number]>(
    filterOptions.priceRange
  );

  useEffect(() => {
    setLocalFilterOptions(filterOptions);
    setPriceRangeValues(filterOptions.priceRange);
  }, [filterOptions]);

  const handleCategorySelect = (categoryId: string | null) => {
    const numCatId = categoryId === null ? null : Number(categoryId);
    filterByCategory(screenId, numCatId);
    setCategoriesModalVisible(false);
  };

  const handleFilterApply = () => {
    const updatedFilterOptions = {
      ...localFilterOptions,
      priceRange: priceRangeValues,
    };
    useItemsStore.getState().applyFilters(screenId, updatedFilterOptions);
    setFilterModalVisible(false);
  };

  const resetFilters = () => {
    const defaultFilters = {
      priceRange: [0, 1000] as [number, number],
      hasActivePurchaseRequest: false,
      isSold: false,
      sortByPrice: null,
      sortByDatePosted: null,
    };
    setLocalFilterOptions(defaultFilters);
    setPriceRangeValues([0, 1000]);
    useItemsStore.getState().resetFilters(screenId);
  };

  return (
    <View style={styles.container}>
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Categories</Text>
        {/* filter button */}
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setFilterModalVisible(true)}
        >
          <MaterialIcons name="filter-list" size={16} color={colors.accent} />
          <Text style={styles.filterText}>Filter & Sort</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollViewContent}
      >
        {/* "All" category option — represented by `null` in selectedCategory */}
        <TouchableOpacity
          style={[
            styles.categoryItem,
            selectedCategory === null && styles.selectedCategory,
          ]}
          onPress={() => filterByCategory(screenId, null)}
        >
          <Text
            style={[
              styles.categoryText,
              selectedCategory === null && styles.selectedCategoryText,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>

        {/* Render each category as a touchable button */}
        {categories &&
          categories.map((category) => (
            <TouchableOpacity
              key={category.id}
              style={[
                styles.categoryItem,
                selectedCategory === category.id && styles.selectedCategory,
              ]}
              onPress={() => filterByCategory(screenId, category.id)}
            >
              <Text
                style={[
                  styles.categoryText,
                  selectedCategory === category.id &&
                    styles.selectedCategoryText,
                ]}
              >
                {category.name}
              </Text>
            </TouchableOpacity>
          ))}

        {/* view all categories button */}
        <TouchableOpacity
          style={styles.viewAllCategoriesButton}
          onPress={() => setCategoriesModalVisible(true)}
        >
          <Text style={styles.viewAllCategoriesText}>View All</Text>
          <MaterialIcons
            name="keyboard-arrow-right"
            size={14}
            color={colors.accent}
          />
        </TouchableOpacity>
      </ScrollView>

      {/* modal for showing all categories */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={categoriesModalVisible}
        onRequestClose={() => setCategoriesModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>All Categories</Text>
              <TouchableOpacity
                onPress={() => setCategoriesModalVisible(false)}
              >
                <MaterialIcons
                  name="close"
                  size={24}
                  color={colors.accent}
                />
              </TouchableOpacity>
            </View>
            <FlatList
              data={categories || []}
              keyExtractor={(item) => item.id.toString()}
              ListHeaderComponent={
                <TouchableOpacity
                  style={[
                    styles.modalCategoryItem,
                    selectedCategory === null && styles.modalSelectedCategory,
                  ]}
                  onPress={() => handleCategorySelect(null)}
                >
                  <Text
                    style={[
                      styles.modalCategoryText,
                      selectedCategory === null &&
                        styles.modalSelectedCategoryText,
                    ]}
                  >
                    All Items
                  </Text>
                  {selectedCategory === null && (
                    <MaterialIcons
                      name="check"
                      size={20}
                      color={colors.accent}
                    />
                  )}
                </TouchableOpacity>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalCategoryItem,
                    selectedCategory === item.id &&
                      styles.modalSelectedCategory,
                  ]}
                  onPress={() => handleCategorySelect(item.id.toString())}
                >
                  <Text
                    style={[
                      styles.modalCategoryText,
                      selectedCategory === item.id &&
                        styles.modalSelectedCategoryText,
                    ]}
                  >
                    {item.name}
                  </Text>
                  {selectedCategory === item.id && (
                    <MaterialIcons
                      name="check"
                      size={20}
                      color={colors.accent}
                    />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </SafeAreaView>
      </Modal>

      {/* filter and sort by other stuff modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={filterModalVisible}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter & Sort</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <MaterialIcons
                  name="close"
                  size={24}
                  color={colors.accent}
                />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.filterScrollView}>
              {/* price range section */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Price Range</Text>
                <View style={styles.priceRangeContainer}>
                  <View style={styles.customPriceInputs}>
                    <TextInput
                      style={styles.priceInput}
                      keyboardType="numeric"
                      value={priceRangeValues[0].toString()}
                      onChangeText={(text) => {
                        const val = parseInt(text) || 0;
                        setPriceRangeValues([val, priceRangeValues[1]]);
                      }}
                      placeholder="Min"
                    />
                    <Text style={{ marginHorizontal: 8 }}>-</Text>
                    <TextInput
                      style={styles.priceInput}
                      keyboardType="numeric"
                      value={priceRangeValues[1].toString()}
                      onChangeText={(text) => {
                        const val = parseInt(text) || 0;
                        setPriceRangeValues([priceRangeValues[0], val]);
                      }}
                      placeholder="Max"
                    />
                  </View>
                </View>
              </View>
              {/* sort by price section */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Sort By Price</Text>
                <View style={styles.sortOptionsContainer}>
                  <TouchableOpacity
                    style={[
                      styles.sortOption,
                      localFilterOptions.sortByPrice === null &&
                        styles.selectedSortOption,
                    ]}
                    onPress={() =>
                      setLocalFilterOptions({
                        ...localFilterOptions,
                        sortByPrice: null,
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.sortOptionText,
                        localFilterOptions.sortByPrice === null &&
                          styles.selectedSortOptionText,
                      ]}
                    >
                      None
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.sortOption,
                      localFilterOptions.sortByPrice === "asc" &&
                        styles.selectedSortOption,
                    ]}
                    onPress={() =>
                      setLocalFilterOptions({
                        ...localFilterOptions,
                        sortByPrice: "asc",
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.sortOptionText,
                        localFilterOptions.sortByPrice === "asc" &&
                          styles.selectedSortOptionText,
                      ]}
                    >
                      Low to High
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.sortOption,
                      localFilterOptions.sortByPrice === "desc" &&
                        styles.selectedSortOption,
                    ]}
                    onPress={() =>
                      setLocalFilterOptions({
                        ...localFilterOptions,
                        sortByPrice: "desc",
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.sortOptionText,
                        localFilterOptions.sortByPrice === "desc" &&
                          styles.selectedSortOptionText,
                      ]}
                    >
                      High to Low
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              {/* sort by date section */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>
                  Sort By Date Posted
                </Text>
                <View style={styles.sortOptionsContainer}>
                  <TouchableOpacity
                    style={[
                      styles.sortOption,
                      localFilterOptions.sortByDatePosted === null &&
                        styles.selectedSortOption,
                    ]}
                    onPress={() =>
                      setLocalFilterOptions({
                        ...localFilterOptions,
                        sortByDatePosted: null,
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.sortOptionText,
                        localFilterOptions.sortByDatePosted === null &&
                          styles.selectedSortOptionText,
                      ]}
                    >
                      None
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.sortOption,
                      localFilterOptions.sortByDatePosted === "recent" &&
                        styles.selectedSortOption,
                    ]}
                    onPress={() =>
                      setLocalFilterOptions({
                        ...localFilterOptions,
                        sortByDatePosted: "recent",
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.sortOptionText,
                        localFilterOptions.sortByDatePosted === "recent" &&
                          styles.selectedSortOptionText,
                      ]}
                    >
                      Recent
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.sortOption,
                      localFilterOptions.sortByDatePosted === "older" &&
                        styles.selectedSortOption,
                    ]}
                    onPress={() =>
                      setLocalFilterOptions({
                        ...localFilterOptions,
                        sortByDatePosted: "older",
                      })
                    }
                  >
                    <Text
                      style={[
                        styles.sortOptionText,
                        localFilterOptions.sortByDatePosted === "older" &&
                          styles.selectedSortOptionText,
                      ]}
                    >
                      Older
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* status filters */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Item Status</Text>
                <View style={styles.switchContainer}>
                  <Text style={styles.switchLabel}>
                    Has Active Purchase Requests
                  </Text>
                  <Switch
                    trackColor={{ false: colors.border, true: colors.accent }}
                    thumbColor="#FFFFFF"
                    ios_backgroundColor={colors.border}
                    onValueChange={(value) =>
                      setLocalFilterOptions({
                        ...localFilterOptions,
                        hasActivePurchaseRequest: value,
                      })
                    }
                    value={localFilterOptions.hasActivePurchaseRequest}
                  />
                </View>
              </View>
            </ScrollView>

            {/* action buttons */}
            <View style={styles.filterActions}>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={resetFilters}
              >
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={handleFilterApply}
              >
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
};

export default Categories;

/**
 * Styles for the Categories component layout and buttons.
 */
const createStyles = (colors: {
  background: string;
  border: string;
  card: string;
  cardMuted: string;
  accent: string;
  accentSoft: string;
  textPrimary: string;
  textSecondary: string;
}) =>
  StyleSheet.create({
  container: {
    paddingVertical: 15,
    // position: "relative",
  },
  titleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.accentSoft,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  filterText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 4,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  viewAllText: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "500",
  },
  scrollViewContent: {
    paddingHorizontal: 10,
    paddingBottom: 5,
  },
  categoryItem: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginHorizontal: 5,
    borderRadius: 20,
    backgroundColor: colors.cardMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedCategory: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  categoryText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  selectedCategoryText: {
    color: "white",
    fontWeight: "600",
  },
  viewAllCategoriesButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 5,
  },
  viewAllCategoriesText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.textPrimary,
  },
  modalCategoryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalSelectedCategory: {
    backgroundColor: colors.accentSoft,
  },
  modalCategoryText: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  modalSelectedCategoryText: {
    color: colors.accent,
    fontWeight: "500",
  },
  filterScrollView: {
    // maxHeight: "60%",
    // flex: 1,
  },
  filterSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  priceRangeContainer: {
    marginBottom: 10,
  },
  priceLabel: {
    fontSize: 14,
    color: colors.textPrimary,
    marginBottom: 8,
    textAlign: "center",
  },
  customPriceInputs: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  priceInput: {
    width: 70,
    padding: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    fontSize: 14,
    textAlign: "center",
  },

  sortOptionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  sortOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
    borderRadius: 16,
    backgroundColor: colors.cardMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedSortOption: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  sortOptionText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  selectedSortOptionText: {
    color: "white",
  },
  switchContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  switchLabel: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  filterActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  resetButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  resetButtonText: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: "500",
  },
  applyButton: {
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    backgroundColor: colors.accent,
  },
  applyButtonText: {
    color: "white",
    fontWeight: "500",
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
