import supabase from "./supabaseClient";

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
  const { data, error } = await supabase
    .from("runs")
    .insert([{ user_id: userId, ...run }]);
  if (error) throw error;
  return data;
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
  if (error) throw error;
  return data;
}

