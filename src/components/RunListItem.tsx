import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Run } from "../types";
import { formatDuration, formatPace } from "../utils/geo";

interface Props {
  run: Run;
  onPress: (r: Run) => void;
  onEdit?: (r: Run) => void;
}

const RunListItem: React.FC<Props> = ({ run, onPress, onEdit }) => {
  const distanceKm = run.distanceMeters / 1000;
  const pace =
    distanceKm > 0.001 ? run.durationMs / 1000 / 60 / distanceKm : null;
  const date = new Date(run.date).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(run)}
      activeOpacity={0.7}
    >
      <View style={styles.row}>
        <Text style={styles.date}>{date}</Text>
        <View style={styles.rightRow}>
          <Text style={styles.dist}>{distanceKm.toFixed(2)} km</Text>
          {onEdit && (
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => onEdit(run)}
              activeOpacity={0.7}
              accessibilityLabel="Edit Run"
            >
              <Text style={styles.editTxt}>✏️</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      <Text style={styles.sub}>
        {formatDuration(run.durationMs)} · {formatPace(pace)}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    marginHorizontal: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  rightRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  date: { fontSize: 13, color: "#666" },
  dist: { fontSize: 18, fontWeight: "700", color: "#E84545" },
  sub: { fontSize: 13, color: "#333" },
  editBtn: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#eee",
    borderRadius: 8,
  },
  editTxt: { color: "#333", fontWeight: "700" },
});

export default RunListItem;

