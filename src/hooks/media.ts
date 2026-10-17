import { useQuery } from "@tanstack/react-query";
import { getMediaAsset } from "../services/media.service";

/** An uploaded file and its processing status (never changes once failed or ready). */
export const useMediaAsset = (assetId: string) =>
  useQuery({ queryKey: ["media", "asset", assetId], queryFn: () => getMediaAsset(assetId), staleTime: Infinity });
