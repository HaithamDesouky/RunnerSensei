import { Run } from "../types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  addXp,
  addBadge,
  updateStreakWithRunDate,
  incrementWeeklyRun,
} from "./userStorage";
import { saveRun as dbSaveRun, getRuns as dbGetRuns } from "./supabaseRuns";

function avgPaceMinPerKmForRun(r: Run) {
  if (!r.distanceMeters || r.distanceMeters <= 0) return null;
  const minutes = r.durationMs / 60000;
  const km = r.distanceMeters / 1000;
  return minutes / km;
}

export async function saveRun(run: Run): Promise<void> {
  try {
    const existing = await getRuns();

    const dbRun = {
      distance_km: (run.distanceMeters || 0) / 1000,
      duration_sec: Math.round((run.durationMs || 0) / 1000),
      avg_pace: null,
      path: (run.points || []).map((p) => ({
        lat: p.latitude,
        lon: p.longitude,
        ts: new Date(p.timestamp).toISOString(),
      })),
      notes: run.notes || run.preRunNote || null,
    };
    await dbSaveRun(dbRun as any);

    const distanceKm = (run.distanceMeters || 0) / 1000;
    let totalXp = Math.round(distanceKm * 10);

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

const RUNS_KEY = "runs_v1";

export async function getRuns(): Promise<Run[]> {
  try {
    const dbRows: any[] = await dbGetRuns();
    if (!dbRows || !Array.isArray(dbRows) || dbRows.length === 0) {
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
      return seeded;
    }

    const mapped: Run[] = dbRows.map((r: any) => {
      return {
        id: r.id,
        date: r.created_at || new Date().toISOString(),
        points: Array.isArray(r.path)
          ? r.path.map((p: any) => ({
              latitude: p.lat,
              longitude: p.lon,
              timestamp: Date.parse(p.ts),
            }))
          : [],
        distanceMeters: Number(r.distance_km || 0) * 1000,
        durationMs: Number(r.duration_sec || 0) * 1000,
        notes: r.notes || undefined,
        preRunNote: undefined,
      } as Run;
    });
    return mapped;
  } catch (e) {
    console.warn("getRuns supabase error", e);
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

