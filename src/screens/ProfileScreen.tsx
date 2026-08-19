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
import { useAuth } from "../context/AuthContext";
import supabase from "../utils/supabaseClient";

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
  const { signOut } = useAuth();

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
        try {
          // upload to Supabase Storage
          const userRes = await supabase.auth.getUser();
          const userId = userRes.data.user?.id;
          if (userId) {
            // fetch the URI and try to get an ArrayBuffer (works better on Android/Expo)
            const response = await fetch(uri);
            let arrayBuffer: ArrayBuffer | null = null;
            try {
              if (typeof response.arrayBuffer === "function") {
                arrayBuffer = await response.arrayBuffer();
              } else {
                const maybeBlob: any = await response.blob();
                if (maybeBlob && typeof maybeBlob.arrayBuffer === "function") {
                  arrayBuffer = await maybeBlob.arrayBuffer();
                }
              }
            } catch (e) {
              console.warn("response.arrayBuffer failed", e);
            }

            // helper to convert base64 to Uint8Array
            const base64ToUint8Array = (b64: string) => {
              try {
                if (typeof atob === "function") {
                  const bin = atob(b64);
                  const len = bin.length;
                  const arr = new Uint8Array(len);
                  for (let i = 0; i < len; i++) arr[i] = bin.charCodeAt(i);
                  return arr;
                }
                if (typeof Buffer !== "undefined") {
                  return Uint8Array.from(Buffer.from(b64, "base64"));
                }
              } catch (e) {
                console.warn("base64 decode failed", e);
              }
              return null;
            };

            let blobType = "";
            if (arrayBuffer && arrayBuffer.byteLength) {
              console.log(
                "fetched arrayBuffer size",
                arrayBuffer.byteLength,
                uri,
              );
              blobType = "image/jpeg";
            }

            // If arrayBuffer is missing or very small, try the legacy FileSystem base64 fallback
            let uploadBody: any = null;
            if (
              !arrayBuffer ||
              (arrayBuffer.byteLength && arrayBuffer.byteLength < 1024)
            ) {
              try {
                const FileSystem = await import("expo-file-system/legacy");
                const b64 = await FileSystem.readAsStringAsync(uri, {
                  encoding: FileSystem.EncodingType.Base64,
                });
                const uint8 = base64ToUint8Array(b64);
                if (uint8) {
                  uploadBody = uint8;
                  console.log("fallback uint8 size", uint8.length);
                }
              } catch (e) {
                console.warn("file-system legacy fallback failed", e);
              }
            } else if (arrayBuffer) {
              uploadBody = new Uint8Array(arrayBuffer);
            }

            // If we still don't have a proper upload body, try a blob fetch as last resort
            if (!uploadBody) {
              try {
                const r2: any = await fetch(uri);
                const maybeBlob = await r2.blob();
                if (maybeBlob && typeof maybeBlob.arrayBuffer === "function") {
                  const ab = await maybeBlob.arrayBuffer();
                  uploadBody = new Uint8Array(ab);
                }
                blobType = maybeBlob?.type || blobType || "image/jpeg";
                console.log(
                  "last-resort blob->arrayBuffer",
                  uploadBody?.length,
                  blobType,
                );
              } catch (e) {
                console.warn("last-resort blob fetch failed", e);
              }
            }

            // fallback to saving URI in profile if nothing worked
            if (!uploadBody) {
              console.warn(
                "no upload body could be created, saving local uri instead",
              );
              await setAvatarUri(uri);
              const refreshed = await getUser();
              setUser(refreshed);
              return;
            }

            // ensure contentType and ext determination will use blobType when available
            let contentType = blobType || "";
            let ext = "";
            if (contentType) {
              const parts = contentType.split("/");
              if (parts.length === 2) {
                ext = "." + parts[1].split(";")[0];
                if (ext === ".jpeg") ext = ".jpg";
              }
            }
            if (!ext) {
              const m = uri.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
              if (m) ext = "." + m[1];
            }
            if (!ext) ext = ".jpg";
            if (!contentType) contentType = `image/${ext.replace(".", "")}`;

            const filename = `avatars/${userId}/${Date.now()}${ext}`;

            console.log(
              "final upload body size",
              uploadBody.length || "unknown",
              "contentType",
              contentType,
            );

            const { error: upErr } = await supabase.storage
              .from("runnersensei")
              .upload(filename, uploadBody, { contentType, upsert: true });

            if (upErr) {
              console.warn("avatar upload failed", upErr);
              // fallback: save local uri
              await setAvatarUri(uri);
            } else {
              // store the storage path in the profile and resolve signed URLs when loading
              console.log("avatar uploaded to storage path:", filename);
              await setAvatarUri(filename);
            }
          } else {
            await setAvatarUri(uri);
          }
        } catch (err) {
          console.warn("avatar upload exception", err);
          await setAvatarUri(uri);
        }
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
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 140 }}>
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
      <View style={styles.footer}>
        <Pressable
          style={styles.logoutBtn}
          android_ripple={{ color: "#eee" }}
          onPress={() =>
            Alert.alert("Sign out?", "Are you sure you want to sign out?", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Sign out",
                style: "destructive",
                onPress: async () => {
                  try {
                    await signOut();
                  } catch (e) {
                    console.warn("signOut failed", e);
                  }
                },
              },
            ])
          }
        >
          <Text style={styles.logoutTxt}>Sign Out</Text>
        </Pressable>
      </View>
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
  logoutBtn: {
    marginTop: 12,
    backgroundColor: "#E84545",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  logoutTxt: { color: "#fff", fontWeight: "800" },
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
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 20,
    alignItems: "center",
    paddingHorizontal: 20,
  },
});

