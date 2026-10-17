import type { Artist, ArtistSummary, Country, Page, Profile } from "../types";
import { api } from "./http";

/** User service: listener profiles, artist profiles, follows (ACC-02, ACC-03, ACC-06, MGT-07, ADM-01). */

export interface CountryList {
  countries: Country[];
  regions: Record<string, string[]>;
}

/** Body of the artist profile form (ACC-03). */
export interface ArtistProfileInput {
  stageName: string;
  bio: string | null;
  bioFr: string | null;
  genres: string[];
  country: string | null;
  city: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  links: Record<string, string | undefined>;
}

// ---------------------------------------------------------------- listener

export const getCountries = () => api<CountryList>("/users/reference/countries");

export const getMyProfile = () => api<Profile>("/users/me");

export const updateMyProfile = (changes: Partial<Profile>) => api<Profile>("/users/me", { method: "PATCH", body: changes });

export const getFollowing = () => api<Artist[]>("/users/me/following");

/** ACC-06: everything we keep about the user, as JSON. */
export const exportMyData = () => api<unknown>("/users/me/export");

// ---------------------------------------------------------------- artists

export const getArtist = (slug: string) => api<Artist>(`/artists/${slug}`);

export const getArtistById = (artistId: string) => api<Artist>(`/artists/by-id/${artistId}`);

export const getMyArtist = () => api<Artist>("/artists/me");

export const searchArtists = (query: string) =>
  api<Page<ArtistSummary>>(`/artists?search=${encodeURIComponent(query)}&pageSize=6`);

/** Follows the artist, or unfollows when `following` (the current state) is true. */
export const toggleFollow = (artistId: string, following: boolean) =>
  api(`/artists/${artistId}/follow`, { method: following ? "DELETE" : "POST" });

export const createMyArtist = (body: ArtistProfileInput) => api<Artist>("/artists/me", { method: "POST", body });

export const updateMyArtist = (body: ArtistProfileInput) => api<Artist>("/artists/me", { method: "PATCH", body });

/** Labels and managers edit through the artist's id (MANAGE_PROFILE, audited). */
export const updateArtistProfile = (artistId: string, body: ArtistProfileInput) =>
  api<Artist>(`/artists/${artistId}/profile`, { method: "PATCH", body });

/** MGT-07: takes over the profile a label created before the artist joined. */
export const claimArtist = (token: string) => api<Artist>("/artists/claim", { method: "POST", body: { token } });

// ---------------------------------------------------------------- administration (ADM-01)

export const getAdminArtists = (query: string) =>
  api<Page<Artist>>(`/admin/artists?pageSize=50${query ? `&search=${encodeURIComponent(query)}` : ""}`);

export const setArtistVerified = (artistId: string, verified: boolean) =>
  api(`/admin/artists/${artistId}/verify`, { method: "POST", body: { verified } });
