import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthProvider";
import * as orgs from "../services/org.service";

/** Labels and managers (MGT-01 to MGT-09). */

export function useMyOrgs() {
  const { user } = useAuth();
  return useQuery({ queryKey: ["orgs", "mine", user?.id], queryFn: orgs.getMyOrgs, enabled: Boolean(user) });
}

/** The organisation the user works in (first active membership). */
export function useCurrentOrg() {
  const myOrgs = useMyOrgs();
  const active = myOrgs.data?.find((org) => org.membership === "ACTIVE") ?? null;
  return { ...myOrgs, org: active, invitations: myOrgs.data?.filter((org) => org.membership === "INVITED") ?? [] };
}

export const useRoster = (orgId: string | undefined) =>
  useQuery({ queryKey: ["orgs", orgId, "roster"], queryFn: () => orgs.getRoster(orgId), enabled: Boolean(orgId) });

export const useOrgContracts = (orgId: string) =>
  useQuery({ queryKey: ["orgs", orgId, "contracts"], queryFn: () => orgs.getOrgContracts(orgId) });

export const useOrgMembers = (orgId: string) =>
  useQuery({ queryKey: ["orgs", orgId, "members"], queryFn: () => orgs.getOrgMembers(orgId) });

export const useImprints = (orgId: string, enabled: boolean) =>
  useQuery({ queryKey: ["orgs", orgId, "imprints"], queryFn: () => orgs.getImprints(orgId), enabled });

export const useAudit = (orgId: string) => useQuery({ queryKey: ["orgs", orgId, "audit"], queryFn: () => orgs.getAudit(orgId) });

export const useArtistContracts = (artistId: string, enabled = true) =>
  useQuery({ queryKey: ["contracts", "artist", artistId], queryFn: () => orgs.getArtistContracts(artistId), enabled });

/** Any organisation mutation refreshes everything under ["orgs"] and ["contracts"]. */
export function useOrgMutation<TInput, TResult = unknown>(request: (input: TInput) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: request,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["orgs"] });
      void queryClient.invalidateQueries({ queryKey: ["contracts"] });
    },
  });
}
