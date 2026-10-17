import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../auth/AuthProvider";
import * as catalog from "../services/catalog.service";

/**
 * Catalog data. Query keys start with the resource name so related screens
 * refresh together after a mutation (e.g. liking a track updates every list).
 */

export const useHome = () => useQuery({ queryKey: ["tracks", "home"], queryFn: catalog.getHome });

export const useGenres = () => useQuery({ queryKey: ["genres"], queryFn: catalog.getGenres, staleTime: Infinity });

export const useRelease = (id: string) => useQuery({ queryKey: ["tracks", "release", id], queryFn: () => catalog.getRelease(id) });

export const useArtistTracks = (artistId: string | undefined) =>
  useQuery({
    queryKey: ["tracks", "artist", artistId],
    queryFn: () => catalog.getArtistTracks(artistId),
    enabled: Boolean(artistId),
  });

export const useArtistReleases = (artistId: string | undefined) =>
  useQuery({
    queryKey: ["releases", "artist", artistId],
    queryFn: () => catalog.getArtistReleases(artistId),
    enabled: Boolean(artistId),
  });

export const useSearch = (query: string) =>
  useQuery({
    queryKey: ["tracks", "search", query],
    queryFn: ({ signal }) => catalog.search(query, signal),
    enabled: query.trim().length > 0,
    placeholderData: (previous) => previous,
  });

export const useCharts = (kind: "tracks" | "trending" | "artists", country: string, genre: string) => {
  const params = new URLSearchParams({ kind });
  if (country) params.set("country", country);
  if (genre) params.set("genre", genre);
  return useQuery({ queryKey: ["tracks", "charts", params.toString()], queryFn: () => catalog.getCharts(params) });
};

// ---------------------------------------------------------------- library (signed-in only)

export function useLikedTracks() {
  const { user } = useAuth();
  return useQuery({ queryKey: ["tracks", "liked"], queryFn: catalog.getLikedTracks, enabled: Boolean(user) });
}

export function useSavedReleases() {
  const { user } = useAuth();
  return useQuery({ queryKey: ["releases", "saved"], queryFn: catalog.getSavedReleases, enabled: Boolean(user) });
}

export function usePurchases() {
  const { user } = useAuth();
  return useQuery({ queryKey: ["tracks", "purchases"], queryFn: catalog.getPurchases, enabled: Boolean(user) });
}

export function useMyPlaylists() {
  const { user } = useAuth();
  return useQuery({ queryKey: ["playlists", "mine"], queryFn: catalog.getMyPlaylists, enabled: Boolean(user) });
}

export const usePlaylist = (id: string) => useQuery({ queryKey: ["tracks", "playlist", id], queryFn: () => catalog.getPlaylist(id) });

export function useToggleLike() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ trackId, liked }: { trackId: string; liked: boolean }) => catalog.toggleLike(trackId, liked),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tracks"] }),
  });
}

export function useToggleSave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ releaseId, saved }: { releaseId: string; saved: boolean }) => catalog.toggleSave(releaseId, saved),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tracks", "release"] });
      void queryClient.invalidateQueries({ queryKey: ["releases", "saved"] });
    },
  });
}

export function useAddToPlaylist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ playlistId, trackId }: { playlistId: string; trackId: string }) => catalog.addToPlaylist(playlistId, trackId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["playlists"] });
      void queryClient.invalidateQueries({ queryKey: ["tracks", "playlist"] });
    },
  });
}

export function useCreatePlaylist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: catalog.PlaylistInput) => catalog.createPlaylist(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["playlists"] }),
  });
}

// ---------------------------------------------------------------- studio

export const useStudioReleases = (artistId: string) =>
  useQuery({ queryKey: ["studio", "releases", artistId], queryFn: () => catalog.getStudioReleases(artistId) });

export const useStudioRelease = (id: string) =>
  useQuery({
    queryKey: ["studio", "release", id],
    queryFn: () => catalog.getStudioRelease(id),
    // Keep polling while the worker transcodes audio
    refetchInterval: (query) => (query.state.data?.tracks.some((track) => track.audioStatus === "PROCESSING") ? 3000 : false),
  });

// ---------------------------------------------------------------- administration (CAT-11)

export const useReviewQueue = () => useQuery({ queryKey: ["admin", "review"], queryFn: catalog.getReviewQueue });
