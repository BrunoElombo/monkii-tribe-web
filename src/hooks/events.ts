import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthProvider";
import * as events from "../services/event.service";

/** Events and tickets. */

export const useEvents = (filters: { country?: string; city?: string; artistId?: string; when?: "upcoming" | "past" }, enabled = true) => {
  const params = new URLSearchParams({ pageSize: "30" });
  Object.entries(filters).forEach(([key, value]) => value && params.set(key, value));
  return useQuery({ queryKey: ["events", "list", params.toString()], queryFn: () => events.getEvents(params), enabled });
};

export const useEvent = (id: string) => useQuery({ queryKey: ["events", "detail", id], queryFn: () => events.getEvent(id) });

export function useMyTickets() {
  const { user } = useAuth();
  return useQuery({ queryKey: ["events", "tickets"], queryFn: events.getMyTickets, enabled: Boolean(user) });
}

// ---------------------------------------------------------------- studio

export const useStudioEvents = (artistId: string) =>
  useQuery({ queryKey: ["events", "studio", artistId], queryFn: () => events.getStudioEvents(artistId) });

export const useStudioEvent = (id: string) =>
  useQuery({ queryKey: ["events", "studio-detail", id], queryFn: () => events.getStudioEvent(id) });

export const useAttendees = (eventId: string) =>
  useQuery({
    queryKey: ["events", "attendees", eventId],
    queryFn: () => events.getAttendees(eventId),
    refetchInterval: 10_000, // several people may scan at the same door
  });
