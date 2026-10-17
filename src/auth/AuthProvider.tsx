import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import * as auth from "../services/auth.service";
import type { RegisterInput } from "../services/auth.service";
import { refreshSession, tokenStore } from "../services/http";
import type { SessionUser } from "../types";

interface AuthContextValue {
  user: SessionUser | null;
  /** True until we know whether a refresh cookie gives us a session */
  initialising: boolean;
  login(email: string, password: string): Promise<SessionUser>;
  register(input: RegisterInput): Promise<SessionUser>;
  /** AUTH-09: signs in (or up) with a Google ID token */
  loginWithGoogle(credential: string): Promise<{ user: SessionUser; isNew: boolean }>;
  logout(): Promise<void>;
  /** Re-reads the session (after email verification or an account upgrade) */
  reload(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [initialising, setInitialising] = useState(true);

  // Keep React state in sync with the token store (refreshes happen inside the API client)
  useEffect(() => tokenStore.subscribe((session) => setUser(session?.user ?? null)), []);

  // On start, the httpOnly refresh cookie tells us if the user is signed in
  useEffect(() => {
    refreshSession().finally(() => setInitialising(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const session = await auth.login(email, password);
    tokenStore.set(session);
    queryClient.clear();
    return session.user;
  }, [queryClient]);

  const register = useCallback(async (input: RegisterInput) => {
    const session = await auth.register(input);
    tokenStore.set(session);
    queryClient.clear();
    return session.user;
  }, [queryClient]);

  const loginWithGoogle = useCallback(async (credential: string) => {
    const session = await auth.loginWithGoogle(credential);
    tokenStore.set(session);
    queryClient.clear();
    return { user: session.user, isNew: session.isNew };
  }, [queryClient]);

  const logout = useCallback(async () => {
    await auth.logout().catch(() => undefined);
    tokenStore.set(null);
    queryClient.clear();
  }, [queryClient]);

  const reload = useCallback(async () => {
    await refreshSession();
    await queryClient.invalidateQueries();
  }, [queryClient]);

  const value = useMemo(
    () => ({ user, initialising, login, register, loginWithGoogle, logout, reload }),
    [user, initialising, login, register, loginWithGoogle, logout, reload],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
