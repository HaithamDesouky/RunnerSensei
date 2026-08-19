import supabase from "./supabaseClient";
import Constants from "expo-constants";

const getEnv = () => {
  const extras: any =
    Constants.expoConfig?.extra || Constants.manifest?.extra || {};
  return {
    SUPABASE_URL: process.env.SUPABASE_URL || extras.SUPABASE_URL,
    SUPABASE_ANON_KEY:
      process.env.SUPABASE_ANON_KEY || extras.SUPABASE_ANON_KEY,
  };
};

const { SUPABASE_URL, SUPABASE_ANON_KEY } = getEnv();

export type Run = {
  distance_km: number;
  duration_sec: number;
  avg_pace?: number;
  path?: Array<{ lat: number; lon: number; ts: string }>; // or gps points
  notes?: string;
};

export async function saveRun(run: Run) {
  const userRes = await supabase.auth.getUser();
  if (userRes.error || !userRes.data.user)
    throw userRes.error || new Error("No user");
  const userId = userRes.data.user.id;
  // Try normal client insert first
  const { data, error } = await supabase
    .from("runs")
    .insert([{ user_id: userId, ...run }]);
  if (!error) return data;

  // If insert failed due to RLS / permission, try REST fallback using user's access token
  if (error && error.code === "42501") {
    try {
      const sess = await supabase.auth.getSession();
      const accessToken = (sess as any)?.data?.session?.access_token;
      if (!accessToken) throw new Error("No access token for REST fallback");
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY)
        throw new Error("Supabase URL or anon key not configured");

      const resp = await fetch(`${SUPABASE_URL}/rest/v1/runs`, {
        method: "POST",
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify([{ user_id: userId, ...run }]),
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`REST insert failed: ${resp.status} ${text}`);
      }
      const body = await resp.json();
      return body;
    } catch (e) {
      // rethrow original error if fallback also fails
      throw error;
    }
  }

  throw error;
}

export async function getRuns(limit = 50) {
  const userRes = await supabase.auth.getUser();
  if (userRes.error || !userRes.data.user)
    throw userRes.error || new Error("No user");
  const userId = userRes.data.user.id;
  const { data, error } = await supabase
    .from("runs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (!error) return data;

  // fallback: use REST with user's access token
  if (error && error.code === "42501") {
    try {
      const sess = await supabase.auth.getSession();
      const accessToken = (sess as any)?.data?.session?.access_token;
      if (!accessToken) throw new Error("No access token for REST fallback");
      if (!SUPABASE_URL || !SUPABASE_ANON_KEY)
        throw new Error("Supabase URL or anon key not configured");

      const params = new URLSearchParams({
        select: "*",
        order: "created_at.desc",
        limit: String(limit),
        user_id: `eq.${userId}`,
      } as any);
      // Note: PostgREST expects filters as query string like user_id=eq.<id>
      const url = `${SUPABASE_URL}/rest/v1/runs?select=*&user_id=eq.${encodeURIComponent(
        userId,
      )}&order=created_at.desc&limit=${encodeURIComponent(String(limit))}`;
      const resp = await fetch(url, {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`REST get failed: ${resp.status} ${text}`);
      }
      const body = await resp.json();
      return body;
    } catch (e) {
      throw error;
    }
  }

  throw error;
}

