import { useMemo, useState } from 'react'
import { Outlet, createFileRoute, useRouterState } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'

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

export const Route = createFileRoute('/playlists')({
  component: PlaylistsPage,
})

function PlaylistsPage() {
  const auth = useAuth()
  const uid = auth?.user?.uid ? String(auth.user.uid) : ''
  const isAuthed = Boolean(uid)
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
      if (!res.ok) throw new Error('Failed to create playlist')
      return res.json()
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
          <Card key={pl.plstid} className="hover:border-primary/50 transition-colors">
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
      <div className="flex justify-center px-4 py-10">
        <div className="w-full max-w-4xl space-y-6">
          <div className="flex flex-wrap items-center gap-3 justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">My Playlists</h1>
              <p className="text-muted-foreground">
                {isAuthed ? 'Manage your playlists.' : authRequiredCopy.description}
              </p>
            </div>
          </div>

          {isAuthed ? (
            <div className="grid gap-2 p-4 border rounded-xl border-border/60 bg-muted/30">
              <h3 className="font-semibold">Create playlist</h3>
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
                <option value="unlisted">Unlisted</option>
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
            <h3 className="text-xl font-semibold tracking-tight">Your playlists</h3>
            {myPlaylists}
          </div>
        </div>
      </div>
      <Outlet />
    </>
  )
}

