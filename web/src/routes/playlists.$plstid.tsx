import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import type { KeyboardEvent } from 'react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

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
  const navigate = useNavigate()

  const { data, isLoading, error, refetch, isFetching } = useQuery<PlaylistDetail, Error>({
    queryKey: ['playlist-detail', plstid],
    queryFn: async () => {
      const res = await fetch(`/api/playlists/${plstid}`)
      if (!res.ok) throw new Error('Failed to load playlist')
      return res.json()
    },
    staleTime: 30_000,
  })

  const openSong = (sid: string) => {
    navigate({ to: '/songs/$sid', params: { sid } })
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>, sid: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openSong(sid)
    }
  }

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
            <button
              className="text-sm text-primary underline"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              {isFetching ? 'Retrying…' : 'Try again'}
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) return null

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
                <div
                  key={song.sid}
                  className="flex items-center justify-between py-3 gap-4 cursor-pointer transition hover:bg-muted/50 rounded-lg px-2 -mx-2"
                  role="button"
                  tabIndex={0}
                  onClick={() => openSong(song.sid)}
                  onKeyDown={(event) => handleKeyDown(event, song.sid)}
                  aria-label={`Open details for ${song.song_title}`}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
                      {song.position}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium hover:text-primary transition-colors">{song.song_title}</p>
                      <p className="text-sm text-muted-foreground">
                        {song.artist_names || 'Unknown artist'} • {song.album_title || 'Unknown album'}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
