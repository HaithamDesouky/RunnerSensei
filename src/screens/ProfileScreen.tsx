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
import { getRuns } from "../utils/runStorage";
import { useNavigation } from "@react-navigation/native";
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

const BADGE_DESCRIPTIONS: Record<string, string> = {
  "First Run": "Awarded when you log your first run.",
  "5K Club": "Logged a single run of 5 km or more.",
  "10K Club": "Logged a single run of 10 km or more.",
  "1K Club": "Logged a single run of 1 km or more.",
  "2K Club": "Logged a single run of 2 km or more.",
  "3K Club": "Logged a single run of 3 km or more.",
  "8K Club": "Logged a single run of 8 km or more.",
  "12K Club": "Logged a single run of 12 km or more.",
  "15K Club": "Logged a single run of 15 km or more.",
  "20K Club": "Logged a single run of 20 km or more.",
  "25K Club": "Logged a single run of 25 km or more.",
  "30K Club": "Logged a single run of 30 km or more.",
  "PR Distance": "Awarded when you set a new personal record for distance.",
  "PR Pace": "Awarded when you set a new personal record for pace.",
  "Streak 7 Days": "Maintain a running streak of 7 consecutive days.",
  "Weekly Warrior (3)": "Logged 3 runs in the same ISO week.",
  "Weekly Warrior (5)": "Logged 5 runs in the same ISO week.",
};

