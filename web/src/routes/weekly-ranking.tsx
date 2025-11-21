import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

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
  const { data, isLoading, isFetching, error, refetch } = useQuery<Ranking[], Error>({
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
          <Card key={week}>
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
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-white font-semibold">
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
    <div className="flex justify-center px-4 py-10">
      <div className="w-full max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Weekly Favorites</h1>
            <p className="text-muted-foreground">
              Live chart of the most favorited songs each week.
            </p>
          </div>
          <Button onClick={() => refetch()} disabled={isFetching}>
            {isFetching ? 'Refreshing…' : 'Refresh'}
          </Button>
        </div>
        {content}
      </div>
    </div>
  )
}
