import type { MediaAsset } from "../types";
import { api, upload } from "./http";

/** Media service: image and audio uploads (with progress) and their processing status. */

export type ImagePurpose = "COVER" | "AVATAR" | "BANNER";

/** The media service checks the dimensions and creates WebP variants. */
export const uploadImage = (file: File, purpose: ImagePurpose, onProgress?: (percent: number) => void) =>
  upload<MediaAsset>(`/media/images?purpose=${purpose}`, file, onProgress);

export const uploadAudio = (file: File, onProgress?: (percent: number) => void) => upload<MediaAsset>("/media/audio", file, onProgress);

export const getMediaAsset = (assetId: string) => api<MediaAsset>(`/media/assets/${assetId}`);
