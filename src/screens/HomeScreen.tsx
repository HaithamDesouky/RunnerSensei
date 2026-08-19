import React, { useCallback, useState, useLayoutEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  TextInput,
  Modal,
  ScrollView,
  Pressable,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "../../App";
import { Run } from "../types";
import { getRuns, saveRun } from "../utils/runStorage";
import { useRunTrackerContext } from "../context/RunTrackerContext";
import RunListItem from "../components/RunListItem";
import RunMap from "../components/RunMap";
import {
  generateSuggestion,
  SenseiSuggestion,
  Intensity,
} from "../utils/senseiSuggest";
import {
  getOpenAIKey,
  setOpenAIKey,
  generateSuggestionAI,
} from "../utils/openai";

const INTENSITY_COLORS: Record<Intensity, { backgroundColor: string }> = {
  Rest: { backgroundColor: "#9e9e9e" },
  Easy: { backgroundColor: "#4caf50" },
  Moderate: { backgroundColor: "#ff9800" },
  Strong: { backgroundColor: "#e53935" },
};
const intensityColor = (i: Intensity) => INTENSITY_COLORS[i];

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Home">;
};

export default function HomeScreen({ navigation }: Props) {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [feeling, setFeeling] = useState("");
  const [suggestion, setSuggestion] = useState<SenseiSuggestion | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [keyModalVisible, setKeyModalVisible] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const { startRun } = useRunTrackerContext();
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [manualModalVisible, setManualModalVisible] = useState(false);
  const [manualDistanceKm, setManualDistanceKm] = useState("");
  const [manualDurationMin, setManualDurationMin] = useState("");
  const [manualSaving, setManualSaving] = useState(false);

  // load user profile for avatar/initials
  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          const { getUser } = await import("../utils/userStorage");
          const u = await getUser();
          if (!active) return;
          setAvatarUri(u.avatarUri ?? null);
          setUsername(u.username ?? null);
        } catch (e) {
          console.warn("load user for avatar failed", e);
        }
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  const openProfile = () => navigation.navigate("Profile");

  const handleAddManualRun = async () => {
    if (manualSaving) return;
    const km = parseFloat(manualDistanceKm);
    const mins = parseFloat(manualDurationMin);
    if (!km || km <= 0 || !mins || mins <= 0) return;
    const run: Run = {
      id: `manual-${Date.now()}`,
      date: new Date().toISOString(),
      points: [],
      distanceMeters: Math.round(km * 1000),
      durationMs: Math.round(mins * 60 * 1000),
      notes: "Manual entry",
    };
    setManualSaving(true);
    try {
      await saveRun(run);
      const data = await getRuns();
      setRuns(data);
      setManualModalVisible(false);
      setManualDistanceKm("");
      setManualDurationMin("");
    } catch (e) {
      console.warn("manual save failed", e);
    } finally {
      setManualSaving(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getRuns().then((data) => {
        if (active) {
          setRuns(data);
          setLoading(false);
        }
      });
      return () => {
        active = false;
      };
    }, []),
  );

  const handleAskSensei = async () => {
    setAiLoading(true);
    try {
      const k = await getOpenAIKey();
      if (k) {
        try {
          const ai = await generateSuggestionAI(runs, feeling, k);
          // AI response should match our local structure — coerce to SenseiSuggestion
          setSuggestion(ai as unknown as SenseiSuggestion);
        } catch (e) {
          console.warn("AI suggestion failed:", e);
          setSuggestion(generateSuggestion(runs, feeling));
        }
      } else {
        // no key saved — show key entry modal
        setKeyModalVisible(true);
      }
    } finally {
      setAiLoading(false);
    }
  };

  const handleStartSuggested = async () => {
    setSuggestion(null);
    const ok = await startRun();
    if (ok)
      navigation.navigate("ActiveRun", {
        preRunNote: feeling.trim() || undefined,
        suggestedTargetKm: suggestion?.targetDistanceKm,
      });
  };

  const handleStart = async () => {
    const ok = await startRun();
    if (ok)
      navigation.navigate("ActiveRun", {
        preRunNote: feeling.trim() || undefined,
      });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Modal visible={manualModalVisible} transparent animationType="slide">
        <View style={styles.manualModalOverlay}>
          <View style={styles.manualModalContent}>
            <Text style={{ fontWeight: "700", fontSize: 18, marginBottom: 8 }}>
              Add Run
            </Text>
            <TextInput
              placeholder="Distance (km)"
              keyboardType="decimal-pad"
              value={manualDistanceKm}
              onChangeText={setManualDistanceKm}
              style={styles.input}
            />
            <TextInput
              placeholder="Duration (minutes)"
              keyboardType="decimal-pad"
              value={manualDurationMin}
              onChangeText={setManualDurationMin}
              style={styles.input}
            />
            <View style={{ flexDirection: "row", marginTop: 12 }}>
              <Pressable
                style={styles.modalBtn}
                onPress={() => setManualModalVisible(false)}
              >
                <Text>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalBtn,
                  { marginLeft: 8, opacity: manualSaving ? 0.7 : 1 },
                ]}
                onPress={handleAddManualRun}
                disabled={manualSaving}
              >
                {manualSaving ? (
                  <ActivityIndicator color="#E84545" />
                ) : (
                  <Text style={{ fontWeight: "700" }}>Save</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>RunnerSensei</Text>
          <Text style={styles.sub}>Your personal running coach</Text>
        </View>
        <Pressable
          android_ripple={{ color: "#eee" }}
          style={styles.profileBtn}
          onPress={openProfile}
        >
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.profileCircle} />
          ) : (
            <View style={styles.profileCircle}>
              <Text style={styles.profileInitials}>
                {(username || "S").slice(0, 1).toUpperCase()}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      <View style={styles.feelingBox}>
        <Text style={styles.feelingLabel}>How are you feeling today?</Text>
        <TextInput
          style={styles.feelingInput}
          placeholder="e.g. Energized, tired, sore legs..."
          placeholderTextColor="#bbb"
          value={feeling}
          onChangeText={setFeeling}
          returnKeyType="done"
        />
      </View>

      <TouchableOpacity
        style={[styles.senseiBtnFull]}
        onPress={handleAskSensei}
        activeOpacity={0.85}
        disabled={aiLoading}
      >
        <Text style={styles.senseiTxt}>
          {aiLoading ? "Thinking..." : "🥋 Ask Sensei"}
        </Text>
      </TouchableOpacity>

      <View style={styles.btnRow}>
        <TouchableOpacity
          style={[styles.startBtn, styles.btnFlex]}
          onPress={handleStart}
          activeOpacity={0.85}
        >
          <Text style={styles.startTxt}>▶ Start Run</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.addBtn, styles.btnFlex]}
          onPress={() => setManualModalVisible(true)}
          activeOpacity={0.85}
        >
          <Text style={styles.addTxt}>＋ Add Run</Text>
        </TouchableOpacity>
      </View>

      {/* Sensei suggestion modal */}
      <Modal
        visible={suggestion !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSuggestion(null)}
      >
        <Pressable style={styles.overlay} onPress={() => setSuggestion(null)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            {suggestion && (
              <>
                <View style={styles.sheetHandle} />
                <Text style={styles.sheetTitle}>Sensei Says</Text>
                <ScrollView showsVerticalScrollIndicator={false}>
                  {suggestion.warnings.length > 0 && (
                    <View style={styles.warningBox}>
                      {suggestion.warnings.map((w) => (
                        <Text key={w} style={styles.warningTxt}>
                          ⚠ {w}
                        </Text>
                      ))}
                    </View>
                  )}
                  <View style={styles.metaRow}>
                    <View
                      style={[
                        styles.badge,
                        intensityColor(suggestion.intensity),
                      ]}
                    >
                      <Text style={styles.badgeTxt}>
                        {suggestion.intensity}
                      </Text>
                    </View>
                    {suggestion.targetDistanceKm > 0 && (
                      <Text style={styles.metaStat}>
                        {suggestion.targetDistanceKm} km
                      </Text>
                    )}
                    {suggestion.estimatedDurationMin > 0 && (
                      <Text style={styles.metaStat}>
                        ~{suggestion.estimatedDurationMin} min
                      </Text>
                    )}
                  </View>
                  <Text style={styles.suggestionMsg}>{suggestion.message}</Text>
                  {suggestion.intensity !== "Rest" ? (
                    <TouchableOpacity
                      style={styles.goBtn}
                      onPress={handleStartSuggested}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.goTxt}>▶ Start This Run</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.dismissBtn}
                      onPress={() => setSuggestion(null)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.dismissTxt}>
                        Got it, rest day it is
                      </Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* OpenAI API key entry modal */}
      <Modal
        visible={keyModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setKeyModalVisible(false)}
      >
        <Pressable
          style={styles.overlay}
          onPress={() => setKeyModalVisible(false)}
        >
          <Pressable
            style={[styles.sheet, { borderRadius: 12 }]}
            onPress={() => {}}
          >
            <Text style={[styles.sheetTitle, { marginTop: 0 }]}>
              Set OpenAI API Key
            </Text>
            <TextInput
              style={[styles.feelingInput, { marginBottom: 12 }]}
              placeholder="sk-..."
              placeholderTextColor="#999"
              value={apiKeyInput}
              onChangeText={setApiKeyInput}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <TouchableOpacity
                style={[styles.goBtn, { flex: 1 }]}
                onPress={async () => {
                  await setOpenAIKey(apiKeyInput.trim());
                  setKeyModalVisible(false);
                  setApiKeyInput("");
                  // attempt AI after saving key
                  handleAskSensei();
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.goTxt}>Save & Ask</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dismissBtn, { flex: 1 }]}
                onPress={() => setKeyModalVisible(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.dismissTxt}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Text style={styles.section}>Recent Runs</Text>
      {loading ? (
        <ActivityIndicator color="#E84545" style={{ marginTop: 32 }} />
      ) : runs.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTxt}>No runs yet — hit Start Run!</Text>
        </View>
      ) : (
        <FlatList
          data={runs}
          keyExtractor={(r) => r.id}
          renderItem={({ item }) => (
            <RunListItem
              run={item}
              onPress={(r) => navigation.navigate("RunDetail", { runId: r.id })}
            />
          )}
          contentContainerStyle={{ paddingBottom: 32 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
  safe: { flex: 1, backgroundColor: "#f5f5f5", paddingHorizontal: 8 },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: { flex: 1 },
  title: { fontSize: 30, fontWeight: "800", color: "#1a1a2e" },
  sub: { fontSize: 14, color: "#888", marginTop: 2 },

  feelingBox: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
  },
  feelingLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1a1a2e",
    marginBottom: 8,
  },
  feelingInput: {
    fontSize: 14,
    color: "#333",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },

  btnRow: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginVertical: 16,
    gap: 10,
  },
  btnFlex: { flex: 1, marginHorizontal: 0, marginVertical: 0 },

  startBtn: {
    backgroundColor: "#4caf50",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    elevation: 6,
    shadowColor: "#4caf50",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  startTxt: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  addBtn: {
    backgroundColor: "#7b1fa2",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    elevation: 6,
    shadowColor: "#7b1fa2",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  addTxt: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },

  senseiBtnFull: {
    backgroundColor: "#1a1a2e",
    borderRadius: 16,
    paddingVertical: 26,
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
  },
  senseiTxt: { color: "#fff", fontSize: 16, fontWeight: "700" },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    maxHeight: "80%",
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#ddd",
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1a1a2e",
    marginBottom: 14,
  },

  warningBox: {
    backgroundColor: "#fff8e1",
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  warningTxt: { fontSize: 13, color: "#b36200", marginVertical: 2 },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  badge: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 5 },
  badgeTxt: { color: "#fff", fontWeight: "700", fontSize: 13 },
  metaStat: { fontSize: 15, fontWeight: "600", color: "#444" },
  suggestionMsg: {
    fontSize: 15,
    color: "#333",
    lineHeight: 22,
    marginBottom: 24,
  },

  goBtn: {
    backgroundColor: "#E84545",
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: "center",
  },
  goTxt: { color: "#fff", fontSize: 17, fontWeight: "700" },
  dismissBtn: {
    backgroundColor: "#f0f0f0",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  dismissTxt: { color: "#555", fontSize: 15, fontWeight: "600" },

  section: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a1a2e",
    paddingHorizontal: 20,
    marginTop: 9,
    marginBottom: 9,
    backgroundColor: "transparent",
  },

  empty: { alignItems: "center", marginTop: 48 },
  emptyTxt: { fontSize: 15, color: "#aaa" },

  profileBtn: { marginLeft: 12 },
  profileCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E84545",
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
  },
  profileInitials: { color: "#fff", fontWeight: "800" },

  addManualBtn: {
    marginLeft: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#eee",
  },
  addManualTxt: { color: "#1a1a2e", fontWeight: "700" },

  manualModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  manualModalContent: {
    width: 320,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    alignItems: "stretch",
  },
  input: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginTop: 8,
  },
  modalBtn: {
    flex: 1,
    backgroundColor: "#fff",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#eee",
  },
});

