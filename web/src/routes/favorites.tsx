import { useEffect, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Heart } from 'lucide-react'

import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type Favorite = {
  sid: string
  song_title: string
  album_title: string
  artist_names: string
  favored_at: string
}

export const Route = createFileRoute('/favorites')({
  component: FavoritesPage,
})

function FavoritesPage() {
  const [uid, setUid] = useState('1')
  const queryClient = useQueryClient()

  useEffect(() => {
    const stored = localStorage.getItem('resonate_auth')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (parsed?.user?.uid) {
          setUid(String(parsed.user.uid))
        }
      } catch {
        // ignore parse errors
      }
    }
  }, [])

  const { data, error, isLoading, isFetching, refetch } = useQuery<Favorite[], Error>({
    queryKey: ['favorites', uid],
    enabled: !!uid,
    queryFn: async () => {
      const res = await fetch(`/api/users/${uid}/favorites`, {
        headers: { 'X-User-Id': uid },
      })
      if (!res.ok) throw new Error('Failed to load favorites')
      const payload = await res.json()
      return payload.favorites ?? []
    },
    staleTime: 30_000,
  })

  const unfavorite = useMutation({
    mutationFn: async (sid: string) => {
      const res = await fetch('/api/favorites', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': uid,
        },
        body: JSON.stringify({ sid }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        const msg = (payload as any)?.error || 'Failed to remove favorite'
        throw new Error(msg)
      }
      return payload
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites', uid] })
    },
  })

  const content = (() => {
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
            <CardTitle className="text-destructive">Unable to load favorites</CardTitle>
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
      )
    }
    if (!data || data.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>No favorites yet</CardTitle>
            <CardDescription>Tap the heart on search results to favorite a song.</CardDescription>
          </CardHeader>
        </Card>
      )
    }
    return (
      <div className="grid gap-3">
        {data.map((fav) => (
          <Link
            key={fav.sid}
            to="/songs/$sid"
            params={{ sid: fav.sid }}
            className="block"
          >
            <Card className="hover:border-primary/50 transition-colors hover:-translate-y-[1px]">
              <CardHeader>
                <CardTitle className="text-lg">{fav.song_title}</CardTitle>
                <CardDescription>
                  {fav.artist_names || 'Unknown artist'} • {fav.album_title || 'Unknown album'}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
                <span>Favorited at {new Date(fav.favored_at).toLocaleString()}</span>
                <button
                  className="flex items-center gap-1 text-destructive text-xs font-semibold"
                  onClick={(e) => {
                    e.preventDefault()
                    unfavorite.mutate(fav.sid)
                  }}
                  disabled={unfavorite.isPending}
                >
                  <Heart className="h-4 w-4" />
                  {unfavorite.isPending ? 'Unfavoriting...' : 'Unfavorite'}
                </button>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    )
  })()

  return (
    <div className="flex justify-center px-4 py-10">
      <div className="w-full max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Favorites</h1>
            <p className="text-muted-foreground">Songs you have favorited.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">User ID</span>
            <Input
              className="w-28"
              value={uid}
              onChange={(e) => setUid(e.target.value)}
              type="number"
              min={1}
            />
          </div>
        </div>
        {content}
      </div>
    </div>
  )
}
