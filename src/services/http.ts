/**
 * Small fetch wrapper for the Monkii Tribe API.
 *  - keeps the access token in memory only (never in localStorage)
 *  - refreshes it once on 401 using the httpOnly refresh cookie, then retries
 *  - turns error responses into ApiError with the server's message
 */
import type { Session } from "../types";

/** Every service is reached through the gateway, on the same origin. */
export const BASE = "/api/v1";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

type SessionListener = (session: Session | null) => void;

let accessToken: string | null = null;
let refreshInFlight: Promise<Session | null> | null = null;
const listeners = new Set<SessionListener>();

export const tokenStore = {
  get: () => accessToken,
  set(session: Session | null) {
    accessToken = session?.accessToken ?? null;
    listeners.forEach((listener) => listener(session));
  },
  subscribe(listener: SessionListener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

/** One refresh at a time, even if ten requests get a 401 together. */
export function refreshSession(): Promise<Session | null> {
  refreshInFlight ??= fetch(`${BASE}/auth/refresh`, { method: "POST", credentials: "include" })
    .then(async (response) => {
      const session = response.ok ? ((await response.json()) as Session) : null;
      tokenStore.set(session);
      return session;
    })
    .catch(() => null)
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  signal?: AbortSignal;
}

export async function api<T>(path: string, options: RequestOptions = {}, retried = false): Promise<T> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers["content-type"] = "application/json";
  if (accessToken) headers.authorization = `Bearer ${accessToken}`;

  const response = await fetch(`${BASE}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    credentials: "include",
    signal: options.signal,
  });

  if (response.status === 401 && accessToken && !retried) {
    const session = await refreshSession();
    if (session) return api<T>(path, options, true);
  }

  return parse<T>(response);
}

async function parse<T>(response: Response): Promise<T> {
  if (response.status === 204 || response.status === 202) return undefined as T;

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const error = data?.error ?? {};
    throw new ApiError(response.status, error.code ?? "UNKNOWN", error.message ?? "Something went wrong", error.details);
  }
  return data as T;
}

/**
 * File upload with progress (fetch cannot report upload progress, XHR can).
 */
export function upload<T>(path: string, file: File, onProgress?: (percent: number) => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${BASE}${path}`);
    xhr.withCredentials = true;
    if (accessToken) xhr.setRequestHeader("authorization", `Bearer ${accessToken}`);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onerror = () => reject(new ApiError(0, "NETWORK", "Upload failed, check your connection"));
    xhr.onload = () => {
      const data = (() => {
        try {
          return JSON.parse(xhr.responseText);
        } catch {
          return null;
        }
      })();
      if (xhr.status >= 200 && xhr.status < 300) resolve(data as T);
      else reject(new ApiError(xhr.status, data?.error?.code ?? "UPLOAD_ERROR", data?.error?.message ?? "Upload failed", data?.error?.details));
    };

    const form = new FormData();
    form.append("file", file);
    xhr.send(form);
  });
}
