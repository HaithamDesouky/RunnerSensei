import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../App";
import { Run } from "../types";
import { getRuns, updateRun, deleteRun } from "../utils/runStorage";
import RunMap from "../components/RunMap";
import { formatDuration, formatPace } from "../utils/geo";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "RunDetail">;
  route: RouteProp<RootStackParamList, "RunDetail">;
};

export default function RunDetailScreen({ navigation, route }: Props) {
  const [run, setRun] = useState<Run | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getRuns().then((runs) => {
      const found = runs.find((r) => r.id === route.params.runId) ?? null;
      setRun(found);
      if (found?.notes) setNotes(found.notes);
    });
  }, [route.params.runId]);

  if (!run)
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#E84545" />
      </View>
    );

  const distanceKm = run.distanceMeters / 1000;
  const pace =
    distanceKm > 0.001 ? run.durationMs / 1000 / 60 / distanceKm : null;

  const handleSave = async () => {
    setSaving(true);
    await updateRun(run.id, { notes });
    setSaving(false);
    Alert.alert("Saved");
  };

  const handleDelete = () =>
    Alert.alert("Delete Run?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteRun(run.id);
          navigation.goBack();
        },
      },
    ]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <RunMap points={run.points} style={styles.map} />
        <SafeAreaView>
          <View style={styles.statsBox}>
            <Text style={styles.date}>
              {new Date(run.date).toLocaleString()}
            </Text>
            <View style={styles.statsRow}>
              <Stat label="Distance" value={`${distanceKm.toFixed(2)} km`} />
              <Stat label="Duration" value={formatDuration(run.durationMs)} />
              <Stat label="Avg Pace" value={formatPace(pace)} />
            </View>
          </View>
          <View style={styles.notesBox}>
            <Text style={styles.notesLabel}>Notes</Text>
            <TextInput
              style={styles.input}
              multiline
              placeholder="Add notes..."
              placeholderTextColor="#aaa"
              value={notes}
              onChangeText={setNotes}
            />
            <TouchableOpacity
              style={styles.saveBtn}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.8}
            >
              <Text style={styles.saveTxt}>
                {saving ? "Saving…" : "Save Notes"}
              </Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={handleDelete}
            activeOpacity={0.8}
          >
            <Text style={styles.deleteTxt}>Delete Run</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={{ alignItems: "center", flex: 1 }}>
    <Text style={styles.statVal}>{value}</Text>
    <Text style={styles.statLbl}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  map: { height: 300 },
  statsBox: { padding: 20, backgroundColor: "#fff" },
  date: { fontSize: 13, color: "#666", marginBottom: 12 },
  statsRow: { flexDirection: "row" },
  statVal: { fontSize: 18, fontWeight: "700", color: "#1a1a2e" },
  statLbl: { fontSize: 12, color: "#666", marginTop: 4 },
  notesBox: {
    margin: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  input: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: "#333",
    textAlignVertical: "top",
  },
  saveBtn: {
    marginTop: 12,
    backgroundColor: "#1a1a2e",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  saveTxt: { color: "#fff", fontWeight: "600" },
  deleteBtn: {
    marginHorizontal: 16,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E84545",
  },
  deleteTxt: { color: "#E84545", fontWeight: "600", fontSize: 15 },
});

