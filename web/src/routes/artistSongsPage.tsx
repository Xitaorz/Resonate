import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { SongList } from '../components/SongList'

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
  
  const { data: songs = [], error, isLoading } = useQuery<ArtistSong[]>({
    queryKey: ['artistSongs', artistId],
    queryFn: () => fetchArtistSongs(artistId),
    staleTime: 5000,
  })

  const artistName = songs.length > 0 ? songs[0].artist_name : 'Unknown Artist'

  return (
    <div className="flex flex-col items-center h-full justify-start overflow-scroll px-5 py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{artistName}</h1>
        <p className="text-gray-500">{songs.length} songs</p>
      </div>
      
      {isLoading ? (
        <div>Loading...</div>
      ) : error ? (
        <div className="text-red-500 text-sm mt-2">Failed to load artist songs.</div>
      ) : songs.length === 0 ? (
        <div className="text-gray-500">No songs found for this artist.</div>
      ) : (
        <SongList songs={
          songs.map((song, index) => ({
            id: `${song.sid}-${index}`,
            title: song.song_title,
            artist: song.artist_name,
            album: song.album_title,
          }))
        } />
      )}
    </div>
  )
}

