import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useArtistPicker } from "../hooks/user";
import type { ArtistSummary } from "../types";
import { Avatar } from "./Cover";
import { Input } from "./ui";

interface ArtistPickerProps {
  value: ArtistSummary[];
  onChange: (artists: ArtistSummary[]) => void;
  /** The primary artist cannot feature on their own release */
  excludeId?: string;
  disabled?: boolean;
}

/** Search-as-you-type picker for featured artists. */
export function ArtistPicker({ value, onChange, excludeId, disabled }: ArtistPickerProps) {
  const { t } = useTranslation();
  const [input, setInput] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setQuery(input.trim()), 250);
    return () => clearTimeout(timer);
  }, [input]);

  const results = useArtistPicker(query);

  const selectedIds = new Set(value.map((a) => a.id));
  const options = (results.data?.items ?? []).filter((a) => !selectedIds.has(a.id) && a.id !== excludeId);

  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((artist) => (
            <span key={artist.id} className="chip gap-2 text-fg">
              <Avatar src={artist.avatarUrl} alt="" className="h-5 w-5" />
              {artist.stageName}
              {!disabled && (
                <button type="button" aria-label={`Remove ${artist.stageName}`} onClick={() => onChange(value.filter((a) => a.id !== artist.id))}>
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {!disabled && (
        <div className="relative">
          <Input value={input} onChange={(event) => setInput(event.target.value)} placeholder={t("studio.searchArtists")} />
          {options.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full rounded-xl border border-line bg-surface p-1 shadow-xl shadow-black/40">
              {options.map((artist) => (
                <li key={artist.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-elevated"
                    onClick={() => {
                      onChange([...value, artist]);
                      setInput("");
                    }}
                  >
                    <Avatar src={artist.avatarUrl} alt="" className="h-7 w-7" />
                    {artist.stageName}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