export default function ProfileScreen() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const navigation = useNavigation();
  const [xpModalVisible, setXpModalVisible] = useState(false);
  const [bestDistanceRun, setBestDistanceRun] = useState<any | null>(null);
  const [bestPaceRun, setBestPaceRun] = useState<any | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [badgeModalVisible, setBadgeModalVisible] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<string | null>(null);
  const { signOut } = useAuth();

  useEffect(() => {
    let mounted = true;
    getUser().then((u) => {
      if (mounted) setUser(u);
    });
    // compute PRs
    (async () => {
      try {
        const runs = await getRuns();
        if (!runs || runs.length === 0) return;
        let bestDist = runs[0];
        let bestPace = runs[0];
        const pace = (r: any) => {
          if (!r.distanceMeters || r.distanceMeters <= 0) return Infinity;
          const minutes = (r.durationMs || 0) / 60000;
          const km = (r.distanceMeters || 0) / 1000;
          return minutes / km;
        };
        for (const r of runs) {
          if ((r.distanceMeters || 0) > (bestDist.distanceMeters || 0))
            bestDist = r;
          if (pace(r) < pace(bestPace)) bestPace = r;
        }
        if (mounted) {
          setBestDistanceRun(bestDist);
          setBestPaceRun(bestPace);
        }
      } catch (e) {
        console.warn("compute PRs failed", e);
      }
    })();
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
                // last-resort blob converted to arrayBuffer
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

            // final upload body prepared

            const { error: upErr } = await supabase.storage
              .from("runnersensei")
              .upload(filename, uploadBody, { contentType, upsert: true });

            if (upErr) {
              console.warn("avatar upload failed", upErr);
              // fallback: save local uri
              await setAvatarUri(uri);
            } else {
              // store the storage path in the profile and resolve signed URLs when loading
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

  if (!user)
    return (
      <SafeAreaView style={styles.safe}>
        <View style={{ padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: "700" }}>Profile</Text>
          <Text style={{ color: "#666", marginTop: 8 }}>Loading profile…</Text>
        </View>
      </SafeAreaView>
    );

  const progressPct = Math.min(100, Math.round(((user.xp % 500) / 500) * 100));

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={{
          padding: 12,
          paddingTop: 0,
          paddingBottom: 140,
        }}
      >
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
          <Pressable
            onPress={() => setXpModalVisible(true)}
            android_ripple={{ color: "#eee" }}
            accessibilityLabel="XP details"
          >
            <View style={styles.progressBar}>
              <View
                style={[styles.progressFill, { width: `${progressPct}%` }]}
              />
            </View>
            <Text style={styles.small}>{progressPct}% to next level</Text>
          </Pressable>
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

        {/* Personal Records */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Personal Records</Text>
          {bestDistanceRun ? (
            <Pressable
              onPress={() =>
                (navigation as any).navigate("RunDetail", {
                  runId: bestDistanceRun.id,
                })
              }
              style={styles.prRow}
            >
              <View style={styles.prColLabel}>
                <View style={styles.prLabelRow}>
                  <Text style={styles.prLabel}>
                    Longest Distance {BADGE_EMOJI["PR Distance"]}
                  </Text>
                </View>
              </View>
              <View style={styles.prColValue}>
                <Text style={styles.prValue}>
                  {((bestDistanceRun.distanceMeters || 0) / 1000).toFixed(2)} km
                </Text>
              </View>
              <View style={styles.prColDate}>
                <Text style={styles.prDate}>
                  {new Date(bestDistanceRun.date).toLocaleDateString()}
                </Text>
              </View>
            </Pressable>
          ) : (
            <Text style={styles.small}>No distance records yet</Text>
          )}
          {bestPaceRun ? (
            <Pressable
              onPress={() =>
                (navigation as any).navigate("RunDetail", {
                  runId: bestPaceRun.id,
                })
              }
              style={[styles.prRow, { marginTop: 8 }]}
            >
              <View style={styles.prColLabel}>
                <View style={styles.prLabelRow}>
                  <Text style={styles.prLabel}>
                    Best Pace {BADGE_EMOJI["PR Pace"]}
                  </Text>
                </View>
              </View>
              <View style={styles.prColValue}>
                <Text style={styles.prValue}>{formatPace(bestPaceRun)}</Text>
              </View>
              <View style={styles.prColDate}>
                <Text style={styles.prDate}>
                  {new Date(bestPaceRun.date).toLocaleDateString()}
                </Text>
              </View>
            </Pressable>
          ) : (
            <Text style={styles.small}>No pace records yet</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Badges</Text>
          {user.badges.filter((b) => b !== "PR Distance" && b !== "PR Pace")
            .length === 0 ? (
            <Text style={styles.small}>No badges yet — go for a run!</Text>
          ) : (
            <View style={styles.badgeRow}>
              {user.badges
                .filter((b) => b !== "PR Distance" && b !== "PR Pace")
                .map((b) => (
                  <Pressable
                    key={b}
                    style={styles.badge}
                    android_ripple={{ color: "#222" }}
                    onPress={() => {
                      setSelectedBadge(b);
                      setBadgeModalVisible(true);
                    }}
                  >
                    <Text style={styles.badgeTxt}>
                      {(BADGE_EMOJI[b] ?? "🏅") + " " + b}
                    </Text>
                  </Pressable>
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
      <Modal
        visible={xpModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setXpModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setXpModalVisible(false)}
        >
          <Pressable style={styles.xpModalBox} onPress={() => {}}>
            <View style={{ alignSelf: "flex-end" }}>
              <Pressable
                onPress={() => setXpModalVisible(false)}
                style={styles.modalClose}
                android_ripple={{ color: "#eee" }}
              >
                <Text style={styles.modalCloseTxt}>✕</Text>
              </Pressable>
            </View>
            <Text style={styles.xpModalTitle}>How XP Works</Text>
            <Text style={styles.xpModalText}>
              You have {user?.xp ?? 0} XP. You need{" "}
              {500 - ((user?.xp ?? 0) % 500)} XP to reach the next level.
            </Text>
            <Text style={styles.xpModalText}>
              Earn XP by logging runs — distance and consistency increase XP.
              Bonuses are awarded for streaks and personal records.
            </Text>
            <Text
              style={[styles.xpModalText, { marginTop: 12, fontWeight: "700" }]}
            >
              Tap anywhere to close.
            </Text>
          </Pressable>
        </Pressable>
      </Modal>
      <Modal
        visible={badgeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBadgeModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setBadgeModalVisible(false)}
        >
          <Pressable style={styles.badgeModalBox} onPress={() => {}}>
            <View style={{ alignSelf: "flex-end" }}>
              <Pressable
                onPress={() => setBadgeModalVisible(false)}
                style={styles.modalClose}
                android_ripple={{ color: "#eee" }}
              >
                <Text style={styles.modalCloseTxt}>✕</Text>
              </Pressable>
            </View>
            <Text style={styles.badgeModalTitle}>{selectedBadge}</Text>
            <Text style={styles.badgeModalText}>
              {selectedBadge
                ? (BADGE_DESCRIPTIONS[selectedBadge] ??
                  "Earn this badge by completing the listed requirement.")
                : ""}
            </Text>
          </Pressable>
        </Pressable>
      </Modal>
      <View style={styles.footer}>
        <Pressable
          style={styles.logoutBtn}
          android_ripple={{ color: "#eee" }}
          onPress={() =>
            Alert.alert("Logout?", "Are you sure you want to logout?", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Logout",
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
          <View style={styles.logoutContent}>
            <Text style={styles.logoutIcon}>🔓</Text>
            <Text style={[styles.logoutTxt, { marginLeft: 8 }]}>Logout</Text>
          </View>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function formatPace(r: any) {
  if (!r || !r.distanceMeters || r.distanceMeters <= 0) return "—";
  const minutes = (r.durationMs || 0) / 60000;
  const km = (r.distanceMeters || 0) / 1000;
  const pace = minutes / km; // minutes per km
  const mins = Math.floor(pace);
  const secs = Math.round((pace - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, "0")} /km`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f5f5f5" },
  headerTop: { marginBottom: 6, flexDirection: "row", alignItems: "center" },
  title: { fontSize: 28, fontWeight: "800", color: "#1a1a2e" },
  sub: { color: "#666", marginTop: 4 },
  avatarPress: { width: 96, height: 96, borderRadius: 48, overflow: "hidden" },
  avatarImg: { width: 96, height: 96, borderRadius: 48 },
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
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: "center",
  },
  logoutTxt: { color: "#fff", fontWeight: "800" },
  logoutContent: { flexDirection: "row", alignItems: "center" },
  logoutIcon: { color: "#fff", fontSize: 18 },
  prRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  prLabel: { fontWeight: "700", color: "#333" },
  prValue: { fontWeight: "700", color: "#1a1a2e", textAlign: "right" },
  prDate: { color: "#666", fontSize: 12, textAlign: "right" },
  prColLabel: { flex: 2 },
  prColValue: { flex: 1, alignItems: "flex-end", paddingLeft: 8 },
  prColDate: { flex: 1, alignItems: "flex-end", paddingLeft: 8 },
  prIcon: { marginLeft: 0, fontSize: 16 },
  prLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalContent: {
    width: 420,
    height: 420,
    backgroundColor: "#fff",
    borderRadius: 210,
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
    borderRadius: 210,
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
  xpModalBox: {
    width: 320,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    alignSelf: "center",
  },
  xpModalTitle: { fontWeight: "800", fontSize: 18, marginBottom: 8 },
  xpModalText: { color: "#333", lineHeight: 20 },
  badgeModalBox: {
    width: 300,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    alignSelf: "center",
  },
  badgeModalTitle: { fontWeight: "800", fontSize: 18, marginBottom: 8 },
  badgeModalText: { color: "#333", lineHeight: 20 },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 70,
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
});

