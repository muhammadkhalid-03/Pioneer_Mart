import { Message } from "@/types/chat";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  ListRenderItemInfo,
  StyleSheet,
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
} from "react-native";
import React from "react";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useUserStore } from "@/stores/user-store";
import { Entypo } from "@expo/vector-icons";
import api from "@/types/api";
import { useTheme } from "../contexts/theme-context";

const ChatScreen = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const { id, username, itemTitle, receiver_id, item_id } =
    useLocalSearchParams();
  const itemId = typeof item_id === "string" ? item_id : "";

  const receiverId =
    typeof receiver_id === "string" ? parseInt(receiver_id, 10) : undefined;
  const roomId = typeof id === "string" ? id : "";
  const roomName = typeof username === "string" ? username : "Chat Room";
  const item = typeof itemTitle === "string" ? itemTitle : "Item";
  const [messages, setMessages] = useState<Message[]>([]); // state for all messagees in the chat
  const [messageText, setMessageText] = useState<string>(""); // state for the actual content of a message
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const lastMessageIdRef = useRef<string | null>(null);
  const flatListRef = useRef<FlatList | null>(null); // react ref for interacting with FlatList
  const { userData } = useUserStore();

  const transformMessage = useCallback(
    (msg: any): Message => ({
      id: msg.id.toString(),
      content: msg.content,
      userId: msg.sender?.id?.toString() || "",
      receiverId: receiverId?.toString() || null,
      username: msg.sender?.username || "Unknown",
      timestamp: msg.timestamp,
    }),
    [receiverId]
  );

  const markRoomAsRead = useCallback(async (): Promise<void> => {
    try {
      await api.post(`/api/v1/chat-rooms/${roomId}/read/`, {});
    } catch (error) {
      console.error("Error marking room as read:", error);
    }
  }, [roomId]);

  const fetchChatHistory = useCallback(async (): Promise<void> => {
    try {
      const response = await api.get(
        `/api/v1/chat-rooms/${roomId}/messages/`
      );
      const transformedMessages = response.data.messages.map(transformMessage);
      setMessages(transformedMessages);
      lastMessageIdRef.current =
        transformedMessages[transformedMessages.length - 1]?.id || null;
    } catch (error) {
      console.error("Error fetching chat history:", error);
    } finally {
      setIsLoading(false);
    }
  }, [roomId, transformMessage]);

  const fetchNewMessages = useCallback(async (): Promise<void> => {
    try {
      const response = await api.get(
        `/api/v1/chat-rooms/${roomId}/messages/`,
        {
          params: lastMessageIdRef.current
            ? { after_id: lastMessageIdRef.current }
            : undefined,
        }
      );
      const newMessages = response.data.messages.map(transformMessage);
      if (newMessages.length === 0) {
        return;
      }

      setMessages((prevMessages) => {
        const existingIds = new Set(prevMessages.map((message) => message.id));
        const dedupedNewMessages = newMessages.filter(
          (message: Message) => !existingIds.has(message.id)
        );
        return [...prevMessages, ...dedupedNewMessages];
      });
      lastMessageIdRef.current = newMessages[newMessages.length - 1]?.id || null;
    } catch (error) {
      console.error("Error fetching new chat messages:", error);
    }
  }, [roomId, transformMessage]);

  useEffect(() => {
    setMessages([]);
    setIsLoading(true);
    lastMessageIdRef.current = null;

    fetchChatHistory();
    markRoomAsRead();
    const intervalId = setInterval(() => {
      fetchNewMessages();
    }, 4000);

    return () => {
      clearInterval(intervalId);
      setMessages([]);
      lastMessageIdRef.current = null;
    };
  }, [fetchChatHistory, fetchNewMessages, markRoomAsRead, roomId]);

  const sendMessage = useCallback(async (): Promise<void> => {
    if (messageText.trim() === "" || !receiverId) return;

    try {
      const response = await api.post(
        `/api/v1/chat-rooms/${roomId}/messages/send/`,
        {
          content: messageText.trim(),
          receiver_id: receiverId,
        }
      );
      const sentMessage = transformMessage(response.data);
      setMessages((prevMessages) => [...prevMessages, sentMessage]);
      lastMessageIdRef.current = sentMessage.id;
      setMessageText("");
    } catch (error) {
      console.error("Error sending chat message:", error);
    }
  }, [messageText, receiverId, roomId, transformMessage]);

  const renderMessage = ({ item }: ListRenderItemInfo<Message>) => {
    // this might seem useless but my stupid ass messed up the
    // chat.ts types and have been working with those so now we
    // need to convert all id's to string to use them w/ the backend
    const currentUserId = userData?.id?.toString();
    const messageUserId = item.userId?.toString();

    // check if message is sent by user for UI stuff
    const isMyMessage = messageUserId === currentUserId;

    return (
      <View
        style={[
          styles.messageBubble,
          isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
        ]}
      >
        {!isMyMessage && (
          <Text style={styles.messageUsername}>{item.username}</Text>
        )}
        <Text
          style={[
            styles.messageContent,
            isMyMessage && styles.myMessageContent,
          ]}
        >
          {item.content}
        </Text>
        <Text style={[styles.messageTime, isMyMessage && styles.myMessageTime]}>
          {new Date(item.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>
    );
  };
  // if (Platform.OS === "android") {
  //   return (
  //     <SafeAreaView style={styles.container}>
  //       <Stack.Screen
  //         options={{
  //           headerTitle: "Chat Unavailable",
  //           headerShown: true,
  //           headerTitleAlign: "center",
  //           headerBackTitle: "Back",
  //         }}
  //       />
  //       <View style={styles.unavailableContainer}>
  //         <Text style={styles.unavailableText}>
  //           Chat is currently unavailable on Android devices.
  //         </Text>
  //       </View>
  //     </SafeAreaView>
  //   );
  // }

  return (
    <>
      <Stack.Screen
        options={{
          headerTitle: () => (
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: `/item/[id]`,
                  params: { id: itemId },
                })
              }
            >
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "bold",
                  color: colors.textPrimary,
                }}
              >
                {roomName} - {item}
              </Text>
            </TouchableOpacity>
          ),
          headerShown: true,
          headerTitleAlign: "center",
          headerBackTitle: "Back",
          headerStyle: {
            backgroundColor: colors.background,
          },
          headerTintColor: colors.textPrimary,
          headerShadowVisible: false,
        }}
      />
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "padding"}
          style={styles.keyboardAvoid}
          keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item?.id}
            style={styles.messageList}
            onContentSizeChange={() => {
              if (flatListRef.current) {
                flatListRef.current.scrollToEnd({ animated: true });
              }
            }}
            onLayout={() => {
              if (flatListRef.current) {
                flatListRef.current.scrollToEnd({ animated: true });
              }
            }}
          />

          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={messageText}
              onChangeText={setMessageText}
              placeholder="Type a message..."
              returnKeyType="send"
              onSubmitEditing={() => {
                void sendMessage();
              }}
              autoFocus={false}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!messageText.trim() || isLoading) && styles.sendButtonDisabled,
              ]}
              onPress={() => {
                void sendMessage();
              }}
              disabled={!messageText.trim() || isLoading}
            >
              <Entypo
                name="paper-plane"
                size={20}
                color={colors.accentContrast}
              />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
};

