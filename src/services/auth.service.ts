import type { Page, Session, SessionUser } from "../types";
import { api, refreshSession } from "./http";

/** Auth service: sign-in, sign-up, email links, account type (AUTH-*, ACC-*), user moderation (ADM-01). */

export interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
  accountType: SessionUser["accountType"];
  demographics: {
    birthDate: string;
    gender: string;
    country: string;
    region: string;
    city?: string | null;
    language: "en" | "fr";
  };
  acceptTerms: true;
}

export interface AuthProviders {
  google: { clientId: string } | null;
}

// ---------------------------------------------------------------- session

export const login = (email: string, password: string) =>
  api<Session>("/auth/login", { method: "POST", body: { email, password } });

export const register = (input: RegisterInput) => api<Session>("/auth/register", { method: "POST", body: input });

/** AUTH-09: signs in (or up) with a Google ID token. */
export const loginWithGoogle = (credential: string) =>
  api<Session & { isNew: boolean }>("/auth/google", { method: "POST", body: { credential } });

export const logout = () => api("/auth/logout", { method: "POST" });

/** Signs out every device, then re-reads this tab's session so the app sees the result. */
export async function logoutEverywhere() {
  await api("/auth/logout-all", { method: "POST" });
  await refreshSession();
}

export const getAuthProviders = () => api<AuthProviders>("/auth/providers");

// ---------------------------------------------------------------- email links

export const verifyEmail = (token: string) => api("/auth/verify-email", { method: "POST", body: { token } });

export const resendVerification = (language: string) =>
  api("/auth/resend-verification", { method: "POST", body: { language } });

export const forgotPassword = (email: string, language: "en" | "fr") =>
  api("/auth/forgot-password", { method: "POST", body: { email, language } });

export const resetPassword = (token: string, password: string) =>
  api("/auth/reset-password", { method: "POST", body: { token, password } });

// ---------------------------------------------------------------- account

export const changeAccountType = (accountType: SessionUser["accountType"]) =>
  api("/auth/account-type", { method: "PATCH", body: { accountType } });

export const deleteAccount = (password: string) => api("/auth/account", { method: "DELETE", body: { password } });

// ---------------------------------------------------------------- administration (ADM-01)

export interface AdminUser {
  id: string;
  email: string;
  accountType: string;
  isAdmin: boolean;
  emailVerified: boolean;
  status: "ACTIVE" | "SUSPENDED" | "PENDING_DELETION";
  createdAt: string;
}

export const getAdminUsers = (query: string) =>
  api<Page<AdminUser>>(`/admin/users?pageSize=50${query ? `&search=${encodeURIComponent(query)}` : ""}`);

/** Suspends an active user, or lifts the suspension. */
export const toggleUserSuspension = (user: AdminUser) =>
  api(`/admin/users/${user.id}/${user.status === "SUSPENDED" ? "unsuspend" : "suspend"}`, { method: "POST" });
