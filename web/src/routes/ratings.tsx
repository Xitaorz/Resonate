import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'

type Rating = {
  song_name: string
  artist_name: string
  avg_rating: number
  rating_count: number
}

type RatingsResponse = {
  count: number
  ratings: Rating[]
}

const fetchRatings = async (): Promise<Rating[]> => {
  const res = await fetch('/api/ratings/average')
  if (!res.ok) {
    throw new Error('Failed to load song ratings')
  }
  const data = (await res.json()) as RatingsResponse
  return data.ratings ?? []
}

export const Route = createFileRoute('/ratings')({
  component: RatingsPage,
})

function RatingsPage() {
  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery<Rating[], Error>({
    queryKey: ['ratings'],
    queryFn: fetchRatings,
    staleTime: 30_000,
  })

  const content = (() => {
    if (isLoading) {
      return (
        <div className="grid gap-4">
          {[0, 1, 2].map((index) => (
            <Card key={index} className="animate-pulse bg-muted/30">
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
            <CardTitle className="text-destructive">
              Unable to load ratings
            </CardTitle>
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
            <CardTitle>No ratings yet</CardTitle>
            <CardDescription>
              Ratings will appear here once listeners start sharing feedback.
            </CardDescription>
          </CardHeader>
        </Card>
      )
    }

    return (
      <div className="grid gap-4">
        {data.map((rating) => (
          <Card key={`${rating.song_name}-${rating.artist_name}`}>
            <CardHeader>
              <CardTitle className="text-xl">{rating.song_name}</CardTitle>
              <CardDescription>{rating.artist_name}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Average rating</p>
                <p className="text-3xl font-semibold">
                  {Number(rating.avg_rating).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total reviews</p>
                <p className="text-2xl font-semibold">{rating.rating_count}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  })()

  return (
    <div className="flex justify-center px-4 py-10">
      <div className="w-full max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              Listener Ratings
            </h1>
            <p className="text-muted-foreground">
              Live snapshot of song sentiment sourced from the analytics API.
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
