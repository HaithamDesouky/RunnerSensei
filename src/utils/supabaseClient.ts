import Constants from "expo-constants";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Expect SUPABASE_URL and SUPABASE_ANON_KEY in environment or app config extra
const getEnv = () => {
  // Expo: set via app.config.js -> extra
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
);

export default supabase;

