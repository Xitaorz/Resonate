import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { Input } from "./ui/input";
import { SongList } from "./SongList";
import { Spinner } from "./ui/spinner";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { RatingStars } from "./RatingStars";
import { Heart } from "lucide-react";

type Result = {
  sid: string;
  song_name: string;
  artist_name: string;
  artist_id: string;
  release_date: string;
  album_name: string;
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
  const authUid = auth?.user?.uid ?? null;
  const queryClient = useQueryClient();
  const [selectedSong, setSelectedSong] = useState<Result | null>(null);
  const [selectedPlaylist, setSelectedPlaylist] = useState<string>("");
  const [ratings, setRatings] = useState<Record<string, number>>({});

  const {
    data,
    error,
    isLoading,
    isFetching,
  } = useQuery<SearchPayload>({
    queryKey: ['searchSongs', query],
    queryFn: () => searchSongs(query),
    enabled: query.trim().length > 0,
    staleTime: 5000,
  });

  const results = query.trim().length === 0 ? [] : (data?.results ?? []);
  const durationText = useMemo(() => {
    if (!data) return null;
    return `${data.durationMs.toFixed(1)} ms`;
  }, [data]);

  const resultsBySid = useMemo(() => {
    const entries = results.map((song) => [song.sid, song] as const)
    return Object.fromEntries(entries)
  }, [results])

  useEffect(() => {
    if (!authUid || results.length === 0) {
      setRatings({});
      return;
    }

    let cancelled = false;
    const fetchRatings = async () => {
      const entries = await Promise.all(
        results.map(async (song) => {
          try {
            const res = await fetch(`/api/songs/${song.sid}/rating`, {
              headers: { 'X-User-Id': authUid },
            });
            const data = await res.json();
            if (res.ok && data?.rating?.rate_value) {
              return [song.sid, Number(data.rating.rate_value)] as const;
            }
          } catch {
            // ignore fetch errors per-song
          }
          return [song.sid, 0] as const;
        })
      );
      if (!cancelled) {
        setRatings(Object.fromEntries(entries));
      }
    };

    fetchRatings();

    return () => {
      cancelled = true;
    };
  }, [authUid, results]);

  const {
    data: playlists = [],
    isLoading: playlistsLoading,
    error: playlistsError,
    refetch: refetchPlaylists,
  } = useQuery<
    { plstid: number; name: string }[],
    Error
  >({
    queryKey: ["user-playlists", authUid],
    enabled: Boolean(authUid),
    queryFn: async () => {
      const res = await fetch(`/api/users/${authUid}/playlists`, {
        headers: { "X-User-Id": authUid! },
      });
      if (!res.ok) throw new Error("Failed to load playlists");
      const payload = await res.json();
      return payload.playlists ?? [];
    },
    staleTime: 30_000,
  });

  useEffect(() => {
    if (selectedSong && authUid) {
      refetchPlaylists();
    }
  }, [selectedSong, authUid, refetchPlaylists]);

  const {
    data: favoritesData = [],
    error: favoritesError,
  } = useQuery<{ sid: string }[], Error>({
    queryKey: ["user-favorites", authUid],
    enabled: Boolean(authUid),
    queryFn: async () => {
      const res = await fetch(`/api/users/${authUid}/favorites`, {
        headers: { "X-User-Id": authUid! },
      });
      if (!res.ok) throw new Error("Failed to load favorites");
      const payload = await res.json();
      return Array.isArray(payload?.favorites) ? payload.favorites : [];
    },
    staleTime: 30_000,
  });

  const favorites = useMemo(() => {
    const set = new Set<string>();
    favoritesData.forEach((f: any) => {
      if (f?.sid) set.add(f.sid as string);
    });
    return set;
  }, [favoritesData]);

  const addToPlaylist = useMutation({
    mutationFn: async () => {
      if (!selectedSong?.sid || !selectedPlaylist || !authUid) {
        throw new Error("Missing song or playlist");
      }
      const res = await fetch(`/api/playlists/${selectedPlaylist}/songs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": authUid,
        },
        body: JSON.stringify({ sid: selectedSong.sid }),
      });
      if (!res.ok) {
        let msg = "Song already exists in this playlist";
        try {
          const payload = await res.json();
          msg = payload?.error || msg;
        } catch {
          // ignore
        }
        throw new Error(msg);
      }
      return res.json();
    },
    onSuccess: () => {
      setSelectedSong(null);
      setSelectedPlaylist("");
    },
  });

  const rateSong = useMutation({
    mutationFn: async ({ sid, rating }: { sid: string; rating: number }) => {
      if (!authUid) throw new Error("You must be logged in to rate");
      const res = await fetch(`/api/songs/${sid}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-User-Id": authUid },
        body: JSON.stringify({ uid: Number(authUid), rate_value: rating }),
      });
      if (!res.ok) {
        let msg = "Failed to rate song";
        try {
          const payload = await res.json();
          msg = payload?.error || msg;
        } catch {
          // ignore
        }
        throw new Error(msg);
      }
      return res.json();
    },
    onSuccess: (_res, vars) => {
      setRatings((prev) => ({ ...prev, [vars.sid]: vars.rating }));
    },
  });

  const favoriteSong = useMutation({
    mutationFn: async (sid: string) => {
      if (!authUid) throw new Error("Login required");
      const res = await fetch("/api/favorites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": authUid.toString(),
        },
        body: JSON.stringify({ sid }),
      });
      if (!res.ok) {
        let msg = "Failed to favorite song";
        try {
          const payload = await res.json();
          msg = payload?.error || msg;
        } catch { /* ignore */ }
        throw new Error(msg);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-favorites", authUid] });
    },
  });

  const isSearching = isLoading || isFetching;

    return (
      <div className="w-full px-5 py-6">
        <div className="mx-auto flex max-w-5xl flex-col gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold leading-tight">Search</h1>
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
                  Searching…
                </span>
              ) : error ? (
                <span className="text-destructive">Failed to load results.</span>
              ) : (
                <>
                  <span>{results.length} result{results.length === 1 ? "" : "s"}</span>
                  {durationText ? <span>· {durationText}</span> : null}
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
              action={(song) => (
                <div className="flex flex-col gap-2 items-end">
                  {favoritesError ? (
                    <div className="text-xs text-destructive">Favorites unavailable</div>
                  ) : null}
                  <RatingStars
                    value={ratings[song.sid] || 0}
                    onChange={(value) => {
                      const original = resultsBySid[song.sid]
                      if (!original) return;
                      setRatings((prev) => ({ ...prev, [song.sid]: value }));
                      rateSong.mutate({ sid: song.sid, rating: value });
                    }}
                    disabled={!authUid || rateSong.isPending}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!authUid || favoriteSong.isPending}
                    onClick={() => favoriteSong.mutate(song.sid)}
                    className="flex items-center gap-2"
                  >
                    <Heart
                      className={`size-4 ${favorites.has(song.sid) ? 'text-red-500 fill-red-500' : ''}`}
                      fill={favorites.has(song.sid) ? "currentColor" : "none"}
                    />
                    {favorites.has(song.sid) ? "Favorited" : "Favorite"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!authUid}
                    onClick={() => {
                      const original = resultsBySid[song.sid]
                      setSelectedSong(original ?? null);
                      setSelectedPlaylist("");
                    }}
                  >
                    Add to playlist
                  </Button>
                </div>
              )}
            />
          ) : (
            <div className="rounded-lg border border-dashed border-border/60 bg-muted/30 px-4 py-10 text-center text-sm text-muted-foreground">
              No results yet. Try another query.
            </div>
          )}
        </div>

        <Dialog
          open={Boolean(selectedSong)}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedSong(null);
              setSelectedPlaylist("");
              addToPlaylist.reset();
            }
          }}
        >
          <DialogContent className="max-w-sm p-5">
            <DialogHeader>
              <DialogTitle>Add to playlist</DialogTitle>
              <DialogDescription>
                {selectedSong ? `Choose a playlist for "${selectedSong.song_name}"` : "Select a playlist"}
              </DialogDescription>
            </DialogHeader>
            {!authUid ? (
              <div className="text-sm text-muted-foreground">
                Please log in to add songs to playlists.
              </div>
            ) : playlistsLoading ? (
              <div className="text-sm text-muted-foreground">Loading playlists…</div>
            ) : playlistsError ? (
              <div className="space-y-2 text-sm text-destructive">
                <div>Failed to load playlists.</div>
                <Button size="sm" variant="outline" onClick={() => refetchPlaylists()}>
                  Retry
                </Button>
              </div>
            ) : playlists.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No playlists yet. Create one first.
              </div>
            ) : (
              <div className="space-y-3">
                <select
                  className="w-full rounded border px-3 py-2 text-sm"
                  value={selectedPlaylist}
                  onChange={(e) => setSelectedPlaylist(e.target.value)}
                >
                  <option value="">Select a playlist</option>
                  {playlists.map((pl) => (
                    <option key={pl.plstid} value={pl.plstid}>
                      {pl.name}
                    </option>
                  ))}
                </select>
                {addToPlaylist.isError ? (
                  <div className="text-sm text-destructive">
                    {(addToPlaylist.error as any)?.message || 'Failed to add song'}
                  </div>
                ) : null}
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    onClick={() => addToPlaylist.mutate()}
                    disabled={!selectedPlaylist || addToPlaylist.isPending}
                  >
                    {addToPlaylist.isPending ? 'Adding…' : 'Add'}
                  </Button>
                  <Button
                    variant="ghost"
                    className="flex-1"
                    onClick={() => {
                      setSelectedSong(null);
                      setSelectedPlaylist("");
                      addToPlaylist.reset();
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
