import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type AlbumSong = {
  sid: string
  song_name: string
  artist_name: string
  album_title: string | null
  track_no: number | null
}

type AlbumResponse = {
  album_id: string
  count: number
  songs: AlbumSong[]
}

export const Route = createFileRoute('/albums/$albumId')({
  component: AlbumPage,
})

function AlbumPage() {
  const { albumId } = Route.useParams()

  const { data, error, isLoading, isFetching, refetch } = useQuery<AlbumResponse, Error>({
    queryKey: ['album-detail', albumId],
    queryFn: async () => {
      const res = await fetch(`/api/albums/${albumId}/songs`)
      if (!res.ok) throw new Error('Failed to load album')
      return res.json()
    },
    staleTime: 30_000,
  })

  if (isLoading) {
    return (
      <div className="flex justify-center px-4 py-10">
        <Card className="w-full max-w-4xl animate-pulse bg-muted/40">
          <div className="h-32 rounded-lg bg-muted" />
        </Card>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex justify-center px-4 py-10">
        <Card className="w-full max-w-3xl border-destructive/40 bg-destructive/10">
          <CardHeader>
            <CardTitle className="text-destructive">Unable to load album</CardTitle>
            <CardDescription>{error?.message || 'Album not found'}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={() => refetch()} disabled={isFetching}>
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const albumTitle = data.songs[0]?.album_title || 'Album'

  return (
    <div className="flex justify-center px-4 py-10">
      <div className="w-full max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{albumTitle}</h1>
            <p className="text-muted-foreground">Album ID: {albumId}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Tracks</CardTitle>
            <CardDescription>
              {data.count} {data.count === 1 ? 'song' : 'songs'}
            </CardDescription>
          </CardHeader>
          <CardContent className="divide-y">
            {data.songs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No songs found for this album.</p>
            ) : (
              data.songs.map((song) => (
                <div
                  key={song.sid}
                  className="flex items-center justify-between py-3 gap-4 rounded-lg px-2 -mx-2"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                      {song.track_no ?? '–'}
                    </div>
                    <div>
                      <p className="font-medium">{song.song_name}</p>
                      <p className="text-sm text-muted-foreground">{song.artist_name || 'Unknown artist'}</p>
                    </div>
                  </div>
                  <Link
                    to="/songs/$sid"
                    params={{ sid: song.sid }}
                    className="text-sm text-primary hover:underline"
                  >
                    View song
                  </Link>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
