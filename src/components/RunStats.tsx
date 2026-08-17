import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { RunStats as T } from "../types";
import { formatDuration, formatPace } from "../utils/geo";

const RunStats: React.FC<{ stats: T }> = ({ stats }) => (
  <View style={styles.row}>
    <Box label="Distance" value={`${stats.distanceKm.toFixed(2)} km`} />
    <Box label="Duration" value={formatDuration(stats.durationMs)} />
    <Box label="Avg Pace" value={formatPace(stats.avgPaceMinPerKm)} />
  </View>
);

const Box: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.box}>
    <Text style={styles.value}>{value}</Text>
    <Text style={styles.label}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    backgroundColor: "#1a1a2e",
    paddingVertical: 16,
  },
  box: { flex: 1, alignItems: "center" },
  value: { color: "#fff", fontSize: 20, fontWeight: "700" },
  label: { color: "#aaa", fontSize: 12, marginTop: 4 },
});

export default RunStats;

