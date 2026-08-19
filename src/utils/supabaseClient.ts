import Constants from "expo-constants";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn(
    "Supabase URL or ANON key not set. Set SUPABASE_URL and SUPABASE_ANON_KEY in env or app.config.extra",
  );
}

export const supabase = createClient(
  SUPABASE_URL || "",
  SUPABASE_ANON_KEY || "",
  {
    auth: {
      storage: AsyncStorage,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

export default supabase;

