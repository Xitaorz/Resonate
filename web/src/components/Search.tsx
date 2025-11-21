import { useEffect, useState, type ChangeEvent } from "react";
import { useMutation, useQuery } from '@tanstack/react-query'

import { Input } from "./ui/input";
import { SongList } from "./SongList";
import { Button } from "./ui/button";

type Result = {
  sid: string;
  song_name: string;
  artist_name: string;
  artist_id: string;
  release_date: string;
  album_name: string;
};

async function searchSongs(query: string): Promise<Result[]> {
  const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  const data = await res.json();
  console.log(data.results)
  return data.results;
}

export function Search() {
  const [query, setQuery] = useState("");
  const [userId, setUserId] = useState("1");
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<number | null>(null);

  const { data, error } = useQuery<Result[]>({
    queryKey: ['searchSongs', query],
    queryFn: () => searchSongs(query),
    enabled: query.length > 0,
    staleTime: 5000,
  });

  type Playlist = {
    plstid: number;
    name: string;
    description: string | null;
    visibility: string;
    created_at: string;
  }

  const { data: playlists = [], isFetching: playlistsLoading, error: playlistsError } = useQuery<Playlist[]>({
    queryKey: ['playlists', userId],
    queryFn: async () => {
      const res = await fetch(`/api/users/${userId}/playlists`, {
        headers: { 'X-User-Id': userId },
      });
      if (!res.ok) throw new Error('Failed to load playlists');
      const payload = await res.json();
      return payload.playlists ?? [];
    },
    enabled: !!userId,
    staleTime: 15_000,
  });

  useEffect(() => {
    if (playlists.length && selectedPlaylistId === null) {
      setSelectedPlaylistId(playlists[0].plstid);
    }
  }, [playlists, selectedPlaylistId]);

  const addSong = useMutation({
    mutationFn: async ({ plstid, sid }: { plstid: number, sid: string }) => {
      const res = await fetch(`/api/playlists/${plstid}/songs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
        body: JSON.stringify({ sid }),
      });
      if (!res.ok) throw new Error('Failed to add song to playlist');
      return res.json();
    },
  });

  const results = query.length === 0 ? [] : (data ?? []);

  return (
    <div className="flex flex-col gap-4 h-full justify-start overflow-auto px-5 py-10">
      <div className="flex flex-col sm:flex-row gap-3 items-center">
        <Input
          className="w-full sm:w-auto flex-1"
          value={query}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
          placeholder="Search songs..."
        />
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">User ID</span>
          <Input
            className="w-24"
            value={userId}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              setUserId(e.target.value);
              setSelectedPlaylistId(null);
            }}
            placeholder="uid"
            type="number"
            min={1}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Playlist</span>
          <select
            className="border rounded px-3 py-2 text-sm"
            value={selectedPlaylistId ?? ""}
            onChange={(e) => setSelectedPlaylistId(Number(e.target.value))}
            disabled={!playlists.length || playlistsLoading}
          >
            {playlists.map((pl) => (
              <option key={pl.plstid} value={pl.plstid}>
                {pl.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error ? (
        <div className="text-red-500 text-sm mt-2">Failed to load results.</div>
      ) : null}
      {playlistsError ? (
        <div className="text-red-500 text-sm mt-2">Failed to load playlists.</div>
      ) : null}
      <SongList
        songs={
          results.map((song: Result) => ({
            title: song.song_name,
            id: song.sid,
            artist: song.artist_name,
            artistId: song.artist_id,
            album: song.album_name,
          }))
        }
        action={(song) => (
          <Button
            size="sm"
            disabled={!selectedPlaylistId || addSong.isPending}
            onClick={() => selectedPlaylistId && addSong.mutate({ plstid: selectedPlaylistId, sid: song.id })}
          >
            {addSong.isPending ? "Adding..." : "Add to playlist"}
          </Button>
        )}
      />
    </div>
  );
}
