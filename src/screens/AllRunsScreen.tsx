import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { RootStackParamList } from "../../App";
import { Run } from "../types";
import { getRuns } from "../utils/runStorage";
import RunListItem from "../components/RunListItem";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "AllRuns">;
};

export default function AllRunsScreen({ navigation }: Props) {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.section}>All Runs</Text>
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
              onEdit={(r) => navigation.navigate("RunDetail", { runId: r.id })}
            />
          )}
          contentContainerStyle={{ paddingBottom: 32 }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f5f5f5", paddingHorizontal: 8 },
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
});

