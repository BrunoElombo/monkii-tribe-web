/** Labels, managers and their contracts (org service). */

export type ArtistPermission = "MANAGE_PROFILE" | "MANAGE_RELEASES" | "MANAGE_EVENTS" | "VIEW_ANALYTICS" | "VIEW_EARNINGS";
export const ARTIST_PERMISSIONS: ArtistPermission[] = ["MANAGE_PROFILE", "MANAGE_RELEASES", "MANAGE_EVENTS", "VIEW_ANALYTICS", "VIEW_EARNINGS"];

export interface Organisation {
  id: string;
  type: "LABEL" | "MANAGEMENT";
  name: string;
  slug: string;
  logoUrl: string | null;
  description: string | null;
  country: string;
  contactEmail: string;
  legalName: string | null;
  taxId: string | null;
  myRole: "OWNER" | "ADMIN" | "MEMBER" | null;
  /** Only in /orgs/mine */
  membership?: "INVITED" | "ACTIVE";
  createdAt: string;
}

export interface OrgMember {
  userId: string;
  email: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  status: "INVITED" | "ACTIVE";
  joinedAt: string | null;
}

export type ContractStatus = "PENDING" | "ACTIVE" | "REJECTED" | "ENDED" | "CANCELLED";

export interface Contract {
  id: string;
  org: { id: string; name: string; type: Organisation["type"]; logoUrl: string | null };
  artist: { id: string; stageName: string; slug: string; avatarUrl: string | null; claimed: boolean };
  splitPercent: number;
  permissions: ArtistPermission[];
  territory: string | null;
  notes: string | null;
  startsAt: string;
  endsAt: string | null;
  status: ContractStatus;
  provisional: boolean;
  respondedAt: string | null;
  endedAt: string | null;
  createdAt: string;
}

export interface AuditEntry {
  id: string;
  action: string;
  artist: string | null;
  actor: string;
  details: Record<string, unknown> | null;
  at: string;
}
