import type { NotificationItem, Page } from "../types";
import { api } from "./http";

/**
 * Notification service: the in-app bell (NOT-02) and web push (NOT-03).
 * The service worker shows the push notifications; the functions below ask
 * for permission and register the browser with the notification service.
 */

export type PushCategory = "releases" | "events" | "tickets" | "payments" | "contracts" | "payouts";

/** Push categories on/off, plus how many devices receive them. */
export type PushPreferences = Record<PushCategory, boolean> & { devices: number };

// ---------------------------------------------------------------- in-app

export const getNotifications = () => api<Page<NotificationItem> & { unread: number }>("/notifications?pageSize=30");

export const markAllNotificationsRead = () => api("/notifications/read-all", { method: "POST" });

// ---------------------------------------------------------------- push preferences

export const getPushPreferences = () => api<PushPreferences>("/notifications/push/preferences");

export const updatePushPreferences = (changes: Partial<Record<PushCategory, boolean>>) =>
  api("/notifications/push/preferences", { method: "PUT", body: changes });

// ---------------------------------------------------------------- this browser

export const isPushSupported = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

/** The service worker only exists in production builds (and `vite preview`). */
async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushSupported()) return null;
  const existing = await navigator.serviceWorker.getRegistration();
  return existing ? navigator.serviceWorker.ready : null;
}

export async function currentPushSubscription(): Promise<PushSubscription | null> {
  const reg = await registration();
  return reg ? reg.pushManager.getSubscription() : null;
}

export type EnablePushResult = "enabled" | "denied" | "unsupported";

export async function enablePush(): Promise<EnablePushResult> {
  const reg = await registration();
  if (!reg) return "unsupported";

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "denied";

  const { publicKey } = await api<{ publicKey: string }>("/notifications/push/key");
  const subscription =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(publicKey) }));

  await api("/notifications/push/subscriptions", { method: "POST", body: subscription.toJSON() });
  return "enabled";
}

export async function disablePush() {
  const subscription = await currentPushSubscription();
  if (!subscription) return;
  await api("/notifications/push/unsubscribe", { method: "POST", body: { endpoint: subscription.endpoint } }).catch(() => undefined);
  await subscription.unsubscribe();
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const padded = (value + "=".repeat((4 - (value.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
