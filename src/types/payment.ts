/** Premium, orders and platform settings (payment service). */

export interface Pricing {
  currency: "XAF";
  premiumPriceXaf: number;
  suggestedTrackPriceXaf: number;
  suggestedReleasePriceXaf: number;
  payoutThresholdXaf: number;
}

export interface Subscription {
  active: boolean;
  status: "ACTIVE" | "CANCELED" | "EXPIRED" | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  plan: { code: string; name: string; priceXaf: number; intervalDays: number } | null;
}

export type OrderKind = "SUBSCRIPTION" | "MUSIC" | "TICKETS";

export interface Order {
  id: string;
  kind: OrderKind;
  status: "PENDING" | "PAID" | "FAILED" | "EXPIRED" | "REFUNDED";
  totalXaf: number;
  refundedXaf: number;
  failureReason: string | null;
  createdAt: string;
  paidAt: string | null;
  items: { type: "TRACK" | "RELEASE" | "TICKET_TIER" | "PLAN"; refId: string; title: string; unitPriceXaf: number; quantity: number; metadata: Record<string, string> }[];
}

export type CheckoutRequest =
  | { kind: "SUBSCRIPTION"; planCode?: string; phone?: string | null }
  | { kind: "MUSIC"; items: { type: "TRACK" | "RELEASE"; id: string }[]; phone?: string | null }
  | { kind: "TICKETS"; eventId: string; tierId: string; quantity: number; phone?: string | null };

export interface PlatformSettings {
  premiumPriceXaf: number;
  vatRate: number;
  paymentFeeRate: number;
  streamPoolShare: number;
  salesShare: number;
  ticketShare: number;
  payoutThresholdXaf: number;
  suggestedTrackPriceXaf: number;
  suggestedReleasePriceXaf: number;
}
