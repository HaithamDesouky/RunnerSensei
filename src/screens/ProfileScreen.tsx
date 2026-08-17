import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Alert,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getUser, UserProfile, setAvatarUri } from "../utils/userStorage";

const BADGE_EMOJI: Record<string, string> = {
  "First Run": "🎉",
  "5K Club": "🏃",
  "10K Club": "🏅",
  "1K Club": "1️⃣",
  "2K Club": "2️⃣",
  "3K Club": "3️⃣",
  "8K Club": "✨",
  "12K Club": "🌟",
  "15K Club": "💎",
  "20K Club": "🏆",
  "25K Club": "🥇",
  "30K Club": "🥈",
  "PR Distance": "📏",
  "PR Pace": "⚡️",
  "Streak 7 Days": "🔥",
  "Weekly Warrior (3)": "🛡️",
  "Weekly Warrior (5)": "🏆",
};

export default function ProfileScreen() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    let mounted = true;
    getUser().then((u) => {
      if (mounted) setUser(u);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const pickImage = async () => {
    try {
      // Use dynamic import to load the package at runtime.
      const ImagePicker = await import("expo-image-picker");

      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          "Permission required",
          "Allow photo library access to set your avatar.",
        );
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: [1, 1],
      });

      // support multiple response shapes across versions
      let uri: string | undefined;
      if (
        !(res as any).canceled &&
        (res as any).assets &&
        (res as any).assets.length > 0
      ) {
        uri = (res as any).assets[0].uri;
      } else if ((res as any).uri) {
        uri = (res as any).uri;
      }

      if (uri) {
        await setAvatarUri(uri);
        const refreshed = await getUser();
        setUser(refreshed);
      }
    } catch (e: any) {
      console.warn("Image pick failed", e);
      Alert.alert(
        "Image picker not available",
        "Install expo-image-picker to enable avatar upload: `npx expo install expo-image-picker`",
      );
    }
  };

  if (!user) return null;

  const progressPct = Math.min(100, Math.round(((user.xp % 500) / 500) * 100));

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={styles.headerTop}>
          <View style={styles.avatarColumn}>
            <Pressable
              android_ripple={{ color: "#eee" }}
              style={styles.avatarPress}
              onPress={() => setModalVisible(true)}
            >
              {user.avatarUri ? (
                <Image
                  source={{ uri: user.avatarUri }}
                  style={styles.avatarImg}
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitials}>
                    {(user.username || "S").slice(0, 1).toUpperCase()}
                  </Text>
                </View>
              )}
            </Pressable>
            <Pressable
              style={styles.changeBtn}
              android_ripple={{ color: "#ddd" }}
              onPress={pickImage}
            >
              <Text style={styles.changeBtnTxt}>Change Profile Image</Text>
            </Pressable>
          </View>

          <Modal
            visible={modalVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setModalVisible(false)}
          >
            <Pressable
              style={styles.modalOverlay}
              onPress={() => setModalVisible(false)}
            >
              <Pressable style={styles.modalContent} onPress={() => {}}>
                <Pressable
                  android_ripple={{ color: "#eee" }}
                  onPress={() => setModalVisible(false)}
                  style={styles.modalClose}
                >
                  <Text style={styles.modalCloseTxt}>✕</Text>
                </Pressable>
                {user.avatarUri ? (
                  <Image
                    source={{ uri: user.avatarUri }}
                    style={styles.modalImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.modalImage, styles.modalPlaceholder]}>
                    <Text style={styles.avatarInitials}>
                      {(user.username || "S").slice(0, 1).toUpperCase()}
                    </Text>
                  </View>
                )}
              </Pressable>
            </Pressable>
          </Modal>
          <View style={{ marginLeft: 12 }}>
            <Text style={styles.title}>Profile</Text>
            <Text style={styles.sub}>
              Level {user.level} • {user.xp} XP
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>XP Progress</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
          </View>
          <Text style={styles.small}>{progressPct}% to next level</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Streak</Text>
          <Text style={styles.large}>{user.currentStreak} days</Text>
          <Text style={styles.small}>
            Last run:{" "}
            {user.lastRunDate
              ? new Date(user.lastRunDate).toLocaleDateString()
              : "—"}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Badges</Text>
          {user.badges.length === 0 ? (
            <Text style={styles.small}>No badges yet — go for a run!</Text>
          ) : (
            <View style={styles.badgeRow}>
              {user.badges.map((b) => (
                <View key={b} style={styles.badge}>
                  <Text style={styles.badgeTxt}>
                    {(BADGE_EMOJI[b] ?? "🏅") + " " + b}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Weekly Summary</Text>
          <Text style={styles.small}>
            Runs this week:{" "}
            {Object.values(user.weeklyRuns || {}).slice(-1)[0] || 0}
          </Text>
          <Text style={styles.small}>Total runs: {user.totalRuns || 0}</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f5f5f5" },
  headerTop: { marginBottom: 10, flexDirection: "row", alignItems: "center" },
  title: { fontSize: 28, fontWeight: "800", color: "#1a1a2e" },
  sub: { color: "#666", marginTop: 4 },
  avatarPress: { width: 64, height: 64, borderRadius: 32, overflow: "hidden" },
  avatarImg: { width: 64, height: 64, borderRadius: 32 },
  avatarColumn: {
    flexDirection: "column",
    alignItems: "center",
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#E84545",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: { color: "#fff", fontWeight: "800", fontSize: 20 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    elevation: 2,
  },
  cardTitle: { fontWeight: "700", marginBottom: 8 },
  progressBar: {
    height: 12,
    backgroundColor: "#eee",
    borderRadius: 8,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: "#E84545" },
  small: { color: "#666", marginTop: 8 },
  large: { fontSize: 28, fontWeight: "800", color: "#1a1a2e" },
  badgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  badge: {
    backgroundColor: "#1a1a2e",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginRight: 8,
    marginTop: 8,
  },
  badgeTxt: { color: "#fff", fontWeight: "700" },
  changeBtn: {
    marginTop: 8,
    backgroundColor: "#fff",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#eee",
  },
  changeBtnTxt: { color: "#1a1a2e", fontWeight: "700" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalContent: {
    width: 320,
    height: 320,
    backgroundColor: "#fff",
    borderRadius: 160,
    padding: 0,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  modalClose: {
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 10,
    backgroundColor: "rgba(255,255,255,0.85)",
    padding: 6,
    borderRadius: 16,
  },
  modalCloseTxt: { color: "#333", fontWeight: "700" },
  modalImage: {
    width: "100%",
    height: "100%",
    borderRadius: 160,
    marginTop: 0,
  },
  modalPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#E84545",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 160,
  },
});

