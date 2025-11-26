import { Card, CardContent, CardTitle } from "./ui/card";
import { Link, useNavigate } from "@tanstack/react-router";
import type { KeyboardEvent, ReactNode } from "react";
import { TagIcon } from "./TagIcon";
import { useAuth } from "@/hooks/use-auth";

type Song = {
  sid: string;
  title: string;
  artist: string;
  artistId?: string;
  artists?: { name: string; id?: string }[];
  album: string;
  tags?: string | null;
}

interface SongListProps {
  songs: Song[];
  action?: (song: Song) => ReactNode;
}

export function SongList({ songs, action }: SongListProps) {
  const navigate = useNavigate();
  const auth = useAuth();
  const isVip = auth?.user?.isvip === 1;

  const openSong = (sid: string) => {
    void navigate({ to: "/songs/$sid", params: { sid } });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>, sid: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openSong(sid);
    }
  };

  return (
    <div className="w-full flex flex-col items-stretch gap-4">
      {songs.map((song) => (
        <Card
          key={song.sid}
          className={`mb-2 p-4 w-xl cursor-pointer transition hover:-translate-y-[1px] hover:border-primary/60 ${
            isVip ? "border-amber-400/20 shadow-md shadow-amber-500/10 hover:shadow-lg hover:shadow-amber-500/20" : ""
          }`}
          role="button"
          tabIndex={0}
          onClick={() => openSong(song.sid)}
          onKeyDown={(event) => handleKeyDown(event, song.sid)}
          aria-label={`Open details for ${song.title}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="w-full"> 
              <CardTitle className="flex w-full items-start gap-3 hover:text-primary">
                <span className="flex-1 min-w-0 leading-tight">{song.title}</span>
                <span className="shrink-0 text-xs font-medium text-muted-foreground">
                  View details
                </span>
              </CardTitle>
              <CardContent className="p-0 pt-2 space-y-1">
                <p className="flex flex-wrap gap-1">
                  <span className="mr-1">Artist:</span>
                  {(() => {
                    const artistList =
                      song.artists ??
                      (song.artist
                        ? [{ name: song.artist, id: song.artistId }]
                        : []);
                    return artistList.map((artist, index) => (
                      <span key={`${song.sid}-${artist.id ?? artist.name}-${index}`}>
                        {index > 0 ? <span className="text-muted-foreground">, </span> : null}
                        {artist.id ? (
                          <Link
                            to="/artist/$artistId"
                            params={{ artistId: artist.id }}
                            className="text-blue-500 hover:underline cursor-pointer"
                            onClick={(event) => event.stopPropagation()}
                          >
                            {artist.name}
                          </Link>
                        ) : (
                          artist.name
                        )}
                      </span>
                    ));
                  })()}
                </p>
                <p>Album: {song.album}</p>
                {song.tags ? (
                  <div className="flex gap-2 flex-wrap mt-1">
                    {song.tags
                      .split(",")
                      .map((t) => t.trim())
                      .filter(Boolean)
                      .map((tag) => (
                        <TagIcon key={tag} tag={tag} />
                      ))}
                  </div>
                ) : null}
              </CardContent>
            </div>
            {action ? (
              <div
                className="shrink-0"
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                {action(song)}
              </div>
            ) : null}
          </div>
        </Card>
      ))}
    </div>
  );
}
