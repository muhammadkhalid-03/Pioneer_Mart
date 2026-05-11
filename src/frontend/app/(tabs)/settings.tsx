import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Alert,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from "react-native";
import { useAuth } from "../contexts/auth-context";
import { useUserStore } from "@/stores/user-store";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesome, Foundation, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import DangerModal from "@/components/danger-modal";
import { getErrorMessage } from "@/utils/error-utils";
import { useTheme } from "../contexts/theme-context";
import {
  notificationsApi,
  type PushNotificationStatus,
} from "@/services/notifications-api";
import { enablePushNotifications } from "@/services/push-notifications";

const ProfileScreen = () => {
  const { onLogout } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [isLogoutVisible, setIsLogoutVisible] = useState(false);
  const [pushStatus, setPushStatus] = useState<PushNotificationStatus | null>(
    null
  );
  const [isPushLoading, setIsPushLoading] = useState(true);
  const [isPushUpdating, setIsPushUpdating] = useState(false);
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { userData, isLoading, fetchUserData } = useUserStore();

  useEffect(() => {
    Promise.resolve(fetchUserData()).catch((error) => {
      Alert.alert("Error", getErrorMessage(error));
    });
  }, [fetchUserData]);

  useEffect(() => {
    const loadPushStatus = async () => {
      try {
        setIsPushLoading(true);
        const status = await notificationsApi.getPushStatus();
        setPushStatus(status);
      } catch (error) {
        Alert.alert("Error", getErrorMessage(error));
      } finally {
        setIsPushLoading(false);
      }
    };

    void loadPushStatus();
  }, []);

  const openLogoutModal = () => {
    setIsLogoutVisible(true);
  };

  const closeLogoutModal = () => {
    setIsLogoutVisible(false);
  };

  const handleTogglePushNotifications = async (enabled: boolean) => {
    try {
      setIsPushUpdating(true);
      if (enabled) {
        const status = await enablePushNotifications();
        setPushStatus(status);
        return;
      }

      const response = await notificationsApi.setPushNotifications(false);
      setPushStatus((current) => ({
        push_notifications_enabled: response.push_notifications_enabled,
        has_push_token: current?.has_push_token ?? false,
      }));
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim()
          ? error.message
          : getErrorMessage(error);
      Alert.alert("Error", message);
    } finally {
      setIsPushUpdating(false);
    }
  };

  if (isLoading && !userData) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[
        styles.container,
        { backgroundColor: colors.background, paddingTop: insets.top },
      ]}
    >
      <DangerModal
        isVisible={isLogoutVisible}
        onClose={closeLogoutModal}
        dangerMessage={"Are you sure you want to logout?"}
        dangerOption1="Log out"
        onDone={async () => await onLogout()}
      />
      {/* Top row with profile image and email */}
      <View style={styles.topRowContainer}>
        <View style={styles.profileContainer}>
          <Image
            source={
              userData?.profile_picture
                ? { uri: userData.profile_picture }
                : require("../../assets/images/profile.jpeg")
            }
            style={styles.profileImage}
          />
        </View>

        <View style={styles.userInfoContainer}>
          <View style={styles.userInfoEmailContainer}>
            <MaterialIcons name="email" size={22} color={colors.accent} />
            <Text style={styles.userEmail}>{userData?.email}</Text>
          </View>
        </View>
      </View>
      {/* General Information Section */}
      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>General Information</Text>

        {/* Purchase Requests */}
        <TouchableOpacity
          style={styles.infoItem}
          onPress={() => router.push("../additional-info/purchase-requests")}
        >
          <View style={styles.infoItemLeft}>
            <FontAwesome name="send" size={22} color={colors.accent} />
            <Text style={styles.infoItemText}>Purchase Requests</Text>
          </View>
          <MaterialIcons
            name="chevron-right"
            size={22}
            color={colors.accent}
          />
        </TouchableOpacity>

        {/* My Items */}
        <TouchableOpacity
          style={styles.infoItem}
          onPress={() => router.push("../additional-info/my-items")}
        >
          <View style={styles.infoItemLeft}>
            <Foundation name="shopping-bag" size={22} color={colors.accent} />
            <Text style={styles.infoItemText}>My Items</Text>
          </View>
          <MaterialIcons
            name="chevron-right"
            size={22}
            color={colors.accent}
          />
        </TouchableOpacity>

        {/* Reported Items */}
        <TouchableOpacity
          style={styles.infoItem}
          onPress={() => router.push("../additional-info/reported-items")}
        >
          <View style={styles.infoItemLeft}>
            <MaterialIcons name="flag" size={22} color={colors.accent} />
            <Text style={styles.infoItemText}>Reported Items</Text>
          </View>
          <MaterialIcons
            name="chevron-right"
            size={22}
            color={colors.accent}
          />
        </TouchableOpacity>

        {/* FAQs */}
        <TouchableOpacity
          style={styles.infoItem}
          onPress={() => router.push("../additional-info/faqs")}
        >
          <View style={styles.infoItemLeft}>
            <MaterialIcons
              name="help-outline"
              size={22}
              color={colors.accent}
            />
            <Text style={styles.infoItemText}>FAQs</Text>
          </View>
          <MaterialIcons
            name="chevron-right"
            size={22}
            color={colors.accent}
          />
        </TouchableOpacity>

        {/* Contact Us */}
        <TouchableOpacity
          style={styles.infoItem}
          onPress={() => router.push("../additional-info/contact-us")}
        >
          <View style={styles.infoItemLeft}>
            <MaterialIcons
              name="mail-outline"
              size={22}
              color={colors.accent}
            />
            <Text style={styles.infoItemText}>Contact Us</Text>
          </View>
          <MaterialIcons
            name="chevron-right"
            size={22}
            color={colors.accent}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.pushSection}>
        <View style={styles.pushHeaderRow}>
          <View style={styles.infoItemLeft}>
            <MaterialIcons
              name="notifications-none"
              size={22}
              color={colors.accent}
            />
            <View style={styles.pushTextContainer}>
              <Text style={styles.pushTitle}>Push Notifications</Text>
              <Text style={styles.pushStatusText}>
                {pushStatus?.has_push_token
                  ? "Get notified when buyers message you or request an item."
                  : "Turn this on to register this device and receive PioneerMart alerts."}
              </Text>
            </View>
          </View>

          {isPushLoading ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <TouchableOpacity
              style={[
                styles.pushToggle,
                Boolean(pushStatus?.push_notifications_enabled) &&
                  styles.pushToggleEnabled,
                isPushUpdating && styles.pushToggleDisabled,
              ]}
              onPress={() =>
                handleTogglePushNotifications(
                  !Boolean(pushStatus?.push_notifications_enabled)
                )
              }
              disabled={isPushUpdating}
              activeOpacity={0.85}
            >
              <View
                style={[
                  styles.pushToggleThumb,
                  Boolean(pushStatus?.push_notifications_enabled) &&
                    styles.pushToggleThumbEnabled,
                ]}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={openLogoutModal}>
        <MaterialIcons
          name="logout"
          size={22}
          color={colors.accentContrast}
          style={styles.logoutIcon}
        />

        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

export default ProfileScreen;

const createStyles = (colors: {
  background: string;
  card: string;
  accent: string;
  accentContrast: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
}) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    width: "100%",
    alignItems: "center",
    marginTop: 20,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: colors.textPrimary,
  },
  topRowContainer: {
    flexDirection: "column",
    alignItems: "center",
    width: "100%",
    padding: 10,
  },
  profileContainer: {
    position: "relative",
    marginRight: 15,
  },
  profileImage: {
    width: 140,
    height: 140,
    borderRadius: 40,
  },
  userInfoContainer: {
    flex: 1,
    justifyContent: "center",
  },
  userInfoEmailContainer: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  userEmail: {
    fontSize: 16,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  infoSection: {
    marginTop: 25,
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  infoItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  infoItemText: {
    fontSize: 12,
    color: colors.textPrimary,
    marginLeft: 12,
  },
  pushSection: {
    marginTop: 24,
    backgroundColor: colors.card,
    borderRadius: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pushHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pushToggle: {
    width: 56,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.border,
    padding: 3,
    justifyContent: "center",
  },
  pushToggleEnabled: {
    backgroundColor: colors.accent,
  },
  pushToggleDisabled: {
    opacity: 0.6,
  },
  pushToggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.accentContrast,
  },
  pushToggleThumbEnabled: {
    alignSelf: "flex-end",
  },
  pushTextContainer: {
    flex: 1,
    marginLeft: 12,
    marginRight: 16,
  },
  pushTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  pushStatusText: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 8,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent,
    paddingVertical: 14,
    borderRadius: 30,
    marginTop: 30,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  logoutIcon: {
    marginRight: 10,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.accentContrast,
  },
});
