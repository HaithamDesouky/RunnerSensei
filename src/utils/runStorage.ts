import AsyncStorage from "@react-native-async-storage/async-storage";
import { Run } from "../types";

const RUNS_KEY = "@RunnerSensei:runs";

export async function saveRun(run: Run): Promise<void> {
  const existing = await getRuns();
  await AsyncStorage.setItem(RUNS_KEY, JSON.stringify([run, ...existing]));
}

export async function getRuns(): Promise<Run[]> {
  const raw = await AsyncStorage.getItem(RUNS_KEY);
  if (!raw) {
    // Seed a few starter runs (2-3 km) with varied paces (9-15 min/km)
    const now = Date.now();
    const seeded: Run[] = [0, 1, 2].map((i) => {
      const distanceKm = +(2 + Math.random() * 1).toFixed(2); // 2.00 - 3.00
      const paceMinPerKm = 9 + Math.random() * 6; // 9 - 15 min/km
      const durationMin = Math.round(distanceKm * paceMinPerKm);
      return {
        id: `seed-${now - i}`,
        date: new Date(now - (i + 1) * 24 * 60 * 60 * 1000).toISOString(),
        points: [],
        distanceMeters: Math.round(distanceKm * 1000),
        durationMs: durationMin * 60 * 1000,
        notes: undefined,
        preRunNote: undefined,
      } as Run;
    });
    await AsyncStorage.setItem(RUNS_KEY, JSON.stringify(seeded));
    return seeded;
  }

  try {
    const parsed = JSON.parse(raw) as Run[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
      // If storage contains an empty array, seed runs as well
      const now = Date.now();
      const seeded: Run[] = [0, 1, 2].map((i) => {
        const distanceKm = +(2 + Math.random() * 1).toFixed(2);
        const paceMinPerKm = 9 + Math.random() * 6;
        const durationMin = Math.round(distanceKm * paceMinPerKm);
        return {
          id: `seed-${now - i}`,
          date: new Date(now - (i + 1) * 24 * 60 * 60 * 1000).toISOString(),
          points: [],
          distanceMeters: Math.round(distanceKm * 1000),
          durationMs: durationMin * 60 * 1000,
          notes: undefined,
          preRunNote: undefined,
        } as Run;
      });
      await AsyncStorage.setItem(RUNS_KEY, JSON.stringify(seeded));
      return seeded;
    }
    return parsed;
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

