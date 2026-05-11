import React, { useEffect, useState } from "react";
import { TextInput, View, StyleSheet, TouchableOpacity } from "react-native";
import EvilIcons from "@expo/vector-icons/EvilIcons";
import { useItemsStore } from "@/stores/listings/use-items-store";
import { ScreenId } from "@/types/types";
import { useTheme } from "@/app/contexts/theme-context";

type SearchBarProps = {
  screenId: ScreenId;
};

const SearchBar: React.FC<SearchBarProps> = ({ screenId }) => {
  const [localQuery, setLocalQuery] = useState("");
  const { screens, performSearch } = useItemsStore();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const { searchQuery } = screens[screenId];

  const handleSearch = () => {
    performSearch(screenId, localQuery);
  };

  //keep local state in sync with global state
  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  return (
    <View>
      <TouchableOpacity style={styles.searchBarContainer}>
        <TextInput
          style={styles.searchTxt}
          placeholder="Search items..."
          value={localQuery}
          onChangeText={setLocalQuery}
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity style={styles.searchIcon}>
          <EvilIcons
            name="search"
            size={24}
            onPress={handleSearch}
            color={colors.icon}
          />
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
};

const createStyles = (colors: {
  cardMuted: string;
  border: string;
  textPrimary: string;
}) =>
  StyleSheet.create({
  searchBarContainer: {
    width: "90%",
    alignSelf: "center",
    backgroundColor: colors.cardMuted,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    flexDirection: "row",
    justifyContent: "center",
    borderRadius: 15,
    alignItems: "center",
    marginTop: 20,
  },
  searchTxt: {
    flex: 1,
    paddingVertical: 8,
    color: colors.textPrimary,
  },
  searchIcon: {
    padding: 5,
  },
});

export default SearchBar;
