import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthProvider";
import * as payments from "../services/payment.service";
import type { CheckoutRequest } from "../types";

/**
 * Premium and purchases. Every payment goes through the provider's page:
 * we create the order, then send the browser to the returned URL. The
 * provider brings the user back to /checkout/result?order=… afterwards.
 */

export const usePricing = () => useQuery({ queryKey: ["pricing"], queryFn: payments.getPricing, staleTime: 5 * 60_000 });

export function useSubscription() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["subscription", user?.id],
    queryFn: payments.getSubscription,
    enabled: Boolean(user),
    staleTime: 60_000,
  });
}

/** True while the signed-in listener has Premium (best quality, offline). */
export function useIsPremium(): boolean {
  return Boolean(useSubscription().data?.active);
}

export function useCheckout() {
  return useMutation({
    mutationFn: (request: CheckoutRequest) => payments.checkout(request),
    onSuccess: ({ redirectUrl }) => {
      window.location.assign(redirectUrl);
    },
  });
}

export const useOrder = (orderId: string, poll: boolean) =>
  useQuery({
    queryKey: ["orders", orderId],
    queryFn: () => payments.getOrder(orderId),
    enabled: Boolean(orderId),
    // The provider's callback can take a few seconds after the redirect
    refetchInterval: (query) => (poll && query.state.data?.status === "PENDING" ? 2000 : false),
  });

export function useMyOrders() {
  const { user } = useAuth();
  return useQuery({ queryKey: ["orders", "mine"], queryFn: payments.getMyOrders, enabled: Boolean(user) });
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: payments.cancelSubscription,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["subscription"] }),
  });
}
