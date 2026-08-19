import { getRuns } from "./runStorage";
import {
  resetUser,
  addBadge,
  addXp,
  updateStreakWithRunDate,
  incrementWeeklyRun,
  getUser,
} from "./userStorage";
import { Run } from "../types";

export async function recomputeUserFromRuns(): Promise<
  ReturnType<typeof getUser>
> {
  await resetUser();
  const runs = await getRuns();

  const ordered = runs
    .slice()
    .sort((a: Run, b: Run) => a.date.localeCompare(b.date));

  let maxDistance = 0;
  let bestPace: number | null = null;

  for (const run of ordered) {
    const distanceKm = (run.distanceMeters || 0) / 1000;
    let xp = Math.round(distanceKm * 10);

    const MILESTONES = [1, 2, 3, 5, 8, 10, 12, 15, 20, 25, 30];
    for (const m of MILESTONES) {
      if (distanceKm >= m) {
        await addBadge(`${m}K Club`);
      }
    }

    if ((run.distanceMeters || 0) > maxDistance) {
      xp += 50;
      await addBadge("PR Distance");
      maxDistance = run.distanceMeters || 0;
    }

    const pace =
      run.durationMs && run.distanceMeters
        ? run.durationMs / 60000 / (run.distanceMeters / 1000)
        : null;
    if (pace !== null) {
      if (bestPace === null || pace < bestPace) {
        if (bestPace !== null) {
          xp += 50;
          await addBadge("PR Pace");
        }
        bestPace = pace;
      }
    }

    const { bonusXp: streakXp, awardedBadge: streakBadge } =
      await updateStreakWithRunDate(run.date);
    xp += streakXp;
    if (streakBadge) await addBadge(streakBadge);

    const { awardedBadge: weekBadge, bonusXp: weekXp } =
      await incrementWeeklyRun(run.date);
    xp += weekXp;
    if (weekBadge) await addBadge(weekBadge);

    await addXp(xp);
  }

  return getUser();
}

