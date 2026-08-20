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
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "../../App";
import { Run } from "../types";
import { getRuns, saveRun, updateRun, deleteRun } from "../utils/runStorage";
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
import { DatePicker } from "react-native-common-date-picker";

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
  const todayIsoDate = new Date().toISOString().slice(0, 10);
  const [manualDate, setManualDate] = useState(todayIsoDate);
  const [manualSaving, setManualSaving] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingRun, setEditingRun] = useState<Run | null>(null);
  const [editDistanceKm, setEditDistanceKm] = useState("");
  const [editDurationMin, setEditDurationMin] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editDate, setEditDate] = useState(todayIsoDate);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showManualDatePicker, setShowManualDatePicker] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

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
      date: (() => {
        try {
          const d = new Date(manualDate);
          if (!isNaN(d.getTime())) return d.toISOString();
        } catch (e) {}
        return new Date().toISOString();
      })(),
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

          setSuggestion(ai as unknown as SenseiSuggestion);
        } catch (e) {
          console.warn("AI suggestion failed:", e);
          setSuggestion(generateSuggestion(runs, feeling));
        }
      } else {
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

  const openEditModal = (r: Run) => {
    setEditingRun(r);
    setEditDistanceKm(((r.distanceMeters || 0) / 1000).toFixed(2));
    setEditDurationMin(Math.round((r.durationMs || 0) / 60000).toString());
    setEditNotes(r.notes || "");
    try {
      const d = new Date(r.date);
      if (!isNaN(d.getTime())) setEditDate(d.toISOString().slice(0, 10));
      else setEditDate(todayIsoDate);
    } catch (e) {
      setEditDate(todayIsoDate);
    }
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editingRun || editSaving) return;
    const km = parseFloat(editDistanceKm);
    const mins = parseFloat(editDurationMin);
    if (!km || km <= 0 || !mins || mins <= 0) return;
    setEditSaving(true);
    try {
      await updateRun(editingRun.id, {
        distanceMeters: Math.round(km * 1000),
        durationMs: Math.round(mins * 60 * 1000),
        notes: editNotes || undefined,
        date: editDate,
      });
      const data = await getRuns();
      setRuns(data);
      setEditModalVisible(false);
      setEditingRun(null);
    } catch (e) {
      console.warn("save edit failed", e);
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteRun = async () => {
    if (!editingRun) return;
    try {
      await deleteRun(editingRun.id);
      const data = await getRuns();
      setRuns(data);
      setEditModalVisible(false);
      setEditingRun(null);
    } catch (e) {
      console.warn("delete run failed", e);
    }
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
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 8,
              }}
            >
              {Platform.OS === "web" ? (
                <TextInput
                  placeholder="Date (YYYY-MM-DD)"
                  value={manualDate}
                  onChangeText={setManualDate}
                  style={[styles.input, { flex: 1 }]}
                />
              ) : (
                <Pressable
                  onPress={() => setShowManualDatePicker(true)}
                  style={[styles.input, { flex: 1, justifyContent: "center" }]}
                >
                  <Text>{manualDate}</Text>
                </Pressable>
              )}
              <Pressable
                onPress={() => setManualDate(todayIsoDate)}
                style={{
                  marginLeft: 8,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  backgroundColor: "#eee",
                  borderRadius: 8,
                }}
              >
                <Text>Today</Text>
              </Pressable>
            </View>
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
          <Modal
            visible={showManualDatePicker}
            transparent
            animationType="slide"
          >
            <Pressable
              style={styles.overlay}
              onPress={() => setShowManualDatePicker(false)}
            >
              <Pressable style={styles.sheet} onPress={() => {}}>
                <DatePicker
                  defaultDate={manualDate}
                  confirm={(dateStr) => {
                    setManualDate(dateStr);
                    setShowManualDatePicker(false);
                  }}
                  cancel={() => setShowManualDatePicker(false)}
                />
              </Pressable>
            </Pressable>
          </Modal>
        </View>
      </Modal>
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <Pressable
          style={styles.overlay}
          onPress={() => setEditModalVisible(false)}
        >
          <Pressable
            style={[styles.sheet, { borderRadius: 12, padding: 16 }]}
            onPress={() => {}}
          >
            <Text style={{ fontWeight: "700", fontSize: 18, marginBottom: 8 }}>
              Edit Run
            </Text>
            <TextInput
              placeholder="Distance (km)"
              keyboardType="decimal-pad"
              value={editDistanceKm}
              onChangeText={setEditDistanceKm}
              style={styles.input}
            />
            <TextInput
              placeholder="Duration (minutes)"
              keyboardType="decimal-pad"
              value={editDurationMin}
              onChangeText={setEditDurationMin}
              style={styles.input}
            />
            <TextInput
              placeholder="Notes"
              value={editNotes}
              onChangeText={setEditNotes}
              style={[styles.input, { height: 80 }]}
              multiline
            />
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 8,
              }}
            >
              {Platform.OS === "web" ? (
                <TextInput
                  placeholder="Date (YYYY-MM-DD)"
                  value={editDate}
                  onChangeText={setEditDate}
                  style={[styles.input, { flex: 1 }]}
                />
              ) : (
                <Pressable
                  onPress={() => setShowDatePicker(true)}
                  style={[styles.input, { flex: 1, justifyContent: "center" }]}
                >
                  <Text>{editDate}</Text>
                </Pressable>
              )}
              <Pressable
                onPress={() => setEditDate(todayIsoDate)}
                style={{
                  marginLeft: 8,
                  paddingVertical: 10,
                  paddingHorizontal: 12,
                  backgroundColor: "#eee",
                  borderRadius: 8,
                }}
              >
                <Text>Today</Text>
              </Pressable>
            </View>
            <Modal visible={showDatePicker} transparent animationType="slide">
              <Pressable
                style={styles.overlay}
                onPress={() => setShowDatePicker(false)}
              >
                <Pressable style={styles.sheet} onPress={() => {}}>
                  <DatePicker
                    defaultDate={editDate}
                    confirm={(dateStr) => {
                      setEditDate(dateStr);
                      setShowDatePicker(false);
                    }}
                    cancel={() => setShowDatePicker(false)}
                  />
                </Pressable>
              </Pressable>
            </Modal>
            <View style={{ flexDirection: "row", marginTop: 12 }}>
              <Pressable
                style={styles.modalBtn}
                onPress={() => setEditModalVisible(false)}
              >
                <Text>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalBtn,
                  { marginLeft: 8, opacity: editSaving ? 0.7 : 1 },
                ]}
                onPress={handleSaveEdit}
                disabled={editSaving}
              >
                {editSaving ? (
                  <ActivityIndicator color="#E84545" />
                ) : (
                  <Text style={{ fontWeight: "700" }}>Save</Text>
                )}
              </Pressable>
            </View>
            <View style={{ marginTop: 10 }}>
              <TouchableOpacity
                style={[styles.dismissBtn, { marginTop: 8 }]}
                onPress={handleDeleteRun}
                activeOpacity={0.85}
              >
                <Text style={styles.dismissTxt}>Delete Run</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
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
          accessibilityLabel="Open Profile"
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
        <>
          {/* show only the most recent 3 runs */}
          <FlatList
            data={[...runs]
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 3)}
            keyExtractor={(r) => r.id}
            renderItem={({ item }) => (
              <RunListItem
                run={item}
                onPress={(r) =>
                  navigation.navigate("RunDetail", { runId: r.id })
                }
                onEdit={(r) => openEditModal(r)}
              />
            )}
            contentContainerStyle={{ paddingBottom: 32 }}
            style={{ flexGrow: 0 }}
          />
        </>
      )}
      <TouchableOpacity
        style={[styles.dismissBtn, { marginHorizontal: 20, marginBottom: 4 }]}
        onPress={() => navigation.navigate("AllRuns")}
        activeOpacity={0.85}
      >
        <Text style={styles.dismissTxt}>Show all runs</Text>
      </TouchableOpacity>
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
    marginBottom: 4,
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

