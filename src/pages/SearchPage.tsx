import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { ArtistCard, CardGrid, PlaylistCard, ReleaseCard } from "../components/Cards";
import { TrackList } from "../components/TrackList";
import { EmptyState, SectionHeader, Spinner } from "../components/ui";
import { useSearch } from "../hooks/catalog";

export function SearchPage() {
  const { t } = useTranslation();
  const [params, setParams] = useSearchParams();
  const [input, setInput] = useState(params.get("q") ?? "");
  const [query, setQuery] = useState(input);

  // Debounce typing so we do not search on every key stroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(input.trim());
      setParams(input.trim() ? { q: input.trim() } : {}, { replace: true });
    }, 300);
    return () => clearTimeout(timer);
  }, [input, setParams]);

  const search = useSearch(query);
  const results = search.data;
  const nothing = results && !results.artists.length && !results.releases.length && !results.tracks.length && !results.playlists.length;

  return (
    <div className="flex flex-col gap-8">
      <div className="relative">
        <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
        <input
          type="search"
          autoFocus
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={t("search.placeholder")}
          className="input h-14 rounded-full pl-12 text-base"
          aria-label={t("nav.search")}
        />
        {search.isFetching && <Spinner className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-monkii-500" />}
      </div>

      {!query && <EmptyState icon={<MagnifyingGlassIcon />} title={t("search.startTyping")} />}
      {query && nothing && <EmptyState title={t("search.noResults", { query })} />}

      {query && results && (
        <>
          {results.tracks.length > 0 && (
            <section>
              <SectionHeader title={t("search.songs")} />
              <TrackList tracks={results.tracks} />
            </section>
          )}
          {results.artists.length > 0 && (
            <section>
              <SectionHeader title={t("library.artists")} />
              <CardGrid>{results.artists.map((artist) => <ArtistCard key={artist.id} artist={artist} />)}</CardGrid>
            </section>
          )}
          {results.releases.length > 0 && (
            <section>
              <SectionHeader title={t("library.releases")} />
              <CardGrid>{results.releases.map((release) => <ReleaseCard key={release.id} release={release} />)}</CardGrid>
            </section>
          )}
          {results.playlists.length > 0 && (
            <section>
              <SectionHeader title={t("library.playlists")} />
              <CardGrid>{results.playlists.map((playlist) => <PlaylistCard key={playlist.id} playlist={playlist} />)}</CardGrid>
            </section>
          )}
        </>
      )}
    </div>
  );
}
