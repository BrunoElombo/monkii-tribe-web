/** Uploaded files (media service). */

export interface MediaAsset {
  id: string;
  kind: "AUDIO" | "IMAGE";
  status: "UPLOADED" | "PROCESSING" | "READY" | "FAILED";
  durationMs: number | null;
  variants: Record<string, string> | null;
  error: string | null;
}
