import { useState } from "react";
import { Input } from "./ui/input";
import { SongList } from "./SongList";
import { useQuery } from '@tanstack/react-query'

type Result = {
  song_name: string;
  artist_name: string;
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

  const { data, error } = useQuery<Result[]>({
    queryKey: ['searchSongs', query],
    queryFn: () => searchSongs(query),
    enabled: query.length > 0,
    staleTime: 5000,
  });

  const results = query.length === 0 ? [] : (data ?? []);

  return (
    <div className="flex flex-col items-center h-full justify-start overflow-scroll px-5 py-10">
      <Input
        className="w-xl"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search songs..."
      />
      {error ? (
        <div className="text-red-500 text-sm mt-2">Failed to load results.</div>
      ) : null}
      <SongList songs={
        results.map((song) => ({  
          title: song.song_name,
          id: song.song_name,
          artist: song.artist_name,
          album: song.album_name,
        }))
      } />
    </div>
  );
}
