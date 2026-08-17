import AsyncStorage from "@react-native-async-storage/async-storage";

const USER_KEY = "@RunnerSensei:user";

export interface UserProfile {
  xp: number;
  level: number;
  badges: string[];
  currentStreak: number;
  lastRunDate?: string; // ISO
  weeklyRuns: Record<string, number>; // isoWeek -> count
  totalRuns: number;
  avatarUri?: string | null;
  username?: string | null;
}

const DEFAULT_PROFILE: UserProfile = {
  xp: 0,
  level: 1,
  badges: [],
  currentStreak: 0,
  lastRunDate: undefined,
  weeklyRuns: {},
  totalRuns: 0,
  avatarUri: null,
  username: null,
};

function computeLevel(xp: number) {
  return Math.floor(xp / 500) + 1;
}

function getIsoWeekKey(dateIso: string) {
  const d = new Date(dateIso);
  // ISO week algorithm (UTC-based)
  const target = new Date(d.valueOf());
  const dayNr = (d.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const weekNumber =
    1 +
    Math.round(
      (target.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000),
    );
  return `${target.getUTCFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
}

function startOfDayUTC(date: Date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export async function getUser(): Promise<UserProfile> {
  try {
    const raw = await AsyncStorage.getItem(USER_KEY);
    if (!raw) return { ...DEFAULT_PROFILE };
    const parsed = JSON.parse(raw) as UserProfile;
    return {
      ...DEFAULT_PROFILE,
      ...parsed,
      badges: parsed.badges || [],
      weeklyRuns: parsed.weeklyRuns || {},
    };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

export async function saveUser(u: UserProfile): Promise<UserProfile> {
  const copy = { ...u, level: computeLevel(u.xp) };
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(copy));
  return copy;
}

export async function resetUser(): Promise<UserProfile> {
  return saveUser({ ...DEFAULT_PROFILE });
}

export async function addXp(amount: number): Promise<UserProfile> {
  const u = await getUser();
  u.xp = (u.xp || 0) + Math.max(0, Math.round(amount));
  u.level = computeLevel(u.xp);
  return saveUser(u);
}

export async function addBadge(id: string): Promise<UserProfile> {
  const u = await getUser();
  if (!u.badges.includes(id)) {
    u.badges = [id, ...u.badges];
    await saveUser(u);
  }
  return u;
}

export async function setAvatarUri(uri: string | null): Promise<UserProfile> {
  const u = await getUser();
  u.avatarUri = uri;
  return saveUser(u);
}

export async function setUsername(name: string | null): Promise<UserProfile> {
  const u = await getUser();
  u.username = name;
  return saveUser(u);
}

export async function updateStreakWithRunDate(runDateIso: string): Promise<{
  newStreak: number;
  bonusXp: number;
  awardedBadge?: string | null;
}> {
  const u = await getUser();
  const last = u.lastRunDate ? new Date(u.lastRunDate) : null;
  const current = new Date(runDateIso);
  let newStreak = 1;
  let bonusXp = 0;
  let awardedBadge: string | null = null;

  if (last) {
    const lastStart = startOfDayUTC(last);
    const currStart = startOfDayUTC(current);
    const diffDays = Math.round(
      (currStart - lastStart) / (24 * 60 * 60 * 1000),
    );
    if (diffDays === 1) {
      newStreak = (u.currentStreak || 0) + 1;
      bonusXp += 20; // daily streak bonus
    } else if (diffDays > 1) {
      newStreak = 1;
    } else if (diffDays === 0) {
      newStreak = u.currentStreak || 1;
    } else {
      newStreak = 1;
    }
  } else {
    newStreak = 1;
    bonusXp += 20;
    awardedBadge = "First Run";
  }

  if (newStreak >= 7 && (u.currentStreak || 0) < 7) {
    bonusXp += 200;
    awardedBadge = "Streak 7 Days";
  }

  u.currentStreak = newStreak;
  u.lastRunDate = runDateIso;
  await saveUser(u);

  return { newStreak, bonusXp, awardedBadge };
}

export async function incrementWeeklyRun(runDateIso: string): Promise<{
  count: number;
  awardedBadge?: string | null;
  bonusXp: number;
}> {
  const u = await getUser();
  const key = getIsoWeekKey(runDateIso);
  u.weeklyRuns = { ...(u.weeklyRuns || {}) };
  const before = u.weeklyRuns[key] || 0;
  u.weeklyRuns[key] = before + 1;
  u.totalRuns = (u.totalRuns || 0) + 1;

  let bonusXp = 0;
  let awardedBadge: string | null = null;
  const now = u.weeklyRuns[key];

  if (now === 3) {
    bonusXp += 20;
    awardedBadge = "Weekly Warrior (3)";
  } else if (now === 5) {
    bonusXp += 50;
    awardedBadge = "Weekly Warrior (5)";
  }

  await saveUser(u);
  return { count: u.weeklyRuns[key], awardedBadge, bonusXp };
}

