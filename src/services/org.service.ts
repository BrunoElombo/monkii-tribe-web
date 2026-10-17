import type { ArtistPermission, AuditEntry, Contract, Organisation, OrgMember } from "../types";
import { api } from "./http";

/** Org service: labels, managers, their teams and contracts with artists (MGT-01 to MGT-09). */

export interface ContractProposal {
  artistId: string;
  splitPercent: number;
  permissions: ArtistPermission[];
  endsAt?: string | null;
  territory?: string | null;
  notes?: string | null;
}

export interface OrgInput {
  name: string;
  contactEmail: string;
  description: string | null;
  country: string;
  legalName: string | null;
  taxId: string | null;
  logoUrl: string | null;
}

export type ContractAction = "accept" | "reject" | "end" | "cancel";

// ---------------------------------------------------------------- organisations

export const getMyOrgs = () => api<Organisation[]>("/orgs/mine");

export const createOrg = (body: OrgInput) => api<Organisation>("/orgs", { method: "POST", body });

export const updateOrg = (orgId: string, body: OrgInput) => api<Organisation>(`/orgs/${orgId}`, { method: "PATCH", body });

export const getAudit = (orgId: string) => api<AuditEntry[]>(`/orgs/${orgId}/audit`);

// ---------------------------------------------------------------- team

export const getOrgMembers = (orgId: string) => api<OrgMember[]>(`/orgs/${orgId}/members`);

export const inviteMember = (orgId: string, body: { email: string; role: string }) =>
  api(`/orgs/${orgId}/members`, { method: "POST", body });

export const removeMember = (orgId: string, userId: string) => api(`/orgs/${orgId}/members/${userId}`, { method: "DELETE" });

export const acceptInvitation = (orgId: string) => api(`/orgs/${orgId}/members/accept`, { method: "POST" });

// ---------------------------------------------------------------- imprints (labels)

export const getImprints = (orgId: string) => api<{ id: string; name: string }[]>(`/orgs/${orgId}/imprints`);

export const addImprint = (orgId: string, name: string) => api(`/orgs/${orgId}/imprints`, { method: "POST", body: { name } });

export const removeImprint = (orgId: string, imprintId: string) => api(`/orgs/${orgId}/imprints/${imprintId}`, { method: "DELETE" });

// ---------------------------------------------------------------- roster and contracts

export const getRoster = (orgId: string | undefined) => api<Contract[]>(`/orgs/${orgId}/roster`);

export const getOrgContracts = (orgId: string) => api<Contract[]>(`/orgs/${orgId}/contracts`);

export const getArtistContracts = (artistId: string) => api<Contract[]>(`/contracts/artist/${artistId}`);

export const proposeContract = (orgId: string, body: ContractProposal) =>
  api<Contract>(`/orgs/${orgId}/contracts`, { method: "POST", body });

export const respondToContract = (contractId: string, action: ContractAction) =>
  api<Contract>(`/contracts/${contractId}/${action}`, { method: "POST" });

/** MGT-07: a label signs an artist who is not on Monkii Tribe yet; the artist claims the profile later. */
export const createUnclaimedArtist = (orgId: string, body: { stageName: string; splitPercent: number }) =>
  api<{ artistId: string; claimUrl: string }>(`/orgs/${orgId}/artists`, { method: "POST", body });
