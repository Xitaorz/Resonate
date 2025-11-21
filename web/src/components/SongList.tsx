import { Card, CardContent, CardTitle } from "./ui/card";
import { Link } from "@tanstack/react-router";
import { ReactNode } from "react";

type Song = {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  album: string;
}

interface SongListProps {
  songs: Song[];
  action?: (song: Song) => ReactNode;
}

export function SongList({ songs, action }: SongListProps) {
  return (
    <div className="w-full flex flex-col items-stretch gap-4">
      {songs.map((song) => (
        <Card key={song.id} className="mb-2 p-4 w-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>{song.title}</CardTitle>
              <CardContent className="p-0 pt-2 space-y-1">
                <p>
                  Artist:{' '}
                  {song.artistId ? (
                    <Link
                      to="/artist/$artistId"
                      params={{ artistId: song.artistId }}
                      className="text-blue-500 hover:underline cursor-pointer"
                    >
                      {song.artist}
                    </Link>
                  ) : (
                    song.artist
                  )}
                </p>
                <p>Album: {song.album}</p>
              </CardContent>
            </div>
            {action ? <div className="shrink-0">{action(song)}</div> : null}
          </div>
        </Card>
      ))}
    </div>
  );
}
