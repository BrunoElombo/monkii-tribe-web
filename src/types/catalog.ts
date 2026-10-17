import type { Problem } from "./common";
import type { ArtistSummary } from "./user";

/** Releases, tracks, playlists and charts (catalog service). */

export type ReleaseType = "SINGLE" | "EP" | "ALBUM" | "MIXTAPE" | "COMPILATION";
export type ReleaseStatus = "DRAFT" | "PROCESSING" | "READY" | "IN_REVIEW" | "SCHEDULED" | "PUBLISHED" | "TAKEN_DOWN";
export type AudioStatus = "MISSING" | "PROCESSING" | "READY" | "FAILED";

export interface Track {
  id: string;
  title: string;
  trackNumber: number;
  discNumber: number;
  durationMs: number | null;
  explicit: boolean;
  playCount: number;
  likeCount: number;
  audioStatus: AudioStatus;
  isLiked?: boolean;
  /** Download price in XAF, null = not for sale */
  priceXaf?: number | null;
  /** The track or its release was bought by the viewer */
  isPurchased?: boolean;
  artist: ArtistSummary;
  featured: ArtistSummary[];
  release: { id: string; title: string; type: ReleaseType; coverUrl: string | null; coverThumbUrl: string | null };
}

export interface Genre {
  id: number;
  slug: string;
  name: string;
  nameFr: string;
}

export interface ReleaseSummary {
  id: string;
  title: string;
  type: ReleaseType;
  status: ReleaseStatus;
  coverUrl: string | null;
  coverThumbUrl: string | null;
  releaseDate: string | null;
  publishedAt: string | null;
  explicit: boolean;
  priceXaf?: number | null;
  trackCount?: number;
  genre: { slug: string; name: string; nameFr: string } | null;
  artist: ArtistSummary;
}

export interface ReleaseDetails extends ReleaseSummary {
  publishAt: string | null;
  subGenre: string | null;
  moods: string[];
  language: string | null;
  labelName: string | null;
  upc: string | null;
  copyrightLine: string | null;
  phonographicLine: string | null;
  description: string | null;
  takedownReason: string | null;
  reviewNote?: string | null;
  featured: ArtistSummary[];
}

export interface PublicRelease extends ReleaseDetails {
  isSaved: boolean;
  isPurchased: boolean;
  totalDurationMs: number;
  tracks: Track[];
}

export interface Credit {
  role: "composer" | "songwriter" | "producer" | "mixing" | "mastering" | "arranger" | "performer" | "other";
  name: string;
}

export interface StudioTrack {
  id: string;
  title: string;
  trackNumber: number;
  discNumber: number;
  isrc: string | null;
  durationMs: number | null;
  explicit: boolean;
  lyrics: string | null;
  bpm: number | null;
  musicalKey: string | null;
  language: string | null;
  previewStartSec: number;
  priceXaf: number | null;
  audioAssetId: string | null;
  audioStatus: AudioStatus;
  credits: Credit[];
  featuredArtistIds: string[];
  playCount: number;
  likeCount: number;
}

export interface StudioRelease extends ReleaseDetails {
  tracks: StudioTrack[];
  trackLimits: { min: number; max: number };
  publishProblems: Problem[];
}

export interface PlaylistSummary {
  id: string;
  title: string;
  description: string | null;
  isPublic: boolean;
  trackCount: number;
  owner: { id: string; displayName: string };
  coverUrls: string[];
  updatedAt: string;
}

export interface PlaylistDetails extends PlaylistSummary {
  isOwner: boolean;
  tracks: Track[];
}

export interface ChartRow {
  rank: number;
  previousRank: number | null;
  value: number;
  growth: number | null;
  track?: Track;
  artist?: ArtistSummary;
}
