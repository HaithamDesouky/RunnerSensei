import React, { createContext, useContext, useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import supabase from "../utils/supabaseClient";
import * as authHelpers from "../utils/supabaseAuth";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TEST_USER = { id: "test-user-1", email: "test@example.com" } as User;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const isTestMode = typeof window !== "undefined" && (window as any).__TEST_MODE__;
  const [user, setUser] = useState<User | null>(isTestMode ? TEST_USER : null);
  const [loading, setLoading] = useState(!isTestMode);

  useEffect(() => {
    if (isTestMode) return;
    let mounted = true;
    (async () => {
      try {
        const res = await supabase.auth.getUser();
        if (mounted) setUser(res.data.user ?? null);
      } catch (e) {
        console.warn("auth getUser failed", e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) setUser(session.user);
      else setUser(null);
    });

    return () => {
      mounted = false;
      sub?.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    await authHelpers.signIn(email, password);
    const res = await supabase.auth.getUser();
    setUser(res.data.user ?? null);
  };

  const signUp = async (email: string, password: string) => {
    const data = await authHelpers.signUp(email, password);
    const res = await supabase.auth.getUser();
    setUser(res.data.user ?? null);
    return { data, user: res.data.user ?? null };
  };

  const signOut = async () => {
    await authHelpers.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export default AuthContext;

