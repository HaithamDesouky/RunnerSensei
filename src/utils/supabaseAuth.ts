import supabase from "./supabaseClient";

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function sendPasswordReset(email: string, redirectTo?: string) {
  const opts = redirectTo ? { redirectTo } : undefined;
  // Supabase v2 method
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, opts as any);
  if (error) throw error;
  return data;
}

export function getCurrentUser() {
  return supabase.auth.getUser();
}

export async function updateProfile(
  profile: Partial<{
    username: string;
    avatar_url: string;
    xp: number;
    level: number;
    current_streak: number;
    last_run: string;
    total_runs: number;
  }>,
) {
  const userRes = await supabase.auth.getUser();
  if (userRes.error || !userRes.data.user)
    throw userRes.error || new Error("No user");
  const userId = userRes.data.user.id;
  const { data, error } = await supabase
    .from("profiles")
    .upsert({ id: userId, ...profile });
  if (error) throw error;
  return data;
}

