import { useMemo, useState } from 'react'
import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2, Crown } from 'lucide-react'

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
import { AuroraText } from '@/components/ui/aurora-text'

type Playlist = {
  plstid: number
  uid: number
  name: string
  description: string | null
  visibility: string
  created_at: string
}

export const Route = createFileRoute('/playlists')({
  component: PlaylistsPage,
})

function PlaylistsPage() {
  const auth = useAuth()
  const uid = auth?.user?.uid ? String(auth.user.uid) : ''
  const isAuthed = Boolean(uid)
  const isVip = auth?.user?.isvip === 1
  const [form, setForm] = useState({ name: '', description: '', visibility: 'public' })
  const queryClient = useQueryClient()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  
  // Only show the main content on the exact /playlists route, not on child routes
  const isExactPlaylistsRoute = pathname === '/playlists'

  const {
    data: mine,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery<Playlist[], Error>({
    queryKey: ['playlists-page', uid],
    queryFn: async () => {
      const res = await fetch(`/api/users/${uid}/playlists`, { headers: { 'X-User-Id': uid } })
      if (!res.ok) throw new Error('Failed to load playlists')
      const payload = await res.json()
      return payload.playlists ?? []
    },
    enabled: isAuthed,
    staleTime: 30_000,
  })

  const createPlaylist = useMutation({
    mutationFn: async () => {
      if (!isAuthed) throw new Error('Log in required')
      const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-User-Id': uid },
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          visibility: form.visibility,
        }),
      })
      const payload = await res.json()
      if (!res.ok) {
        const errorMessage = payload?.error || 'Failed to create playlist'
        throw new Error(errorMessage)
      }
      return payload
    },
    onSuccess: async () => {
      setForm({ name: '', description: '', visibility: 'public' })
      await queryClient.invalidateQueries({ queryKey: ['playlists-page', uid] })
      refetch()
    },
  })

  const deletePlaylist = useMutation({
    mutationFn: async (plstid: number) => {
      if (!isAuthed) throw new Error('Log in required')
      const res = await fetch(`/api/playlists/${plstid}`, {
        method: 'DELETE',
        headers: { 'X-User-Id': uid },
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload?.error || 'Failed to delete playlist')
      return payload
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['playlists-page', uid] })
      refetch()
    },
  })

  const authRequiredCopy = useMemo(
    () => ({
      title: 'Log in to view playlists',
      description: 'Sign in to load and manage your playlists.',
    }),
    []
  )

  const myPlaylists = (() => {
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
    if (isLoading) {
      return (
        <div className="grid gap-3">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="animate-pulse bg-muted/40">
              <div className="h-20 rounded-lg bg-muted" />
            </Card>
          ))}
        </div>
      )
    }
    if (error) {
      return (
        <Card className="border-destructive/40 bg-destructive/10">
          <CardHeader>
            <CardTitle className="text-destructive">Unable to load playlists</CardTitle>
            <CardDescription>{error.message}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={() => refetch()} disabled={isFetching}>
              Try again
            </Button>
          </CardContent>
        </Card>
      )
    }
    if (!mine || mine.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>No playlists found</CardTitle>
            <CardDescription>Create a playlist to see it here.</CardDescription>
          </CardHeader>
        </Card>
      )
    }
    return (
      <div className="grid gap-3">
        {mine.map((pl) => (
          <Card key={pl.plstid} className={`hover:border-primary/50 transition-colors ${
            isVip ? "border-amber-400/20 shadow-md shadow-amber-500/10" : ""
          }`}>
            <CardHeader>
              <CardTitle className="text-lg">{pl.name}</CardTitle>
              <CardDescription className="line-clamp-2">
                {pl.description || 'No description'}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {pl.visibility} • {new Date(pl.created_at).toLocaleString()}
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
                  variant="destructive"
                  disabled={deletePlaylist.isPending}
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete "${pl.name}"? This action cannot be undone.`)) {
                      deletePlaylist.mutate(pl.plstid)
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  {deletePlaylist.isPending ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  })()

  // If we're on a child route (like /playlists/followed), 
  // only render the Outlet (child component), not the parent content
  if (!isExactPlaylistsRoute) {
    return <Outlet />
  }

  return (
    <>
      <div className={`flex justify-center px-4 py-10 min-h-screen ${
        isVip ? "bg-gradient-to-br from-amber-50/50 via-yellow-50/30 to-amber-50/50 dark:from-amber-950/20 dark:via-yellow-950/10 dark:to-amber-950/20" : ""
      }`}>
        {isVip && (
          <div className="fixed inset-0 bg-gradient-to-br from-amber-500/5 via-yellow-500/5 to-amber-500/5 pointer-events-none -z-10" />
        )}
        <div className="w-full max-w-4xl space-y-6 relative">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-semibold tracking-tight">
                  {isVip ? (
                    <AuroraText className="text-3xl font-bold">My Playlists</AuroraText>
                  ) : (
                    'My Playlists'
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
                {isAuthed ? 'Manage your playlists.' : authRequiredCopy.description}
              </p>
            </div>
          </div>

          {isAuthed ? (
            <div className={`grid gap-2 p-4 border rounded-xl ${
              isVip 
                ? "border-amber-400/40 bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-amber-500/10 shadow-lg shadow-amber-500/10" 
                : "border-border/60 bg-muted/30"
            }`}>
              <h3 className={`font-semibold ${isVip ? "text-amber-900 dark:text-amber-100" : ""}`}>Create playlist</h3>
              <Input
                placeholder="Playlist name"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
              <textarea
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="Description (optional)"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
              <select
                className="border rounded px-3 py-2 text-sm w-full"
                value={form.visibility}
                onChange={(e) => setForm((p) => ({ ...p, visibility: e.target.value }))}
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
              </select>
              <Button
                disabled={!form.name || createPlaylist.isPending}
                onClick={() => createPlaylist.mutate()}
              >
                {createPlaylist.isPending ? 'Creating...' : 'Create playlist'}
              </Button>
              {createPlaylist.isError ? (
                <p className="text-sm text-destructive">
                  {(createPlaylist.error as Error).message || 'Failed to create playlist'}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-3">
            <h3 className={`text-xl font-semibold tracking-tight ${isVip ? "text-amber-900 dark:text-amber-100" : ""}`}>
              Your playlists
            </h3>
            {myPlaylists}
          </div>
        </div>
      </div>
      <Outlet />
    </>
  )
}

