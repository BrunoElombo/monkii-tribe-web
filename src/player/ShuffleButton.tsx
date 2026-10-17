import { useTranslation } from "react-i18next";
import { ArrowsRightLeftIcon } from "@heroicons/react/24/outline";
import { Button } from "../components/ui";
import type { Track } from "../types";
import { usePlayer } from "./PlayerProvider";

/** "Shuffle" next to "Play": plays the list in random order, starting with a random song. */
export function ShuffleButton({ tracks, size = "lg" }: { tracks: Track[]; size?: "md" | "lg" }) {
  const { t } = useTranslation();
  const { playQueue } = usePlayer();

  return (
    <Button
      size={size}
      variant="secondary"
      icon={<ArrowsRightLeftIcon className="h-5 w-5" />}
      disabled={!tracks.some((track) => track.audioStatus === "READY")}
      onClick={() => playQueue(tracks, undefined, { shuffle: true })}
    >
      {t("common.shuffle")}
    </Button>
  );
}
