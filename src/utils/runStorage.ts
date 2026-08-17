import AsyncStorage from "@react-native-async-storage/async-storage";
import { Run } from "../types";

const RUNS_KEY = "@RunnerSensei:runs";

export async function saveRun(run: Run): Promise<void> {
  const existing = await getRuns();
  await AsyncStorage.setItem(RUNS_KEY, JSON.stringify([run, ...existing]));
}

export async function getRuns(): Promise<Run[]> {
  const raw = await AsyncStorage.getItem(RUNS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Run[];
  } catch {
    return [];
  }
}

export async function updateRun(
  id: string,
  patch: Partial<Run>,
): Promise<void> {
  const runs = await getRuns();
  await AsyncStorage.setItem(
    RUNS_KEY,
    JSON.stringify(runs.map((r) => (r.id === id ? { ...r, ...patch } : r))),
  );
}

export async function deleteRun(id: string): Promise<void> {
  const runs = await getRuns();
  await AsyncStorage.setItem(
    RUNS_KEY,
    JSON.stringify(runs.filter((r) => r.id !== id)),
  );
}

