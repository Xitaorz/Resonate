import { useMemo, useState, type ChangeEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Crown } from "lucide-react";

import { Input } from "./ui/input";
import { SongList } from "./SongList";
import { Spinner } from "./ui/spinner";
import { useAuth } from "@/hooks/use-auth";
import { AuroraText } from "./ui/aurora-text";

type Result = {
  sid: string;
  song_name: string;
  artist_name: string;
  artist_id: string;
  release_date: string;
  album_name: string;
  tags?: string | null;
};

type SearchPayload = {
  results: Result[];
  durationMs: number;
  query: string;
};

async function searchSongs(query: string): Promise<SearchPayload> {
  const started = performance.now();
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  const elapsed = performance.now() - started;

  let data: any = {};
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    const message = typeof data?.error === "string" ? data.error : "Failed to load results";
    throw new Error(message);
  }

  const results = Array.isArray(data?.results) ? data.results : [];
  return { results, durationMs: elapsed, query };
}

export function Search() {
  const [query, setQuery] = useState("");
  const auth = useAuth();
  const isVip = auth?.user?.isvip === 1;

  const {
    data,
    error,
    isLoading,
    isFetching,
  } = useQuery<SearchPayload>({
    queryKey: ["searchSongs", query],
    queryFn: () => searchSongs(query),
    enabled: query.trim().length > 0,
    staleTime: 5000,
  });

  const results = query.trim().length === 0 ? [] : (data?.results ?? []);
  const durationText = useMemo(() => {
    if (!data) return null;
    return `${data.durationMs.toFixed(1)} ms`;
  }, [data]);

  const isSearching = isLoading || isFetching;

  return (
    <div className="w-full px-5 py-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold leading-tight">
              {isVip ? (
                <AuroraText className="text-3xl font-bold">Search</AuroraText>
              ) : (
                "Search"
              )}
            </h1>
            {isVip && (
              <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 px-2.5 py-1 text-xs font-bold text-amber-900 shadow-md shadow-amber-500/50">
                <Crown className="size-3 fill-amber-900" />
                VIP
              </span>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex flex-col gap-2">
            <Input
              className="w-full max-w-2xl"
              value={query}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
              placeholder="Search songs..."
              autoFocus
            />
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              {query.trim().length === 0 ? (
                <span>Start typing to search.</span>
              ) : isSearching ? (
                <span className="flex items-center gap-2">
                  <Spinner className="text-primary" />
                  Searching...
                </span>
              ) : error ? (
                <span className="text-destructive">Failed to load results.</span>
              ) : (
                <>
                  <span>
                    {results.length} result{results.length === 1 ? "" : "s"}
                  </span>
                  {durationText ? <span>- {durationText}</span> : null}
                </>
              )}
            </div>
          </div>

          {error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error.message}
            </div>
          ) : null}
        </div>

        <div className="space-y-3">
          {isSearching ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="rounded-xl border border-border/60 bg-muted/40 p-4 shadow-sm"
                >
                  <div className="mb-3 h-4 w-1/2 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-1/3 animate-pulse rounded bg-muted/70" />
                </div>
              ))}
            </div>
          ) : results.length > 0 ? (
            <SongList
              songs={results.map((song: Result) => ({
                sid: song.sid,
                title: song.song_name,
                artist: song.artist_name,
                artistId: song.artist_id,
                album: song.album_name,
                tags: song.tags || null,
              }))}
            />
          ) : (
            <div className="rounded-lg border border-dashed border-border/60 bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
              No results yet. Try another query.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
