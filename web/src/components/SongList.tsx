import { Card, CardContent, CardTitle } from "./ui/card";
import { Link } from "@tanstack/react-router";

type Song = {
  id: string;
  title: string;
  artist: string;
  artistId?: string;
  album: string;
}

interface SongListProps {
  songs: Song[];
}

export function SongList({ songs }: SongListProps) {
  return (
    <div className="w-full flex flex-col items-stretch gap-4">
      {songs.map((song) => (
        <Card key={song.id} className="p-4">
          <CardTitle>
            {song.title}
          </CardTitle>
          <CardContent>
            <p>
              Artist: {song.artistId ? (
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
        </Card>
      ))}
    </div>
  );
}
