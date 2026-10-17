/** Profiles, artists and reference data (user service). */

export interface ArtistSummary {
  id: string;
  stageName: string;
  slug: string;
  avatarUrl: string | null;
  verified: boolean;
}

export interface Artist extends ArtistSummary {
  bio: string | null;
  bioFr: string | null;
  bannerUrl: string | null;
  genres: string[];
  country: string | null;
  city: string | null;
  links: Record<string, string>;
  followerCount: number;
  isFollowing?: boolean;
  isOwner?: boolean;
}

export interface Profile {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  birthDate: string | null;
  gender: "FEMALE" | "MALE" | "NON_BINARY" | "UNDISCLOSED";
  country: string;
  region: string;
  city: string | null;
  language: "en" | "fr";
}

export interface Country {
  code: string;
  name: { en: string; fr: string };
}
