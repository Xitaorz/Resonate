import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type PlaylistDetail = {
  playlist: {
    plstid: number
    uid: number
    name: string
    description: string | null
    visibility: string
    created_at: string
  }
  songs: Array<{
    position: number
    sid: string
    song_title: string
    album_title: string | null
    artist_names: string | null
  }>
}

export const Route = createFileRoute('/playlists/$plstid')({
  component: PlaylistDetailPage,
})

function PlaylistDetailPage() {
  const { plstid } = Route.useParams()

  const { data, isLoading, error, refetch, isFetching } = useQuery<PlaylistDetail, Error>({
    queryKey: ['playlist-detail', plstid],
    queryFn: async () => {
      const res = await fetch(`/api/playlists/${plstid}`)
      if (!res.ok) throw new Error('Failed to load playlist')
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

  if (error) {
    return (
      <div className="flex justify-center px-4 py-10">
        <Card className="w-full max-w-3xl border-destructive/40 bg-destructive/10">
          <CardHeader>
            <CardTitle className="text-destructive">Unable to load playlist</CardTitle>
            <CardDescription>{error.message}</CardDescription>
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

  if (!data) {
    return null
  }

  const { playlist, songs } = data

  return (
    <div className="flex justify-center px-4 py-10">
      <div className="w-full max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{playlist.name}</h1>
            <p className="text-muted-foreground">
              {playlist.description || 'No description'} • {playlist.visibility}
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            Created {new Date(playlist.created_at).toLocaleString()}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Songs</CardTitle>
            <CardDescription>
              {songs.length} {songs.length === 1 ? 'song' : 'songs'}
            </CardDescription>
          </CardHeader>
          <CardContent className="divide-y">
            {songs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No songs added yet.</p>
            ) : (
              songs.map((song) => (
                <div key={song.sid} className="flex items-center justify-between py-3 gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                      {song.position}
                    </div>
                    <div>
                      <p className="font-medium">{song.song_title}</p>
                      <p className="text-sm text-muted-foreground">
                        {song.artist_names || 'Unknown artist'} • {song.album_title || 'Unknown album'}
                      </p>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">SID: {song.sid}</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
