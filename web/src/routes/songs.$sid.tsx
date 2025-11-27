import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Crown } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Heart } from 'lucide-react'
import { RatingStars } from '@/components/RatingStars'
import { TagIcon } from '@/components/TagIcon'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/hooks/use-auth'
import { Link } from '@tanstack/react-router'
import { AuroraText } from '@/components/ui/aurora-text'

type SongDetail = {
  sid: string
  name: string
  release_date: string | null
  album_title: string | null
  album_id?: string | null
  avg_rating: number | null
  rating_count: number
  tags: string | null
  artist_name: string | null
  artist_ids: string | null
}

type UserRatingPayload = {
  rating: {
    rid: number
    rate_value: number
    uid: number
    sid: string
    comment: string | null
  } | null
}

async function fetchSongDetail(sid: string): Promise<SongDetail> {
  const res = await fetch(`/api/songs/${encodeURIComponent(sid)}`)
  let data: any = null
  try {
    data = await res.json()
  } catch {
    data = null
  }

  if (!res.ok || data?.error) {
    const message = typeof data?.error === 'string' ? data.error : 'Failed to load song details'
    throw new Error(message)
  }

  return {
    sid: data?.sid ?? sid,
    name: data?.name ?? data?.song_name ?? 'Unknown song',
    release_date: data?.release_date ?? null,
    album_title: data?.album_title ?? data?.album_name ?? null,
    album_id: data?.alid ?? data?.album_id ?? null,
    avg_rating: data?.avg_rating !== undefined && data?.avg_rating !== null ? Number(data.avg_rating) : null,
    rating_count: data?.rating_count !== undefined && data?.rating_count !== null ? Number(data.rating_count) : 0,
    tags: data?.tags ?? null,
    artist_name: data?.artist_name ?? null,
    artist_ids: data?.artist_ids ?? null,
  }
}

const formatDate = (value: string | null) => {
  if (!value) return 'Unknown release date'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString()
}

