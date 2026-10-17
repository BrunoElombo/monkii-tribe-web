import { z } from "zod";
import { GENDERS } from "./auth.schemas";

/** Profile forms: the listener's settings (ACC-02) and the artist profile (ACC-03). */

export const listenerProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(60),
  gender: z.enum(GENDERS),
  country: z.string().length(2),
  region: z.string().min(1),
  city: z.string().max(80).nullable().optional(),
});
export type ListenerProfileValues = z.infer<typeof listenerProfileSchema>;

/** Links an artist can show on their page, in display order. */
export const ARTIST_LINKS = ["instagram", "tiktok", "youtube", "website"] as const;

/** A full URL, or nothing. */
const optionalUrl = z.string().url().or(z.literal("")).optional();

export const artistProfileSchema = z.object({
  stageName: z.string().trim().min(1).max(80),
  bio: z.string().max(2000).optional(),
  bioFr: z.string().max(2000).optional(),
  genres: z.array(z.string()).max(5),
  country: z.string().optional(),
  city: z.string().max(80).optional(),
  instagram: optionalUrl,
  tiktok: optionalUrl,
  youtube: optionalUrl,
  website: optionalUrl,
});
export type ArtistProfileValues = z.infer<typeof artistProfileSchema>;
