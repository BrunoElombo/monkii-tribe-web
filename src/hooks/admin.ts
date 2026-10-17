import { useQuery } from "@tanstack/react-query";
import { getAdminUsers } from "../services/auth.service";
import { getAdminOrders, getLedger, getPlatformSettings } from "../services/payment.service";
import { getAdminPayouts, getRoyaltyRun, getRoyaltyRuns } from "../services/royalty.service";
import { getAdminArtists } from "../services/user.service";
import type { AdminPayout } from "../types";

/**
 * Administration console (ADM-01, ADM-03). Every key starts with "admin";
 * the review queue lives with the catalog hooks (useReviewQueue).
 */

export const useAdminUsers = (query: string) => useQuery({ queryKey: ["admin", "users", query], queryFn: () => getAdminUsers(query) });

export const useAdminArtists = (query: string) => useQuery({ queryKey: ["admin", "artists", query], queryFn: () => getAdminArtists(query) });

export const usePlatformSettings = () => useQuery({ queryKey: ["admin", "settings"], queryFn: getPlatformSettings });

export const useRoyaltyRuns = () => useQuery({ queryKey: ["admin", "runs"], queryFn: getRoyaltyRuns });

export const useRoyaltyRun = (runId: string | null) =>
  useQuery({ queryKey: ["admin", "runs", runId], queryFn: () => getRoyaltyRun(runId), enabled: Boolean(runId) });

export const useAdminPayouts = (status: AdminPayout["status"]) =>
  useQuery({ queryKey: ["admin", "payouts", status], queryFn: () => getAdminPayouts(status) });

export const useAdminOrders = () => useQuery({ queryKey: ["admin", "orders"], queryFn: getAdminOrders });

export const useLedger = () => useQuery({ queryKey: ["admin", "ledger"], queryFn: getLedger });
