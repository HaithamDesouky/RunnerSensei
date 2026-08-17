import { Run } from "../types";

export type Intensity = "Rest" | "Easy" | "Moderate" | "Strong";

export interface SenseiSuggestion {
  targetDistanceKm: number;
  intensity: Intensity;
  estimatedDurationMin: number;
  message: string;
  warnings: string[];
}

// Keywords that signal the runner should back off
const INJURY_KEYWORDS = [
  "pain",
  "hurt",
  "injury",
  "injured",
  "knee",
  "shin",
  "ankle",
  "hip",
  "blister",
  "sprain",
  "strain",
  "swollen",
  "pulled",
  "stress fracture",
];
const FATIGUE_KEYWORDS = [
  "exhausted",
  "tired",
  "dead",
  "drained",
  "heavy legs",
  "heavy",
  "burnt out",
  "burnout",
  "wiped",
  "sluggish",
  "sore",
  "aching",
  "stiff",
];
const GREAT_KEYWORDS = [
  "great",
  "amazing",
  "energized",
  "strong",
  "fantastic",
  "excellent",
  "good",
  "motivated",
  "fresh",
  "ready",
  "pumped",
  "excited",
];

function detectFlags(feeling: string): {
  injury: boolean;
  fatigued: boolean;
  great: boolean;
} {
  const lower = feeling.toLowerCase();
  return {
    injury: INJURY_KEYWORDS.some((w) => lower.includes(w)),
    fatigued: FATIGUE_KEYWORDS.some((w) => lower.includes(w)),
    great: GREAT_KEYWORDS.some((w) => lower.includes(w)),
  };
}

function avgDistanceKm(runs: Run[]): number {
  if (runs.length === 0) return 3; // sensible default for new runners
  const total = runs.reduce((s, r) => s + r.distanceMeters / 1000, 0);
  return total / runs.length;
}

function avgPaceMinPerKm(runs: Run[]): number {
  const valid = runs.filter((r) => r.distanceMeters > 100 && r.durationMs > 0);
  if (valid.length === 0) return 7; // default 7 min/km
  const paces = valid.map(
    (r) => r.durationMs / 1000 / 60 / (r.distanceMeters / 1000),
  );
  return paces.reduce((a, b) => a + b, 0) / paces.length;
}

/** Returns the most recent N runs sorted newest-first. */
function recentRuns(runs: Run[], n: number): Run[] {
  return [...runs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, n);
}

/** Days since the most recent run (0 = today). Returns null if no runs. */
function daysSinceLastRun(runs: Run[]): number | null {
  if (runs.length === 0) return null;
  const latest = recentRuns(runs, 1)[0];
  const ms = Date.now() - new Date(latest.date).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export function generateSuggestion(
  runs: Run[],
  feeling: string,
): SenseiSuggestion {
  const recent5 = recentRuns(runs, 5);
  const flags = detectFlags(feeling);
  const warnings: string[] = [];

  if (flags.injury)
    warnings.push("Possible injury detected — listen to your body.");
  if (flags.fatigued)
    warnings.push("Signs of fatigue — recovery is part of training.");

  const baseDistKm = avgDistanceKm(recent5);
  const basePace = avgPaceMinPerKm(recent5);
  const daysSince = daysSinceLastRun(runs);

  // Determine intensity multiplier from feeling + rest days
  let intensity: Intensity;
  let distMultiplier: number;
  let paceMultiplier: number; // >1 = slower

  if (flags.injury) {
    // Possible injury → rest or very easy
    intensity = "Rest";
    distMultiplier = 0;
    paceMultiplier = 1.2;
  } else if (flags.fatigued) {
    intensity = "Easy";
    distMultiplier = 0.6;
    paceMultiplier = 1.15;
  } else if (flags.great) {
    // Feeling strong + well rested → push a bit
    const wellRested = daysSince !== null && daysSince >= 1;
    intensity = wellRested ? "Strong" : "Moderate";
    distMultiplier = wellRested ? 1.15 : 1.05;
    paceMultiplier = 0.95;
  } else {
    // Neutral
    intensity = daysSince !== null && daysSince >= 2 ? "Moderate" : "Easy";
    distMultiplier = daysSince !== null && daysSince >= 2 ? 1.0 : 0.8;
    paceMultiplier = 1.0;
  }

  // Apply 10% rule cap on new runners (first 5 runs) — don't exceed 3.5 km
  const cappedBase = runs.length < 5 ? Math.min(baseDistKm, 3.5) : baseDistKm;
  const targetDistanceKm = Math.max(
    0,
    Math.round(cappedBase * distMultiplier * 10) / 10,
  );
  const estimatedDurationMin =
    targetDistanceKm > 0
      ? Math.round(targetDistanceKm * basePace * paceMultiplier)
      : 0;

  const message = buildMessage(
    intensity,
    targetDistanceKm,
    estimatedDurationMin,
    daysSince,
    runs.length,
    flags,
    feeling,
  );

  return {
    targetDistanceKm,
    intensity,
    estimatedDurationMin,
    message,
    warnings,
  };
}

function buildMessage(
  intensity: Intensity,
  distKm: number,
  durationMin: number,
  daysSince: number | null,
  totalRuns: number,
  flags: ReturnType<typeof detectFlags>,
  feeling: string,
): string {
  if (intensity === "Rest") {
    return `Your body is telling you something. Take a rest day today — active recovery like a short walk or stretching will do more good than a hard run. Come back stronger tomorrow.`;
  }

  const feelingNote = feeling.trim()
    ? `You mentioned feeling "${feeling.trim()}" — `
    : "";

  if (totalRuns === 0) {
    return `Welcome to your running journey! Start with a comfortable ${distKm} km at a relaxed pace. Walk whenever you need to — there's no shame in run/walk intervals. Build the habit first, speed comes later.`;
  }

  const restNote =
    daysSince === null
      ? ""
      : daysSince === 0
        ? "You ran today already — "
        : daysSince === 1
          ? "You ran yesterday — "
          : `You've had ${daysSince} rest days — `;

  switch (intensity) {
    case "Easy":
      return `${feelingNote}${restNote}keep today easy. Aim for ${distKm} km (~${durationMin} min) at a conversational pace where you can hold a full sentence. Easy runs build aerobic base and speed up recovery.`;
    case "Moderate":
      return `${feelingNote}${restNote}today looks good for a solid ${distKm} km (~${durationMin} min) at a comfortably challenging effort. You should feel like you're working, but not gasping. Stay consistent and trust your pace.`;
    case "Strong":
      return `${feelingNote}${restNote}you're ready to push! Target ${distKm} km (~${durationMin} min) with intention. Negative split if you can — start slightly slower and pick it up in the second half. This is your run.`;
  }
}

