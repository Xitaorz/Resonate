import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import type { KeyboardEvent } from 'react'
import { Crown } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'
import { AuroraText } from '@/components/ui/aurora-text'

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
  const auth = useAuth()
  const isVip = auth?.user?.isvip === 1
  const headerUid = auth?.user?.uid

  const { data, isLoading, error, refetch, isFetching } = useQuery<PlaylistDetail, Error>({
    queryKey: ['playlist-detail', plstid, headerUid],
    queryFn: async () => {
      const headers =
        headerUid !== undefined
          ? {
              'X-User-Id': headerUid,
            }
          : undefined
      const res = await fetch(`/api/playlists/${plstid}`, { headers })
      if (!res.ok) throw new Error('Failed to load playlist')
      return (await res.json()) as PlaylistDetail
    },
    staleTime: 30_000,
  })

  const openSong = (sid: string) => {
    void navigate({ to: '/songs/$sid', params: { sid } })
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
                onClick={() => {
                  void refetch()
                }}
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
    <div className={`flex justify-center px-4 py-10 min-h-screen ${
      isVip ? "bg-gradient-to-br from-amber-50/50 via-yellow-50/30 to-amber-50/50 dark:from-amber-950/20 dark:via-yellow-950/10 dark:to-amber-950/20" : ""
    }`}>
      {isVip && (
        <div className="fixed inset-0 bg-gradient-to-br from-amber-500/5 via-yellow-500/5 to-amber-500/5 pointer-events-none -z-10" />
      )}
      <div className="w-full max-w-4xl space-y-6 relative">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight">
                {isVip ? (
                  <AuroraText className="text-3xl font-bold">{playlist.name}</AuroraText>
                ) : (
                  playlist.name
                )}
              </h1>
              {isVip && (
                <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 px-2.5 py-1 text-xs font-bold text-amber-900 shadow-md shadow-amber-500/50">
                  <Crown className="size-3 fill-amber-900" />
                  VIP
                </span>
              )}
            </div>
            <p className="text-muted-foreground">
              {playlist.description || 'No description'} • {playlist.visibility}
            </p>
          </div>
          <div className="text-sm text-muted-foreground">
            Created {new Date(playlist.created_at).toLocaleString()}
          </div>
        </div>

        <Card className={isVip ? "border-2 border-amber-400/30 shadow-lg shadow-amber-500/20 relative overflow-hidden" : ""}>
          {isVip && (
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-yellow-500/5 to-amber-500/5 pointer-events-none" />
          )}
          <CardHeader className="relative">
            <CardTitle className={isVip ? "text-amber-900 dark:text-amber-100" : ""}>Songs</CardTitle>
            <CardDescription>
              {songs.length} {songs.length === 1 ? 'song' : 'songs'}
            </CardDescription>
          </CardHeader>
          <CardContent className="divide-y relative">
            {songs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No songs added yet.</p>
            ) : (
              songs.map((song) => (
                <div
                  key={song.sid}
                  className={`flex items-center justify-between py-3 gap-4 cursor-pointer transition rounded-lg px-2 -mx-2 ${
                    isVip 
                      ? "hover:bg-amber-400/20 hover:border-l-2 hover:border-amber-400/50" 
                      : "hover:bg-muted/50"
                  }`}
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
