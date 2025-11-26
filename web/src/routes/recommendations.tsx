import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Crown } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useAuth } from '@/hooks/use-auth'
import { AuroraText } from '@/components/ui/aurora-text'

type Recommendation = {
  sid: string
  name: string
  avg_rating: number | null
  matched_tags: number
  tag_match_score: number
  recommendation_score: number
}

export const Route = createFileRoute('/recommendations')({
  component: RecommendationsPage,
})

function RecommendationsPage() {
  const [uid, setUid] = useState<string | null>(null)
  const auth = useAuth()
  const isVip = auth?.user?.isvip === 1

  useEffect(() => {
    const stored = localStorage.getItem('resonate_auth')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        if (parsed?.user?.uid) setUid(String(parsed.user.uid))
      } catch {
        setUid(null)
      }
    }
  }, [])

  const {
    data = [],
    error,
    isLoading,
    isFetching,
    refetch,
  } = useQuery<Recommendation[], Error>({
    queryKey: ['recommendations', uid],
    enabled: Boolean(uid),
    queryFn: async () => {
      const res = await fetch(`/api/recommendations/${uid}`)
      const payload = await res.json()
      if (!res.ok || payload?.error) {
        throw new Error(payload?.error || 'Failed to load recommendations')
      }
      const recs = Array.isArray(payload?.recommendations) ? payload.recommendations : []
      const normalized = recs.map((rec: any) => ({
        sid: String(rec.sid || ''),
        name: rec.name || rec.song_title || 'Unknown song',
        avg_rating: rec.avg_rating !== null && rec.avg_rating !== undefined ? Number(rec.avg_rating) : 0,
        matched_tags: Number(rec.matched_tags ?? 0),
        tag_match_score: Number(rec.tag_match_score ?? 0),
        recommendation_score: Number(rec.recommendation_score ?? 0),
      }))
      console.log('Recommendations normalized', normalized)
      return normalized
    },
    staleTime: 30_000,
  })

  const authRequiredCopy = useMemo(
    () => ({
      title: 'Log in to see recommendations',
      description: 'Sign in so we can tailor picks based on your playlists.',
    }),
    [],
  )

  const content = (() => {
    if (!uid) {
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
            <CardTitle className="text-destructive">Unable to load recommendations</CardTitle>
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
    if (!data || data.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>No recommendations yet</CardTitle>
            <CardDescription>Build a playlist to get personalized suggestions.</CardDescription>
          </CardHeader>
        </Card>
      )
    }

    return (
      <div className="grid gap-3">
        {data.map((rec, idx) => (
          <Card key={rec.sid} className={`hover:border-primary/50 transition-colors ${
            isVip ? "border-amber-400/20 shadow-md shadow-amber-500/10" : ""
          }`}>
            <CardHeader className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                  {idx + 1}
                </div>
                <div>
                  <CardTitle className="text-lg">{rec.name}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <Metric
                  label="Rec score"
                  value={Number.isFinite(rec.recommendation_score) ? rec.recommendation_score.toFixed(2) : '0.00'}
                />
                <Metric
                  label="Avg rating"
                  value={Number.isFinite(rec.avg_rating ?? NaN) ? Number(rec.avg_rating).toFixed(2) : '0.00'}
                />
                <Metric label="Matched tags" value={`${rec.matched_tags} tags`} />
              </div>
              <Separator />
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link to="/songs/$sid" params={{ sid: rec.sid }}>
                    View song
                  </Link>
                </Button>
                <Button variant="secondary" size="sm" onClick={() => refetch()} disabled={isFetching}>
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  })()

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
                  <AuroraText className="text-3xl font-bold">Recommendations</AuroraText>
                ) : (
                  'Recommendations'
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
              Personalized picks based on your playlists and ratings.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching || !uid}>
            {isFetching ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
        {content}
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-muted/20 p-3 space-y-1">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-base font-semibold">{value}</p>
    </div>
  )
}
