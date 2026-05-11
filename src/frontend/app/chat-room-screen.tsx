import { useUserStore } from "@/stores/user-store";
import { ChatRoom } from "@/types/chat";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import {
  Alert,
  Text,
  ListRenderItemInfo,
  TouchableOpacity,
  StyleSheet,
  View,
  FlatList,
  RefreshControl,
} from "react-native";
import React from "react";
import { EvilIcons } from "@expo/vector-icons";
import { router, Stack } from "expo-router";
import { useChatStore } from "@/stores/chat-store";
import { showAppToast } from "@/utils/app-toast";
import { getErrorMessage } from "@/utils/error-utils";
import api from "@/types/api";
import { useTheme } from "./contexts/theme-context";

type ChatRoomsScreenProps = {
  route?: unknown;
};

const ChatRoomsScreen: React.FC<ChatRoomsScreenProps> = () => {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const { userData } = useUserStore();
  const { fetchUnreadCount } = useChatStore();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const fetchRooms = useCallback(async (): Promise<void> => {
    try {
      const response = await api.get("/api/v1/chat-rooms/");
      const data = response.data;

      const sortedRooms = data.rooms.sort((a: ChatRoom, b: ChatRoom) => {
        if (!a.last_message_time || !b.last_message_time) return 0;
        return (
          new Date(b.last_message_time).getTime() -
          new Date(a.last_message_time).getTime()
        );
      });
      setRooms(sortedRooms);
      fetchUnreadCount();
    } catch (error) {
      console.error("Error fetching rooms:", error);
    }
  }, [fetchUnreadCount]);

  useFocusEffect(
    useCallback(() => {
      void fetchRooms();
      return () => {};
    }, [fetchRooms])
  );

  const handleRefresh = async (): Promise<void> => {
    setIsRefreshing(true);
    await fetchRooms();
    setIsRefreshing(false);
  };

  const markRoomAsRead = async (roomId: number): Promise<void> => {
    try {
      await api.post(`/api/v1/chat-rooms/${roomId}/read/`, {});
      setRooms((prevRooms) =>
        prevRooms.map((room) =>
          room.id === roomId.toString() ? { ...room, unread_count: 0 } : room
        )
      );
      fetchUnreadCount();
    } catch (error) {
      console.error("Error marking room as read:", error);
    }
  };

  const enterRoom = (room: ChatRoom): void => {
    if (!userData?.id) {
      Alert.alert("Error", "User not authenticated");
      return;
    }
    // figure out who's sending the messages for UI stuff
    const otherUser = userData.id === room.user1.id ? room.user2 : room.user1;

    // if there are unread messages in this room, mark them as read
    if (room.unread_count && room.unread_count > 0) {
      markRoomAsRead(Number(room.id));
    }
    // navigate to the chat room
    router.push({
      pathname: "/chat/[id]",
      params: {
        id: room.id.toString(),
        receiver_id: otherUser.id,
        user_id: userData.id,
        username: otherUser.username,
        itemTitle: room.item_title || "No item",
        item_id: room.item_id,
      },
    });
  };

  const handleDeleteRoom = async (roomId: number) => {
    try {
      await api.delete(`/api/v1/chat-rooms/${roomId}/`);
      setRooms((prevRooms) =>
        prevRooms.filter((room) => Number(room.id) !== roomId)
      );
      showAppToast({
        type: "success",
        text1: "Deleted",
        text2: "Chat room deleted successfully",
      });
      fetchUnreadCount();
    } catch (error) {
      console.error("Error deleting room:", error);
      Alert.alert("Error", getErrorMessage(error));
    }
  };

  const renderRoom = ({ item }: ListRenderItemInfo<ChatRoom>) => {
    // figure out who's sending the messages for UI stuff
    const otherUser = userData?.id === item.user1.id ? item.user2 : item.user1;
    const confirmDelete = () => {
      Alert.alert(
        "Delete Chat Room",
        "Are you sure you want to delete this chat room?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => handleDeleteRoom(Number(item.id)),
          },
        ]
      );
    };
    return (
      <View
        style={[
          styles.roomItem,
          Number(item.unread_count) > 0 && styles.unreadRoom,
        ]}
      >
        <TouchableOpacity
          style={styles.roomContent}
          onPress={() => enterRoom(item)}
        >
          <Text style={styles.roomName}>{otherUser.username}</Text>
          <View style={styles.detailsContainer}>
            <Text style={styles.roomDetails}>
              {item.item_title ? `Item: ${item.item_title}` : "No item"}
            </Text>
            <Text style={styles.roomDetails}> | </Text>
            <Text style={styles.roomDetails}>
              {item.message_count} messages
            </Text>
          </View>
        </TouchableOpacity>
        {/* Delete button */}
        {Number(item.unread_count) > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{item.unread_count}</Text>
          </View>
        )}
        <TouchableOpacity onPress={confirmDelete}>
          <EvilIcons name="trash" size={28} color={colors.accentMuted} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: "Your Chats",
          headerBackTitle: "Back",
          headerTitleAlign: "center",
          headerShown: true,
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.textPrimary,
          headerShadowVisible: false,
        }}
      />
      <View style={styles.container}>
        <FlatList
          data={rooms}
          renderItem={renderRoom}
          keyExtractor={(item) => item?.id.toString()}
          style={styles.roomList}
          contentContainerStyle={
            rooms.length === 0 ? styles.emptyList : undefined
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>No Chat rooms available</Text>
          }
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[colors.accent]}
              tintColor={colors.accent}
            />
          }
        />
      </View>
    </>
  );
};

const createStyles = (colors: {
  background: string;
  card: string;
  cardMuted: string;
  accent: string;
  accentMuted: string;
  accentContrast: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
}) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: colors.textPrimary,
  },
  roomList: {
    flex: 1,
  },
  emptyList: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 18,
    color: colors.textSecondary,
  },
  roomItem: {
    backgroundColor: colors.card,
    marginHorizontal: 14,
    marginTop: 12,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  roomName: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.textPrimary,
  },
  detailsContainer: {
    flexDirection: "row",
    marginTop: 4,
  },
  roomDetails: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  roomContent: {
    flex: 1,
  },
  unreadBadge: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    minWidth: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  unreadText: {
    color: colors.accentContrast,
    fontSize: 12,
    fontWeight: "bold",
  },
  unreadRoom: {
    backgroundColor: colors.cardMuted,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
  },
});

export default ChatRoomsScreen;
