import type { CheckoutRequest, Order, PlatformSettings, Pricing, Subscription } from "../types";
import { api } from "./http";

/**
 * Payment service: Premium, purchases and platform settings (PAY-01 to PAY-06, ADM-03).
 * Every payment goes through the provider's page: we create the order, then
 * send the browser to the returned URL.
 */

export interface CheckoutStarted {
  orderId: string;
  redirectUrl: string;
}

export interface LedgerBalance {
  account: string;
  /** Debit minus credit */
  balanceXaf: number;
}

export const getPricing = () => api<Pricing>("/payments/pricing");

export const getSubscription = () => api<Subscription>("/payments/subscription");

export const cancelSubscription = () => api<Subscription>("/payments/subscription/cancel", { method: "POST" });

export const checkout = (request: CheckoutRequest) => api<CheckoutStarted>("/payments/checkout", { method: "POST", body: request });

export const getOrder = (orderId: string) => api<Order>(`/payments/orders/${orderId}`);

export const getMyOrders = () => api<Order[]>("/payments/orders/me");

// ---------------------------------------------------------------- administration (ADM-03)

export const getPlatformSettings = () => api<PlatformSettings>("/admin/settings");

/** Rates are fractions (0.1925), amounts whole XAF. */
export const updatePlatformSettings = (settings: Record<string, number>) =>
  api<PlatformSettings>("/admin/settings", { method: "PUT", body: settings });

export const getAdminOrders = () => api<(Order & { email: string })[]>("/admin/orders");

export const getLedger = () => api<LedgerBalance[]>("/admin/ledger");
