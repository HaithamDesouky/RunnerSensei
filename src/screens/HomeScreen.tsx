import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "../../App";
import { Run } from "../types";
import { getRuns } from "../utils/runStorage";
import { useRunTrackerContext } from "../context/RunTrackerContext";
import RunListItem from "../components/RunListItem";
import RunMap from "../components/RunMap";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "Home">;
};

export default function HomeScreen({ navigation }: Props) {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const { startRun } = useRunTrackerContext();

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

  const handleStart = async () => {
    const ok = await startRun();
    if (ok) navigation.navigate("ActiveRun");
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>RunnerSensei</Text>
        <Text style={styles.sub}>Your personal running coach</Text>
      </View>
      <Text>map below</Text>
      <RunMap
        points={runs.length > 0 ? runs[0].points : []}
        style={styles.map}
      />
      <TouchableOpacity
        style={styles.startBtn}
        onPress={handleStart}
        activeOpacity={0.85}
      >
        <Text style={styles.startTxt}>▶ Start Run</Text>
      </TouchableOpacity>
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
  safe: { flex: 1, backgroundColor: "#f5f5f5" },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 30, fontWeight: "800", color: "#1a1a2e" },
  sub: { fontSize: 14, color: "#888", marginTop: 2 },
  startBtn: {
    backgroundColor: "#E84545",
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 16,
    paddingVertical: 22,
    alignItems: "center",
    elevation: 6,
    shadowColor: "#E84545",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  startTxt: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 1,
  },
  section: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a1a2e",
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  empty: { alignItems: "center", marginTop: 48 },
  emptyTxt: { fontSize: 15, color: "#aaa" },
});

