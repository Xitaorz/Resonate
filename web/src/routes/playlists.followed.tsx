import { useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useAuth } from '@/hooks/use-auth'

type Playlist = {
  plstid: number
  uid: number
  name: string
  description: string | null
  visibility: string
  created_at: string
}

type FollowedPlaylist = Playlist & { followed_at: string }

export const Route = createFileRoute('/playlists/followed')({
  component: FollowedPlaylistsPage,
})

function FollowedPlaylistsPage() {
  const auth = useAuth()
  const uid = auth?.user?.uid ? String(auth.user.uid) : ''
  const isAuthed = Boolean(uid)
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')

  const {
    data: followed = [],
    isLoading: followedLoading,
    isFetching: followedFetching,
    error: followedError,
    refetch: refetchFollowed,
  } = useQuery<FollowedPlaylist[], Error>({
    queryKey: ['followed-playlists', uid],
    enabled: isAuthed,
    queryFn: async () => {
      const res = await fetch(`/api/users/${uid}/followed-playlists`, {
        headers: { 'X-User-Id': uid },
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload?.error || 'Failed to load followed playlists')
      return payload.playlists ?? []
    },
    staleTime: 30_000,
  })

  const {
    data: searchResults = [],
    isFetching: searchFetching,
    error: searchError,
    refetch: refetchSearch,
  } = useQuery<Playlist[], Error>({
    queryKey: ['search-playlists', search, uid],
    enabled: search.trim().length >= 2,
    queryFn: async () => {
      const res = await fetch(`/api/playlists/search?q=${encodeURIComponent(search)}`, {
        headers: uid ? { 'X-User-Id': uid } : undefined,
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload?.error || 'Failed to search playlists')
      return payload.playlists ?? []
    },
    staleTime: 10_000,
  })

  const followPlaylist = useMutation({
    mutationFn: async (plstid: number) => {
      if (!isAuthed) throw new Error('Log in to follow playlists')
      const res = await fetch(`/api/playlists/${plstid}/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': uid },
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload?.error || 'Failed to follow playlist')
      return payload
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followed-playlists', uid] })
      refetchFollowed()
    },
  })

  const unfollowPlaylist = useMutation({
    mutationFn: async (plstid: number) => {
      if (!isAuthed) throw new Error('Log in to unfollow playlists')
      const res = await fetch(`/api/playlists/${plstid}/follow`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': uid },
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload?.error || 'Failed to unfollow playlist')
      return payload
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['followed-playlists', uid] })
      refetchFollowed()
    },
  })

  const isFollowing = useMemo(() => {
    const set = new Set<number>()
    followed.forEach((pl) => set.add(pl.plstid))
    return set
  }, [followed])

  const authRequiredCopy = useMemo(
    () => ({
      title: 'Log in to view followed playlists',
      description: 'Sign in to see playlists you follow.',
    }),
    []
  )

  const followedContent = (() => {
    if (!isAuthed) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>{authRequiredCopy.title}</CardTitle>
            <CardDescription>{authRequiredCopy.description}</CardDescription>
          </CardHeader>
        </Card>
      )
    }
    if (followedLoading) {
      return (
        <div className="grid gap-3">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="animate-pulse bg-muted/40">
              <div className="h-16 rounded-lg bg-muted" />
            </Card>
          ))}
        </div>
      )
    }
    if (followedError) {
      return (
        <Card className="border-destructive/40 bg-destructive/10">
          <CardHeader>
            <CardTitle className="text-destructive">Unable to load followed playlists</CardTitle>
            <CardDescription>{followedError.message}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={() => refetchFollowed()} disabled={followedFetching}>
              Try again
            </Button>
          </CardContent>
        </Card>
      )
    }
    if (!followed || followed.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>No followed playlists</CardTitle>
            <CardDescription>Follow public playlists to keep up to date.</CardDescription>
          </CardHeader>
        </Card>
      )
    }
    return (
      <div className="grid gap-3">
        {followed.map((pl) => (
          <Card key={pl.plstid} className="hover:border-primary/50 transition-colors">
            <CardHeader>
              <CardTitle className="text-lg">{pl.name}</CardTitle>
              <CardDescription className="line-clamp-2">
                {pl.description || 'No description'}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {pl.visibility} • followed {new Date(pl.followed_at).toLocaleString()}
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/playlists/${pl.plstid}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  View
                </a>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={unfollowPlaylist.isPending}
                  onClick={() => unfollowPlaylist.mutate(pl.plstid)}
                >
                  {unfollowPlaylist.isPending ? 'Unfollowing...' : 'Unfollow'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  })()

  const searchContent = (() => {
    if (searchError) {
      return (
        <Card className="border-destructive/40 bg-destructive/10">
          <CardHeader>
            <CardTitle className="text-destructive">Search failed</CardTitle>
            <CardDescription>{searchError.message}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => refetchSearch()} disabled={searchFetching}>
              Retry
            </Button>
          </CardContent>
        </Card>
      )
    }
    if (search.trim().length < 2) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>Find playlists to follow</CardTitle>
            <CardDescription>Type at least 2 characters to search for public playlists.</CardDescription>
          </CardHeader>
        </Card>
      )
    }
    if (searchFetching) {
      return (
        <div className="grid gap-3">
          {[0, 1].map((i) => (
            <Card key={i} className="animate-pulse bg-muted/40">
              <div className="h-16 rounded-lg bg-muted" />
            </Card>
          ))}
        </div>
      )
    }
    if (!searchResults || searchResults.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>No playlists found</CardTitle>
            <CardDescription>Try another search term.</CardDescription>
          </CardHeader>
        </Card>
      )
    }
    return (
      <div className="grid gap-3">
        {searchResults.map((pl) => {
          const mine = uid && Number(uid) === pl.uid
          const following = isFollowing.has(pl.plstid)
          return (
            <Card key={pl.plstid} className="hover:border-primary/50 transition-colors">
              <CardHeader>
                <CardTitle className="text-lg">{pl.name}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {pl.description || 'No description'} • {pl.visibility}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  Owner UID: {pl.uid} • Created {new Date(pl.created_at).toLocaleString()}
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={`/playlists/${pl.plstid}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                  >
                    View
                  </a>
                  {!mine ? (
                    <Button
                      size="sm"
                      variant={following ? 'secondary' : 'outline'}
                      disabled={followPlaylist.isPending || unfollowPlaylist.isPending || !isAuthed}
                      onClick={() =>
                        following
                          ? unfollowPlaylist.mutate(pl.plstid)
                          : followPlaylist.mutate(pl.plstid)
                      }
                    >
                      {following
                        ? unfollowPlaylist.isPending
                          ? 'Unfollowing...'
                          : 'Unfollow'
                        : followPlaylist.isPending
                          ? 'Following...'
                          : 'Follow'}
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">Yours</span>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  })()

  return (
    <div className="flex justify-center px-4 py-10">
      <div className="w-full max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Followed Playlists</h1>
            <p className="text-muted-foreground">
              {isAuthed ? 'Search and follow public playlists. Followed playlists stay up to date.' : authRequiredCopy.description}
            </p>
          </div>
          {isAuthed && (
            <Button size="sm" variant="outline" onClick={() => refetchFollowed()} disabled={followedFetching}>
              {followedFetching ? 'Refreshing...' : 'Refresh'}
            </Button>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="text-xl font-semibold tracking-tight">Search playlists to follow</h3>
          <Input
            placeholder="Search playlists by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {searchContent}
        </div>

        <div className="space-y-3">
          <h3 className="text-xl font-semibold tracking-tight">Your followed playlists</h3>
          <div className="max-h-96 overflow-y-auto pr-2">
            {followedContent}
          </div>
        </div>
      </div>
    </div>
  )
}

