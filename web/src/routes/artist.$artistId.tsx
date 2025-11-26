import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Crown } from 'lucide-react'
import { SongList } from '../components/SongList'
import { useAuth } from '@/hooks/use-auth'
import { AuroraText } from '@/components/ui/aurora-text'

export const Route = createFileRoute('/artist/$artistId')({
  component: ArtistSongsPage,
})

type ArtistSong = {
  sid: string;
  song_title: string;
  album_title: string;
  artist_name: string;
}

async function fetchArtistSongs(artistId: string): Promise<ArtistSong[]> {
  const res = await fetch(`/api/artist/${artistId}/songs`);
  const data = await res.json();
  console.log(data);
  
  if (!res.ok || data.error) {
    console.error('Artist songs error:', data.error || res.statusText);
    return [];
  }
  
  return data.songs || [];
}

function ArtistSongsPage() {
  const { artistId } = Route.useParams()
  const auth = useAuth()
  const isVip = auth?.user?.isvip === 1
  
  const { data: songs = [], error, isLoading } = useQuery<ArtistSong[]>({
    queryKey: ['artistSongs', artistId],
    queryFn: () => fetchArtistSongs(artistId),
    staleTime: 5000,
  })

  const artistName = songs.length > 0 ? songs[0].artist_name : 'Unknown Artist'

  return (
    <div className={`flex flex-col items-center h-full justify-start overflow-scroll px-5 py-10 min-h-screen ${
      isVip ? "bg-gradient-to-br from-amber-50/50 via-yellow-50/30 to-amber-50/50 dark:from-amber-950/20 dark:via-yellow-950/10 dark:to-amber-950/20" : ""
    }`}>
      {isVip && (
        <div className="fixed inset-0 bg-gradient-to-br from-amber-500/5 via-yellow-500/5 to-amber-500/5 pointer-events-none -z-10" />
      )}
      <div className="mb-6 relative">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold">
            {isVip ? (
              <AuroraText className="text-3xl font-bold">{artistName}</AuroraText>
            ) : (
              artistName
            )}
          </h1>
          {isVip && (
            <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 px-2.5 py-1 text-xs font-bold text-amber-900 shadow-md shadow-amber-500/50">
              <Crown className="size-3 fill-amber-900" />
              VIP
            </span>
          )}
        </div>
        <p className={`${isVip ? "text-amber-700 dark:text-amber-300" : "text-gray-500"}`}>
          {songs.length} songs
        </p>
      </div>
      
      {isLoading ? (
        <div>Loading...</div>
      ) : error ? (
        <div className="text-red-500 text-sm mt-2">Failed to load artist songs.</div>
      ) : songs.length === 0 ? (
        <div className="text-gray-500">No songs found for this artist.</div>
      ) : (
        <SongList songs={
          songs.map((song) => ({
            sid: song.sid,
            title: song.song_title,
            artist: song.artist_name,
            album: song.album_title,
          }))
        } />
      )}
    </div>
  )
}

