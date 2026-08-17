import AsyncStorage from "@react-native-async-storage/async-storage";
import { Run } from "../types";
import {
  addXp,
  addBadge,
  updateStreakWithRunDate,
  incrementWeeklyRun,
} from "./userStorage";

const RUNS_KEY = "@RunnerSensei:runs";

function avgPaceMinPerKmForRun(r: Run) {
  if (!r.distanceMeters || r.distanceMeters <= 0) return null;
  const minutes = r.durationMs / 60000;
  const km = r.distanceMeters / 1000;
  return minutes / km;
}

export async function saveRun(run: Run): Promise<void> {
  const existing = await getRuns();
  const updated = [run, ...existing];
  await AsyncStorage.setItem(RUNS_KEY, JSON.stringify(updated));

  try {
    const distanceKm = (run.distanceMeters || 0) / 1000;
    let totalXp = Math.round(distanceKm * 10);

    // award km milestone badges
    const MILESTONES = [1, 2, 3, 5, 8, 10, 12, 15, 20, 25, 30];
    for (const m of MILESTONES) {
      if (distanceKm >= m) {
        await addBadge(`${m}K Club`);
      }
    }

    const maxDistance = existing.reduce(
      (m, r) => Math.max(m, r.distanceMeters || 0),
      0,
    );
    if ((run.distanceMeters || 0) > maxDistance) {
      totalXp += 50;
      await addBadge("PR Distance");
    }

    const existingPaces = existing
      .map((r) => avgPaceMinPerKmForRun(r))
      .filter((p): p is number => typeof p === "number" && isFinite(p));
    const bestPace = existingPaces.length ? Math.min(...existingPaces) : null;
    const thisPace = avgPaceMinPerKmForRun(run);
    if (thisPace && bestPace && thisPace < bestPace) {
      totalXp += 50;
      await addBadge("PR Pace");
    }

    const { bonusXp: streakXp, awardedBadge: streakBadge } =
      await updateStreakWithRunDate(run.date);
    totalXp += streakXp;
    if (streakBadge) await addBadge(streakBadge);

    const {
      count: weekCount,
      awardedBadge: weekBadge,
      bonusXp: weekXp,
    } = await incrementWeeklyRun(run.date);
    totalXp += weekXp;
    if (weekBadge) await addBadge(weekBadge);

    await addXp(totalXp);
  } catch (e) {
    console.warn("Error awarding XP/badges:", e);
  }
}

export async function getRuns(): Promise<Run[]> {
  const raw = await AsyncStorage.getItem(RUNS_KEY);
  if (!raw) {
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

  try {
    const parsed = JSON.parse(raw) as Run[];
    if (!Array.isArray(parsed) || parsed.length === 0) {
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

