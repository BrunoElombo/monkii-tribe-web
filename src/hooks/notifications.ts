import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthProvider";
import * as notifications from "../services/notification.service";

/** The bell (NOT-02) and web push preferences (NOT-03). */

export function useNotifications() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["notifications"],
    queryFn: notifications.getNotifications,
    enabled: Boolean(user),
    refetchInterval: 60_000,
  });
}

export const usePushPreferences = () => useQuery({ queryKey: ["push", "preferences"], queryFn: notifications.getPushPreferences });
