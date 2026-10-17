import { z } from "zod";

/** The release details form of the studio (CAT-02). */

export const RELEASE_TYPES = ["SINGLE", "EP", "ALBUM", "MIXTAPE", "COMPILATION"] as const;

export const releaseDetailsSchema = z.object({
  title: z.string().trim().min(1).max(200),
  type: z.enum(RELEASE_TYPES),
  releaseDate: z.string().optional(),
  genre: z.string().optional(),
  subGenre: z.string().max(60).optional(),
  moods: z.string().optional(),
  language: z.string().max(2).optional(),
  labelName: z.string().max(120).optional(),
  upc: z.string().regex(/^(\d{12,14})?$/, "12–14 digits").optional(),
  copyrightLine: z.string().max(200).optional(),
  phonographicLine: z.string().max(200).optional(),
  description: z.string().max(5000).optional(),
  explicit: z.boolean(),
  /** Empty = not for sale */
  priceXaf: z.string().regex(/^(\d{3,7})?$/, "100 – 1 000 000").optional(),
});
export type ReleaseDetailsValues = z.infer<typeof releaseDetailsSchema>;