export default ChatScreen;

const createStyles = (colors: {
  background: string;
  card: string;
  cardMuted: string;
  input: string;
  accent: string;
  accentMuted: string;
  accentContrast: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  disabled: string;
}) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardAvoid: {
    flex: 1,
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
  roomName: {
    fontSize: 18,
    fontWeight: "bold",
    color: colors.textPrimary,
  },
  connectionIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  messageList: {
    flex: 1,
    padding: 16,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
    marginBottom: 8,
    maxWidth: "80%",
    borderWidth: 1,
  },
  myMessageBubble: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    alignSelf: "flex-end",
    borderBottomRightRadius: 0,
  },
  otherMessageBubble: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    alignSelf: "flex-start",
    borderBottomLeftRadius: 0,
  },
  messageUsername: {
    fontWeight: "bold",
    fontSize: 12,
    marginBottom: 4,
    color: colors.accentMuted,
  },
  messageContent: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  myMessageContent: {
    color: colors.accentContrast,
  },
  messageTime: {
    fontSize: 10,
    color: colors.textSecondary,
    alignSelf: "flex-end",
    marginTop: 4,
  },
  myMessageTime: {
    color: colors.accentContrast,
    opacity: 0.85,
  },
  inputContainer: {
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 14,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  input: {
    flex: 1,
    backgroundColor: colors.input,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    color: colors.textPrimary,
  },
  sendButton: {
    backgroundColor: colors.accent,
    borderRadius: 22,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  sendButtonDisabled: {
    backgroundColor: colors.disabled,
  },
  sendButtonText: {
    color: colors.accentContrast,
    fontWeight: "bold",
  },
  unavailableContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  unavailableText: {
    textAlign: "center",
    fontSize: 16,
    color: colors.textSecondary,
    lineHeight: 24,
  },
});