const safeJson = async (res: Response) => {
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

export const Route = createFileRoute('/songs/$sid')({
  component: SongDetailPage,
})

function SongDetailPage() {
  const { sid } = Route.useParams()
  const auth = useAuth()
  const authUid = auth?.user?.uid ?? null
  const isVip = auth?.user?.isvip === 1
  const queryClient = useQueryClient()
  const [selectedPlaylist, setSelectedPlaylist] = useState('')

  const {
    data,
    error,
    isLoading,
    isFetching,
    refetch,
  } = useQuery<SongDetail, Error>({
    queryKey: ['song-detail', sid],
    queryFn: () => fetchSongDetail(sid),
    staleTime: 30_000,
  })

  const {
    data: userRatingData,
    refetch: refetchUserRating,
    isLoading: userRatingLoading,
    error: userRatingError,
  } = useQuery<UserRatingPayload, Error>({
    queryKey: ['song-user-rating', sid, authUid],
    enabled: Boolean(authUid),
    queryFn: async () => {
      const res = await fetch(`/api/songs/${sid}/rating`, {
        headers: { 'X-User-Id': String(authUid) },
      })
      const payload = await safeJson(res)
      if (!res.ok) {
        const msg =
          (payload && typeof payload === 'object' && (payload as any).error) ||
          res.statusText ||
          'Failed to load your rating'
        throw new Error(msg)
      }
      return (payload as UserRatingPayload) || { rating: null }
    },
    staleTime: 10_000,
  })

  const rateSong = useMutation({
    mutationFn: async (rating: number) => {
      if (!authUid) throw new Error('Login required to rate')
      const res = await fetch(`/api/songs/${sid}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: Number(authUid), rate_value: rating }),
      })
      const payload = await safeJson(res)
      const errorMsg =
        (payload && typeof payload === 'object' && (payload as any).error) ||
        res.statusText ||
        'Failed to rate song'
      if (!res.ok) {
        throw new Error(errorMsg)
      }
      return payload
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['song-detail', sid] }),
        queryClient.invalidateQueries({ queryKey: ['song-user-rating', sid, authUid] }),
      ])
      refetch()
      refetchUserRating()
    },
  })

  const title = data?.name ?? 'Song details'
  const userRating = userRatingData?.rating?.rate_value ?? null

  const {
    data: playlists = [],
    isLoading: playlistsLoading,
    error: playlistsError,
    refetch: refetchPlaylists,
  } = useQuery<{ plstid: number; name: string }[], Error>({
    queryKey: ['song-playlists', authUid],
    enabled: Boolean(authUid),
    queryFn: async () => {
      const res = await fetch(`/api/users/${authUid}/playlists`, {
        headers: { 'X-User-Id': authUid! },
      })
      if (!res.ok) throw new Error('Failed to load playlists')
      const payload = await safeJson(res)
      return (payload as any)?.playlists ?? []
    },
    staleTime: 30_000,
  })

  const {
    data: favoritesData = [],
    error: favoritesError,
  } = useQuery<{ sid: string }[], Error>({
    queryKey: ['song-favorites', authUid],
    enabled: Boolean(authUid),
    queryFn: async () => {
      const res = await fetch(`/api/users/${authUid}/favorites`, {
        headers: { 'X-User-Id': authUid! },
      })
      const payload = await safeJson(res)
      if (!res.ok) {
        const msg = (payload as any)?.error || 'Failed to load favorites'
        throw new Error(msg)
      }
      return Array.isArray((payload as any)?.favorites) ? (payload as any).favorites : []
    },
    staleTime: 30_000,
  })

  const favorites = useMemo(() => {
    const set = new Set<string>()
    favoritesData.forEach((f: any) => {
      if (f?.sid) set.add(String(f.sid))
    })
    return set
  }, [favoritesData])

  const favoriteSong = useMutation({
    mutationFn: async () => {
      if (!authUid) throw new Error('Login required')
      const res = await fetch('/api/favorites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': authUid.toString(),
        },
        body: JSON.stringify({ sid }),
      })
      const payload = await safeJson(res)
      const msg = (payload as any)?.error || res.statusText || 'Failed to favorite song'
      if (!res.ok) throw new Error(msg)
      return payload
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['song-favorites', authUid] })
      queryClient.invalidateQueries({ queryKey: ['song-detail', sid] })
      queryClient.invalidateQueries({ queryKey: ['favorites', authUid] })
    },
  })

  const unfavoriteSong = useMutation({
    mutationFn: async () => {
      if (!authUid) throw new Error('Login required')
      const res = await fetch('/api/favorites', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': authUid.toString(),
        },
        body: JSON.stringify({ sid }),
      })
      const payload = await safeJson(res)
      const msg = (payload as any)?.error || res.statusText || 'Failed to remove favorite'
      if (!res.ok) throw new Error(msg)
      return payload
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['song-favorites', authUid] })
      queryClient.invalidateQueries({ queryKey: ['song-detail', sid] })
      queryClient.invalidateQueries({ queryKey: ['favorites', authUid] })
    },
  })

  const addToPlaylist = useMutation({
    mutationFn: async () => {
      if (!authUid || !selectedPlaylist) throw new Error('Select a playlist')
      const res = await fetch(`/api/playlists/${selectedPlaylist}/songs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': authUid,
        },
        body: JSON.stringify({ sid }),
      })
      const payload = await safeJson(res)
      const msg = (payload as any)?.error || res.statusText || 'Failed to add to playlist'
      if (!res.ok) throw new Error(msg)
      return payload
    },
    onSuccess: () => {
      setSelectedPlaylist('')
      refetchPlaylists()
    },
  })

  if (isLoading) {
    return (
      <div className="flex justify-center px-4 py-10">
        <Card className="w-full max-w-4xl animate-pulse border-border/70 bg-muted/30">
          <div className="h-40 rounded-lg bg-muted" />
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex justify-center px-4 py-10">
        <Card className="w-full max-w-3xl border-destructive/40 bg-destructive/10">
          <CardHeader>
            <CardTitle className="text-destructive">Unable to load song</CardTitle>
            <CardDescription>{error.message}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="destructive" onClick={() => refetch()} disabled={isFetching}>
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!data) return null

  const avg = data.avg_rating ?? 0

  return (
    <div className={`flex justify-center px-4 py-10 min-h-screen ${
      isVip ? "bg-gradient-to-br from-amber-50/50 via-yellow-50/30 to-amber-50/50 dark:from-amber-950/20 dark:via-yellow-950/10 dark:to-amber-950/20" : ""
    }`}>
      {isVip && (
        <div className="fixed inset-0 bg-gradient-to-br from-amber-500/5 via-yellow-500/5 to-amber-500/5 pointer-events-none -z-10" />
      )}
      <div className="w-full max-w-4xl space-y-6 relative">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight">
                {isVip ? (
                  <AuroraText className="text-3xl font-bold">{title}</AuroraText>
                ) : (
                  title
                )}
              </h1>
              {isVip && (
                <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 px-2.5 py-1 text-xs font-bold text-amber-900 shadow-md shadow-amber-500/50">
                  <Crown className="size-3 fill-amber-900" />
                  VIP
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {(() => {
                const artistNames = (data.artist_name || "").split(",").map((n: string) => n.trim()).filter(Boolean);
                const artistIds = (data.artist_ids || "").split(",").map((i: string) => i.trim()).filter(Boolean);
                if (artistNames.length > 0) {
                  return (
                    <>
                      <span>Artist: </span>
                      {artistNames.map((name: string, index: number) => (
                        <span key={`top-${data.sid}-artist-${index}`}>
                          {index > 0 ? <span>, </span> : null}
                          {artistIds[index] ? (
                            <Link
                              to="/artist/$artistId"
                              params={{ artistId: artistIds[index] }}
                              className="text-blue-500 hover:underline"
                            >
                              {name}
                            </Link>
                          ) : (
                            <span>{name}</span>
                          )}
                        </span>
                      ))}
                      <span aria-hidden="true"> • </span>
                    </>
                  );
                }
                return null;
              })()}
              {data.album_title || 'Unknown album'} <span aria-hidden="true">•</span> {formatDate(data.release_date)}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            Refresh
          </Button>
        </div>

        <Card className={`border-border/70 shadow-sm ${
          isVip ? "border-2 border-amber-400/30 shadow-lg shadow-amber-500/20 relative overflow-hidden" : ""
        }`}>
          {isVip && (
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-yellow-500/5 to-amber-500/5 pointer-events-none" />
          )}
          <CardHeader className="relative">
            <CardTitle className={`text-2xl ${isVip ? "text-amber-900 dark:text-amber-100" : ""}`}>
              {data.name}
            </CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-2 text-sm">
              {(() => {
                const artistNames = (data.artist_name || "").split(",").map((n: string) => n.trim()).filter(Boolean);
                const artistIds = (data.artist_ids || "").split(",").map((i: string) => i.trim()).filter(Boolean);
                if (artistNames.length > 0) {
                  return (
                    <>
                      <span className="text-muted-foreground">Artist:</span>
                      {artistNames.map((name: string, index: number) => (
                        <span key={`${data.sid}-artist-${index}`}>
                          {index > 0 ? <span className="text-muted-foreground">, </span> : null}
                          {artistIds[index] ? (
                            <Link
                              to="/artist/$artistId"
                              params={{ artistId: artistIds[index] }}
                              className="text-blue-500 hover:underline"
                            >
                              {name}
                            </Link>
                          ) : (
                            <span>{name}</span>
                          )}
                        </span>
                      ))}
                      <Separator orientation="vertical" className="h-4" />
                    </>
                  );
                }
                return null;
              })()}
              <span className={`font-medium ${isVip ? "text-amber-800 dark:text-amber-200" : "text-foreground"}`}>
                {data.album_title || 'Unknown album'}
              </span>
              <Separator orientation="vertical" className="h-4" />
              <span>{formatDate(data.release_date)}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 relative">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className={`rounded-lg border p-4 ${
                isVip ? "border-amber-400/40 bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-amber-500/10 shadow-sm" : "border-border/70 bg-muted/20"
              }`}>
                <p className="text-xs font-medium uppercase text-muted-foreground">Average rating</p>
                <div className="mt-2 flex items-center gap-3">
                  <RatingStars value={avg} disabled size={18} />
                  <div className="text-sm text-muted-foreground">
                    {avg ? avg.toFixed(2) : 'No ratings yet'}
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{data.rating_count} rating{data.rating_count === 1 ? '' : 's'}</p>
              </div>
              <div className={`rounded-lg border p-4 ${
                isVip ? "border-amber-400/40 bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-amber-500/10 shadow-sm" : "border-border/70 bg-muted/20"
              }`}>
                <p className={`text-xs font-medium uppercase ${isVip ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground"}`}>
                  Your rating
                </p>
                {authUid ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <RatingStars
                        value={userRating ?? 0}
                        onChange={(value) => rateSong.mutate(value)}
                        disabled={rateSong.isPending}
                        size={18}
                      />
                      <span className="text-sm text-muted-foreground">
                        {userRating ? `${userRating}/5` : userRatingLoading ? 'Loading...' : 'Not rated yet'}
                      </span>
                    </div>
                    {rateSong.isPending ? (
                      <p className="text-xs text-muted-foreground">Submitting rating...</p>
                    ) : null}
                    {userRatingError ? (
                      <p className="text-xs text-destructive">Failed to load your rating.</p>
                    ) : null}
                    {rateSong.isError ? (
                      <p className="text-xs text-destructive">
                        {(rateSong.error as Error).message || 'Failed to rate'}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Log in to rate this song.</p>
                )}
              </div>
              <div className={`rounded-lg border p-4 ${
                isVip ? "border-amber-400/40 bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-amber-500/10 shadow-sm" : "border-border/70 bg-muted/20"
              }`}>
                <p className={`text-xs font-medium uppercase ${isVip ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground"}`}>
                  Release
                </p>
                <p className="mt-2 text-sm text-foreground">{formatDate(data.release_date)}</p>
                <div className="text-xs text-muted-foreground">
                  Album:{' '}
                  {data.album_id ? (
                    <Link
                      to="/albums/$albumId"
                      params={{ albumId: data.album_id }}
                      className="text-primary hover:underline"
                    >
                      {data.album_title || 'View album'}
                    </Link>
                  ) : (
                    data.album_title || 'Unknown album'
                  )}
                </div>
              </div>
            </div>

            <Separator />

            <div className={`rounded-lg border border-dashed p-4 ${
              isVip ? "border-amber-400/40 bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-amber-500/10" : "border-border/70 bg-muted/10"
            }`}>
              <p className={`text-xs font-medium uppercase mb-2 ${
                isVip ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground"
              }`}>
                Tags
              </p>
              {data.tags ? (
                <div className="flex flex-wrap gap-2">
                  {data.tags
                    .split(',')
                    .map((tag: string) => tag.trim())
                    .filter(Boolean)
                    .map((tag) => (
                      <TagIcon key={tag} tag={tag} />
                    ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No tags found for this song.</p>
              )}
            </div>

            <div className={`rounded-lg border p-4 space-y-3 ${
              isVip ? "border-amber-400/40 bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-amber-500/10" : "border-border/70 bg-muted/20"
            }`}>
              <p className={`text-xs font-medium uppercase ${
                isVip ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground"
              }`}>
                Actions
              </p>
              {!authUid ? (
                <p className="text-sm text-muted-foreground">Log in to favorite or add to playlists.</p>
              ) : (
                <>
                  <div className="rounded border border-border/60 bg-background/40 p-3 space-y-2">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Favorite</p>
                    <div className="flex flex-wrap items-center gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          favorites.has(sid) ? unfavoriteSong.mutate() : favoriteSong.mutate()
                        }
                        disabled={favoriteSong.isPending || unfavoriteSong.isPending}
                        className="min-w-[140px] flex items-center gap-2"
                      >
                        <Heart
                          className={`size-4 ${favorites.has(sid) ? 'text-red-500 fill-red-500' : ''}`}
                          fill={favorites.has(sid) ? 'currentColor' : 'none'}
                        />
                        {favorites.has(sid)
                          ? unfavoriteSong.isPending
                            ? 'Removing...'
                            : 'Unfavorite'
                          : favoriteSong.isPending
                            ? 'Saving...'
                            : 'Favorite'}
                      </Button>
                      {favoritesError ? (
                        <p className="text-xs text-destructive">Favorites unavailable.</p>
                      ) : null}
                      {favoriteSong.isError ? (
                        <p className="text-xs text-destructive">
                          {(favoriteSong.error as Error).message || 'Failed to favorite'}
                        </p>
                      ) : null}
                      {unfavoriteSong.isError ? (
                        <p className="text-xs text-destructive">
                          {(unfavoriteSong.error as Error).message || 'Failed to remove favorite'}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="rounded border border-border/60 bg-background/40 p-3 space-y-2">
                    <p className="text-xs font-semibold uppercase text-muted-foreground">Add to playlist</p>
                    {playlistsLoading ? (
                      <p className="text-sm text-muted-foreground">Loading playlists...</p>
                    ) : playlistsError ? (
                      <div className="text-sm text-destructive space-y-1">
                        <p>Failed to load playlists.</p>
                        <Button size="sm" variant="outline" onClick={() => refetchPlaylists()}>
                          Retry
                        </Button>
                      </div>
                    ) : playlists.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Create a playlist first.</p>
                    ) : (
                      <>
                        <select
                          className="w-full rounded border px-3 py-2 text-sm"
                          value={selectedPlaylist}
                          onChange={(e) => setSelectedPlaylist(e.target.value)}
                        >
                          <option value="">Select a playlist</option>
                          {playlists.map((pl) => (
                            <option key={pl.plstid} value={pl.plstid}>
                              {pl.name}
                            </option>
                          ))}
                        </select>
                        {addToPlaylist.isError ? (
                          <p className="text-xs text-destructive">
                            {(addToPlaylist.error as Error).message || 'Failed to add song'}
                          </p>
                        ) : null}
                        <Button
                          size="sm"
                          className="w-full sm:w-auto"
                          disabled={!selectedPlaylist || addToPlaylist.isPending}
                          onClick={() => addToPlaylist.mutate()}
                        >
                          {addToPlaylist.isPending ? 'Adding...' : 'Add to playlist'}
                        </Button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
