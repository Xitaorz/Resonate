import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Crown } from 'lucide-react'

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

type Ranking = {
  yearweek: number
  song_title: string
  album_title: string | null
  fav_count: number
  rank_in_week: number
}

type RankingResponse = {
  count: number
  rankings: Ranking[]
}

const fetchWeeklyRanking = async (): Promise<Ranking[]> => {
  const res = await fetch('/api/weekly-ranking')
  if (!res.ok) {
    throw new Error('Failed to load weekly ranking')
  }
  const data = (await res.json()) as RankingResponse
  return data.rankings ?? []
}

export const Route = createFileRoute('/weekly-ranking')({
  component: WeeklyRankingPage,
})

function formatYearWeek(yearweek: number): string {
  const year = Math.floor(yearweek / 100)
  const week = yearweek % 100
  return `Week ${week}, ${year}`
}

function WeeklyRankingPage() {
  const auth = useAuth()
  const isVip = auth?.user?.isvip === 1
  const { data, isLoading, error, refetch } = useQuery<Ranking[], Error>({
    queryKey: ['weekly-ranking'],
    queryFn: fetchWeeklyRanking,
    staleTime: 30_000,
  })

  const grouped = useMemo(() => {
    const bucket = new Map<number, Ranking[]>()
    for (const item of data ?? []) {
      const list = bucket.get(item.yearweek) ?? []
      list.push(item)
      bucket.set(item.yearweek, list)
    }

    return Array.from(bucket.entries())
      .sort(([a], [b]) => b - a)
      .map(([week, entries]) => ({
        week,
        entries: entries.sort((a, b) => a.rank_in_week - b.rank_in_week),
      }))
  }, [data])

  const content = (() => {
    if (isLoading) {
      return (
        <div className="grid gap-4">
          {[0, 1].map((idx) => (
            <Card key={idx} className="animate-pulse bg-muted/30">
              <div className="h-24 rounded-xl bg-muted" />
            </Card>
          ))}
        </div>
      )
    }

    if (error) {
      return (
        <Card className="border-destructive/40 bg-destructive/10">
          <CardHeader>
            <CardTitle className="text-destructive">Unable to load weekly ranking</CardTitle>
            <CardDescription>{error.message}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={() => refetch()}>
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
            <CardTitle>No favorites yet</CardTitle>
            <CardDescription>
              Weekly charts will appear once listeners start favoriting songs.
            </CardDescription>
          </CardHeader>
        </Card>
      )
    }

    return (
      <div className="space-y-6">
        {grouped.map(({ week, entries }) => (
          <Card key={week} className={isVip ? "border-amber-400/20 shadow-md shadow-amber-500/10" : ""}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-semibold">
                  {formatYearWeek(week)}
                </CardTitle>
                <CardDescription>Top 10 by favorites</CardDescription>
              </div>
              <div className="text-sm text-muted-foreground">Total songs: {entries.length}</div>
            </CardHeader>
            <CardContent className="space-y-3">
              {entries.map((entry) => (
                <div
                  key={`${week}-${entry.rank_in_week}-${entry.song_title}`}
                  className="flex items-center justify-between rounded-xl border border-border/60 px-4 py-3 bg-muted/30"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black font-semibold border border-border/60">
                      {entry.rank_in_week}
                    </div>
                    <div>
                      <p className="text-lg font-semibold leading-tight">{entry.song_title}</p>
                      <p className="text-sm text-muted-foreground">
                        {entry.album_title ? entry.album_title : 'Unknown album'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase text-muted-foreground tracking-wide">
                      Favorites
                    </p>
                    <p className="text-2xl font-semibold">{entry.fav_count}</p>
                  </div>
                </div>
              ))}
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
      <div className="w-full max-w-5xl space-y-6 relative">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight">
                {isVip ? (
                  <AuroraText className="text-3xl font-bold">Weekly Favorites</AuroraText>
                ) : (
                  'Weekly Favorites'
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
              Chart updates on schedule from the database snapshot.
            </p>
          </div>
        </div>
        {content}
      </div>
    </div>
  )
}
