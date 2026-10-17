/** Earnings, payouts and royalty runs (royalty service). */

export type EarningSource = "STREAMS" | "SALES" | "TICKETS";

export interface Payout {
  id: string;
  amountXaf: number;
  method: "MOBILE_MONEY" | "BANK";
  account: string;
  /** PROCESSING: approved, the mobile money transfer is not confirmed yet */
  status: "REQUESTED" | "PROCESSING" | "PAID" | "REJECTED" | "FAILED";
  note: string | null;
  createdAt: string;
  decidedAt: string | null;
}

export interface Earnings {
  beneficiary: { type: "ARTIST" | "ORG"; id: string };
  earnedXaf: number;
  paidXaf: number;
  pendingXaf: number;
  availableXaf: number;
  thresholdXaf: number;
  totals: Record<EarningSource, number>;
  months: ({ period: string; total: number } & Record<EarningSource, number>)[];
  lines: { id: string; period: string; source: EarningSource; artist: string | null; description: string; grossXaf: number; amountXaf: number; createdAt: string }[];
  payouts: Payout[];
  payoutMethod: { method: Payout["method"]; account: string; holderName: string } | null;
}

export interface RoyaltyRun {
  id: string;
  period: string;
  status: "DRAFT" | "APPROVED";
  grossXaf: number;
  netRevenueXaf: number;
  poolXaf: number;
  totalPlays: number;
  createdAt: string;
  approvedAt: string | null;
  lines?: { artistId: string; artist: string; plays: number; amountXaf: number }[];
}

export interface AdminPayout extends Omit<Payout, "note" | "decidedAt"> {
  beneficiaryType: "ARTIST" | "ORG";
  beneficiaryId: string;
  beneficiaryName: string;
  holderName: string;
}
