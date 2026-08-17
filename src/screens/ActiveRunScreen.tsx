import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../../App";
import RunMap from "../components/RunMap";
import RunStats from "../components/RunStats";
import { computeStats } from "../utils/geo";
import { saveRun } from "../utils/runStorage";
import { useRunTrackerContext } from "../context/RunTrackerContext";

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, "ActiveRun">;
  route: RouteProp<RootStackParamList, "ActiveRun">;
};

export default function ActiveRunScreen({ navigation, route }: Props) {
  const preRunNote = route.params?.preRunNote;
  const suggestedTargetKm = route.params?.suggestedTargetKm;
  const {
    isTracking,
    isPaused,
    points,
    durationMs,
    stopRun,
    pauseRun,
    resumeRun,
    resetRun,
  } = useRunTrackerContext();
  const stats = computeStats(points, durationMs);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (!isTracking) navigation.replace("Home");
  }, [isTracking]);

  const handleStop = () =>
    Alert.alert("Stop Run?", "This run will be saved.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Stop & Save",
        style: "destructive",
        onPress: async () => {
          stopRun();
          if (points.length < 2 || stats.distanceKm < 0.01) {
            Alert.alert("Too short", "Run was too short to save.");
            resetRun();
            navigation.replace("Home");
            return;
          }

          const finishAndNav = async () => {
            await saveRun({
              id: String(Date.now()),
              date: new Date().toISOString(),
              points,
              distanceMeters: stats.distanceKm * 1000,
              durationMs,
              preRunNote: preRunNote || undefined,
            });
            resetRun();
            navigation.replace("Home");
          };

          // If this was a suggested run and user hit the target, show celebration
          const target = suggestedTargetKm;
          if (target && stats.distanceKm >= target - 0.01) {
            setShowConfetti(true);
            setTimeout(async () => {
              setShowConfetti(false);
              await finishAndNav();
            }, 1600);
          } else {
            await finishAndNav();
          }
        },
      },
    ]);

  return (
    <View style={styles.container}>
      <RunMap points={points} followUser style={styles.map} />
      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <RunStats stats={stats} targetKm={suggestedTargetKm} />
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.btn, styles.stopBtn]}
            onPress={handleStop}
            activeOpacity={0.8}
          >
            <Text style={styles.btnTxt}>■ Stop</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, isPaused ? styles.resumeBtn : styles.pauseBtn]}
            onPress={isPaused ? resumeRun : pauseRun}
            activeOpacity={0.8}
          >
            <Text style={styles.btnTxt}>
              {isPaused ? "▶  Resume" : "⏸  Pause"}
            </Text>
          </TouchableOpacity>
        </View>
        {isPaused && (
          <View style={styles.badge}>
            <Text style={styles.badgeTxt}>PAUSED</Text>
          </View>
        )}
        <Modal visible={showConfetti} transparent animationType="fade">
          <View style={confettiStyles.container} pointerEvents="none">
            <Text style={confettiStyles.emoji}>🎉</Text>
            <Text style={confettiStyles.text}>Nice job! Target reached 🎊</Text>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  overlay: { position: "absolute", bottom: 0, left: 0, right: 0 },
  controls: {
    flexDirection: "row",
    backgroundColor: "#1a1a2e",
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  btn: {
    flex: 1,
    marginHorizontal: 8,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  stopBtn: { backgroundColor: "#E84545" },
  pauseBtn: { backgroundColor: "#444" },
  resumeBtn: { backgroundColor: "#2ecc71" },
  btnTxt: { color: "#fff", fontSize: 16, fontWeight: "700" },
  badge: {
    position: "absolute",
    top: -44,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeTxt: { color: "#FFD700", fontWeight: "800", letterSpacing: 2 },
});

const confettiStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  emoji: { fontSize: 96, marginBottom: 12 },
  text: { color: "#fff", fontSize: 20, fontWeight: "700" },
});

