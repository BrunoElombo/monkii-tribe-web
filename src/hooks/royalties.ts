import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as royalties from "../services/royalty.service";
import type { Beneficiary, PayoutMethodInput } from "../services/royalty.service";

/** Earnings and payouts of an artist or an organisation (ROY-03, ROY-04). */

export const useEarnings = (beneficiary: Beneficiary) =>
  useQuery({
    queryKey: ["earnings", beneficiary.type, beneficiary.id],
    queryFn: () => royalties.getEarnings(beneficiary),
    retry: false,
  });

export function useSavePayoutMethod(beneficiary: Beneficiary) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: PayoutMethodInput) => royalties.savePayoutMethod(beneficiary, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["earnings", beneficiary.type, beneficiary.id] }),
  });
}

export function useRequestPayout(beneficiary: Beneficiary) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (amountXaf: number) => royalties.requestPayout(beneficiary, amountXaf),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["earnings", beneficiary.type, beneficiary.id] }),
  });
}
