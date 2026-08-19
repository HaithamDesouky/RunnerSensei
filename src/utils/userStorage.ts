import supabase from "./supabaseClient";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface UserProfile {
  xp: number;
  level: number;
  badges: string[];
  currentStreak: number;
  lastRunDate?: string;
  weeklyRuns: Record<string, number>;
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
  if (typeof window !== "undefined" && (window as any).__TEST_PROFILE__) {
    return (window as any).__TEST_PROFILE__ as UserProfile;
  }
  try {
    const userRes = await supabase.auth.getUser();
    if (userRes.error || !userRes.data.user) return { ...DEFAULT_PROFILE };
    const userId = userRes.data.user.id;
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (error) {
      return { ...DEFAULT_PROFILE };
    }
    const p: any = data || {};

    let avatarUri: string | null = null;
    if (p.avatar_url) {
      const val: string = p.avatar_url;
      if (val.startsWith("http://") || val.startsWith("https://")) {
        avatarUri = val;
      } else if (
        val.startsWith("file://") ||
        val.startsWith("content://") ||
        val.startsWith("data:")
      ) {
        avatarUri = val;
      } else {
        try {
          const cacheKey = `avatar_cache_${userId}`;
          const cached = await AsyncStorage.getItem(cacheKey);
          const now = Date.now();
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              if (
                parsed &&
                parsed.signedUrl &&
                parsed.expiresAt &&
                parsed.expiresAt > now
              ) {
                avatarUri = parsed.signedUrl;
              }
            } catch (e) {}
          }
          if (!avatarUri) {
            const TTL_SECONDS = 60 * 60 * 24;
            const { data: signed, error: signErr } = await supabase.storage
              .from("runnersensei")
              .createSignedUrl(val, TTL_SECONDS);
            if (!signErr && signed?.signedUrl) {
              avatarUri = signed.signedUrl;

              const expiresAt = Date.now() + TTL_SECONDS * 1000;
              try {
                await AsyncStorage.setItem(
                  cacheKey,
                  JSON.stringify({ signedUrl: avatarUri, expiresAt }),
                );
              } catch (e) {
                console.warn("failed to cache avatar signed url", e);
              }
            }
          }
        } catch (e) {
          console.warn("failed to create signed url for avatar", e);
        }
      }
    }

    return {
      ...DEFAULT_PROFILE,
      xp: p.xp || 0,
      level: p.level || computeLevel(p.xp || 0),
      badges: p.badges || [],
      currentStreak: p.current_streak || 0,
      lastRunDate: p.last_run ? new Date(p.last_run).toISOString() : undefined,
      weeklyRuns: p.weekly_runs || {},
      totalRuns: p.total_runs || 0,
      avatarUri,
      username: p.username || null,
    };
  } catch (err) {
    console.warn("getUser supabase error", err);
    return { ...DEFAULT_PROFILE };
  }
}

export async function saveUser(u: UserProfile): Promise<UserProfile> {
  try {
    const userRes = await supabase.auth.getUser();
    if (userRes.error || !userRes.data.user)
      throw userRes.error || new Error("No user");
    const userId = userRes.data.user.id;
    const copy = { ...u, level: computeLevel(u.xp) };
    const payload = {
      id: userId,
      xp: copy.xp,
      level: copy.level,
      username: copy.username,
      avatar_url: copy.avatarUri,
      current_streak: copy.currentStreak,
      last_run: copy.lastRunDate || null,
      weekly_runs: copy.weeklyRuns,
      total_runs: copy.totalRuns,
      badges: copy.badges,
    };
    const { data, error } = await supabase.from("profiles").upsert(payload);
    if (error) throw error;
    return copy;
  } catch (err) {
    console.warn("saveUser supabase error", err);
    return u;
  }
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
      bonusXp += 20;
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

