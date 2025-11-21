import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export function UserProfileSkeleton({ uid }: { uid: string }) {
  const placeholders = [0, 1, 2, 3]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Loading profile…</CardTitle>
        <CardDescription>Fetching details for user {uid}.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          {placeholders.map((item) => (
            <div
              key={item}
              className="rounded-xl border border-border/60 bg-muted/30 p-4 shadow-xs"
            >
              <div className="mb-2 h-4 w-24 animate-pulse rounded bg-muted" />
              <div className="h-6 w-32 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
