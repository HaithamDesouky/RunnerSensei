import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { RunStats as T } from "../types";
import { formatDuration, formatPace } from "../utils/geo";

const RunStats: React.FC<{ stats: T; targetKm?: number }> = ({
  stats,
  targetKm,
}) => {
  const distanceLabel = targetKm ? "Remaining" : "Distance";
  const distanceValue = targetKm
    ? `${Math.max(0, targetKm - stats.distanceKm).toFixed(2)} km`
    : `${stats.distanceKm.toFixed(2)} km`;
  return (
    <View style={styles.row}>
      <Box label={distanceLabel} value={distanceValue} />
      <Box label="Duration" value={formatDuration(stats.durationMs)} />
      <Box label="Avg Pace" value={formatPace(stats.avgPaceMinPerKm)} />
    </View>
  );
};

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

