import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthProvider";
import * as users from "../services/user.service";

/** Profiles, artists and follows. */

export const useCountries = () => useQuery({ queryKey: ["countries"], queryFn: users.getCountries, staleTime: Infinity });

export const useArtist = (slug: string) => useQuery({ queryKey: ["artists", slug], queryFn: () => users.getArtist(slug) });

export const useArtistById = (artistId: string) =>
  useQuery({ queryKey: ["artists", "by-id", artistId], queryFn: () => users.getArtistById(artistId) });

/** Search-as-you-type for the artist pickers (empty query = no request). */
export const useArtistPicker = (query: string) =>
  useQuery({
    queryKey: ["artists", "picker", query],
    queryFn: () => users.searchArtists(query),
    enabled: query.length > 0,
  });

// ---------------------------------------------------------------- signed-in only

export function useProfile() {
  const { user } = useAuth();
  return useQuery({ queryKey: ["profile", user?.id], queryFn: users.getMyProfile, enabled: Boolean(user) });
}

export function useMyArtist() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["artists", "me", user?.id],
    queryFn: users.getMyArtist,
    enabled: user?.accountType === "ARTIST",
    retry: false, // 404 simply means "no artist profile yet"
  });
}

export function useFollowing() {
  const { user } = useAuth();
  return useQuery({ queryKey: ["artists", "following"], queryFn: users.getFollowing, enabled: Boolean(user) });
}

export function useToggleFollow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ artistId, following }: { artistId: string; following: boolean }) => users.toggleFollow(artistId, following),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["artists"] }),
  });
}
