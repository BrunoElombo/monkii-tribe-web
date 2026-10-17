import type { Problem } from "./common";
import type { ArtistSummary } from "./user";

/** Events, ticket tiers and tickets (event service). */

export type EventType = "CONCERT" | "FESTIVAL" | "SHOWCASE" | "LIVESTREAM" | "MEET_AND_GREET";
export type EventStatus = "DRAFT" | "PUBLISHED" | "CANCELLED" | "ENDED";

export interface EventSummary {
  id: string;
  title: string;
  type: EventType;
  status: EventStatus;
  coverUrl: string | null;
  coverThumbUrl: string | null;
  venueName: string | null;
  city: string;
  region: string;
  country: string;
  startsAt: string;
  endsAt: string | null;
  timezone: string;
  lowestPriceXaf: number | null;
  artist: ArtistSummary;
}

export interface TicketTier {
  id: string;
  name: string;
  description: string | null;
  priceXaf: number;
  currency: string;
  quantity: number;
  sold: number;
  remaining: number;
  onSale: boolean;
  salesStartAt: string | null;
  salesEndAt: string | null;
  perOrderLimit: number;
  sortOrder: number;
}

export interface EventDetails extends EventSummary {
  description: string | null;
  descriptionFr: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  streamUrl: string | null;
  ageRestriction: number | null;
  language: string | null;
  publishedAt: string | null;
  cancelledReason: string | null;
  lineup: ArtistSummary[];
  tiers: TicketTier[];
  isManager: boolean;
  isInterested?: boolean;
  myTickets?: number;
  interestedCount?: number;
  publishProblems?: Problem[];
}

export interface StudioEventRow extends EventSummary {
  ticketsSold: number;
  capacity: number;
}

export interface Ticket {
  id: string;
  code: string;
  status: "VALID" | "CHECKED_IN" | "CANCELLED";
  paymentStatus: "FREE" | "RESERVED" | "PAID" | "REFUNDED";
  priceXaf: number;
  holderName: string;
  tier: { id: string; name: string };
  reservedAt: string;
  checkedInAt: string | null;
  event: EventSummary;
}
