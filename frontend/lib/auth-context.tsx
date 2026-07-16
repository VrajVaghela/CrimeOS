"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { clearStoredToken, getMe, getStoredToken, login, setStoredToken } from "@/lib/api";
import type { UserOut } from "@/lib/types";

interface AuthContextValue {
  user: UserOut | null;
  loading: boolean;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserOut | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function restore() {
      if (!getStoredToken()) {
        setLoading(false);
        return;
      }
      try {
        setUser(await getMe());
      } catch {
        clearStoredToken();
      } finally {
        setLoading(false);
      }
    }
    void restore();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      signIn: async (username: string, password: string) => {
        const token = await login(username, password);
        setStoredToken(token.access_token);
        setUser(await getMe());
      },
      signOut: () => {
        clearStoredToken();
        setUser(null);
      },
    }),
    [loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
