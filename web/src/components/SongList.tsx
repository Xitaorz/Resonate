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
    <div className="w-full flex flex-col items-center gap-5 m-5">
      {songs.map((song) => (
        <Card key={song.id} className="mb-2 p-4 w-xl">
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