import type { AdminPayout, Earnings, RoyaltyRun } from "../types";
import { saveBlob } from "../utils/download";
import { api, BASE, tokenStore } from "./http";

/** Royalty service: earnings, statements and payouts (ROY-01 to ROY-04). */

/** Who the money is for: an artist, or a label / management company. */
export type Beneficiary = { type: "ARTIST" | "ORG"; id: string };

export type PayoutMethodInput = { method: "MOBILE_MONEY" | "BANK"; account: string; holderName: string };

const beneficiaryQuery = (b: Beneficiary) => `beneficiaryType=${b.type}&beneficiaryId=${b.id}`;

export const getEarnings = (beneficiary: Beneficiary) => api<Earnings>(`/earnings?${beneficiaryQuery(beneficiary)}`);

export const statementUrl = (beneficiary: Beneficiary, period?: string) =>
  `${BASE}/earnings/statement.csv?${beneficiaryQuery(beneficiary)}${period ? `&period=${period}` : ""}`;

/** The CSV route needs the bearer token, so it is fetched and saved as a blob. */
export async function downloadStatement(beneficiary: Beneficiary, period?: string) {
  const response = await fetch(statementUrl(beneficiary, period), {
    headers: { authorization: `Bearer ${tokenStore.get() ?? ""}` },
    credentials: "include",
  });
  if (!response.ok) throw new Error("Statement download failed");
  saveBlob(await response.blob(), `monkii-statement-${period ?? "all"}.csv`);
}

export const savePayoutMethod = (beneficiary: Beneficiary, body: PayoutMethodInput) =>
  api("/earnings/payout-method", { method: "PUT", body: { beneficiaryType: beneficiary.type, beneficiaryId: beneficiary.id, ...body } });

export const requestPayout = (beneficiary: Beneficiary, amountXaf: number) =>
  api("/payouts", { method: "POST", body: { beneficiaryType: beneficiary.type, beneficiaryId: beneficiary.id, amountXaf } });

// ---------------------------------------------------------------- administration (ROY-01, ROY-02, ROY-04)

export const getRoyaltyRuns = () => api<RoyaltyRun[]>("/admin/royalties/runs");

export const getRoyaltyRun = (runId: string | null) => api<RoyaltyRun>(`/admin/royalties/runs/${runId}`);

/** Computes a draft run for the month (YYYY-MM); nothing is paid until it is approved. */
export const computeRoyaltyRun = (period: string) => api<RoyaltyRun>("/admin/royalties/runs", { method: "POST", body: { period } });

export const approveRoyaltyRun = (runId: string) => api(`/admin/royalties/runs/${runId}/approve`, { method: "POST" });

export const getAdminPayouts = (status: AdminPayout["status"]) => api<AdminPayout[]>(`/admin/payouts?status=${status}`);

/** Pays the payout (mobile money transfer), or rejects it with a note for the beneficiary. */
export const decidePayout = (payoutId: string, approve: boolean, note?: string) =>
  api<{ status: AdminPayout["status"] }>(`/admin/payouts/${payoutId}/${approve ? "approve" : "reject"}`, {
    method: "POST",
    body: approve ? undefined : { note },
  });
