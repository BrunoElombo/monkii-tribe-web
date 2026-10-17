import type { EventDetails, EventSummary, EventType, Page, StudioEventRow, Ticket } from "../types";
import { api } from "./http";

/** Event service: events, ticket tiers, reservations and door check-in (EVT-01 to EVT-08). */

export interface Attendees {
  total: number;
  checkedIn: number;
  tickets: { id: string; code: string; holderName: string; tier: string; status: string; checkedInAt: string | null }[];
}

export type CheckInResult = { ok: true; code: string; holderName: string; tier: string } | { ok: false; code: string; checkedInAt: string | null };

export interface NewEventInput {
  artistId: string;
  title: string;
  type: EventType;
  startsAt: string;
  city: string;
  region: string;
  country: string;
}

export interface EventInput {
  title: string;
  type: EventType;
  startsAt?: string;
  endsAt: string | null;
  venueName: string | null;
  address: string | null;
  city: string;
  region: string;
  country: string;
  streamUrl: string | null;
  ageRestriction: number | null;
  description: string | null;
  descriptionFr: string | null;
  lineupArtistIds: string[];
}

export interface TierInput {
  name: string;
  description: string | null;
  priceXaf: number;
  quantity: number;
  perOrderLimit: number;
  salesStartAt: string | null;
  salesEndAt: string | null;
  sortOrder: number;
}

// ---------------------------------------------------------------- listener side

/** `params` holds pageSize and the filters (country, city, artistId, when). */
export const getEvents = (params: URLSearchParams) => api<Page<EventSummary>>(`/events?${params}`);

export const getEvent = (eventId: string) => api<EventDetails>(`/events/${eventId}`);

/** Page view beacon for the organiser's statistics (ANA-05). */
export const recordEventView = (eventId: string, body: { visitorId: string; source: string }) =>
  api(`/events/${eventId}/view`, { method: "POST", body });

/** Marks the event as interesting, or removes the mark when `interested` (the current state) is true. */
export const toggleInterest = (eventId: string, interested: boolean | undefined) =>
  api(`/events/${eventId}/interest`, { method: interested ? "DELETE" : "PUT" });

/** Free tiers only: paid tickets go through the payment service's checkout. */
export const reserveTickets = (eventId: string, tierId: string | null, quantity: number) =>
  api(`/events/${eventId}/tickets`, { method: "POST", body: { tierId, quantity } });

export const getMyTickets = () => api<Ticket[]>("/tickets/me");

// ---------------------------------------------------------------- studio side

export const getStudioEvents = (artistId: string) => api<StudioEventRow[]>(`/studio/events?artistId=${artistId}`);

export const getStudioEvent = (eventId: string) => api<EventDetails>(`/studio/events/${eventId}`);

export const createEvent = (body: NewEventInput) => api<{ id: string }>("/events", { method: "POST", body });

export const updateEvent = (eventId: string, body: EventInput) => api(`/events/${eventId}`, { method: "PATCH", body });

export const setEventCover = (eventId: string, assetId: string) => api(`/events/${eventId}/cover`, { method: "PUT", body: { assetId } });

export const publishEvent = (eventId: string) => api(`/events/${eventId}/publish`, { method: "POST" });

export const cancelEvent = (eventId: string, reason: string) => api(`/events/${eventId}/cancel`, { method: "POST", body: { reason } });

export const deleteEvent = (eventId: string) => api(`/events/${eventId}`, { method: "DELETE" });

export const addTier = (eventId: string, body: TierInput) => api(`/events/${eventId}/tiers`, { method: "POST", body });

export const deleteTier = (tierId: string) => api(`/tiers/${tierId}`, { method: "DELETE" });

// ---------------------------------------------------------------- door (EVT-05)

export const getAttendees = (eventId: string) => api<Attendees>(`/events/${eventId}/attendees`);

export const checkIn = (eventId: string, code: string) => api<CheckInResult>(`/events/${eventId}/check-in`, { method: "POST", body: { code } });
