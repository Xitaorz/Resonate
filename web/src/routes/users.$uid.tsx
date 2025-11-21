import { useMemo, useState, type FormEvent } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type UserProfile = {
  uid: number
  username: string
  email: string
  gender: string | null
  age: number | null
  street: string | null
  city: string | null
  province: string | null
  mbti: string | null
  hobbies: string[]
  created_at?: string
  updated_at?: string
}

const fetchUserProfile = async (uid: string): Promise<UserProfile> => {
  const res = await fetch(`/api/users/${uid}`)

  let body: any = {}
  try {
    body = await res.json()
  } catch {
    body = {}
  }

  if (!res.ok || body?.error) {
    const message = typeof body?.error === 'string' ? body.error : `Unable to load user ${uid}`
    throw new Error(message)
  }

  return body as UserProfile
}

export const Route = createFileRoute('/users/$uid')({
  component: UserProfilePage,
})

function formatDate(value?: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value || '—'}</span>
    </div>
  )
}

function UserProfilePage() {
  const { uid } = Route.useParams()
  const navigate = useNavigate()
  const [userIdInput, setUserIdInput] = useState(uid)

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery<UserProfile, Error>({
    queryKey: ['userProfile', uid],
    queryFn: () => fetchUserProfile(uid),
    staleTime: 10_000,
  })

  const location = useMemo(() => {
    if (!data) return '—'
    const parts = [data.city, data.province].filter(Boolean) as string[]
    return parts.length ? parts.join(', ') : '—'
  }, [data])

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextId = userIdInput.trim()
    if (!nextId) return
    navigate({ to: '/users/$uid', params: { uid: nextId } })
  }

  const loadingState = (
    <div className="grid gap-4 sm:grid-cols-2">
      {[0, 1, 2, 3].map((item) => (
        <div
          key={item}
          className="rounded-xl border border-border/60 bg-muted/30 p-4 shadow-xs"
        >
          <div className="mb-2 h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="h-6 w-32 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  )

  const hobbiesContent = (() => {
    if (!data) return null
    if (!data.hobbies || data.hobbies.length === 0) {
      return <p className="text-sm text-muted-foreground">No hobbies listed.</p>
    }
    return (
      <div className="flex flex-wrap gap-2">
        {data.hobbies.map((hobby) => (
          <span
            key={hobby}
            className="rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground"
          >
            {hobby}
          </span>
        ))}
      </div>
    )
  })()

  return (
    <div className="flex justify-center px-4 py-10">
      <div className="w-full max-w-5xl space-y-6">
        <Card>
          <CardHeader className="gap-3">
            <CardTitle>User Profile</CardTitle>
            <CardDescription>
              Look up a user by id and view their profile details and hobbies.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <Input
                value={userIdInput}
                onChange={(event) => setUserIdInput(event.target.value)}
                placeholder="Enter user id (e.g. 1)"
                className="sm:max-w-xs"
                inputMode="numeric"
              />
              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={!userIdInput.trim()}>
                  View profile
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => refetch()}
                  disabled={isFetching}
                >
                  {isFetching ? 'Refreshing…' : 'Refresh current'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {isLoading ? (
          <Card>
            <CardHeader>
              <CardTitle>Loading profile…</CardTitle>
              <CardDescription>Fetching details for user {uid}.</CardDescription>
            </CardHeader>
            <CardContent>{loadingState}</CardContent>
          </Card>
        ) : error ? (
          <Card className="border-destructive/40 bg-destructive/10">
            <CardHeader>
              <CardTitle className="text-destructive">Unable to load profile</CardTitle>
              <CardDescription>{error.message}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={() => refetch()}>
                Try again
              </Button>
            </CardContent>
          </Card>
        ) : data ? (
          <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <Card>
              <CardHeader className="space-y-1">
                <CardTitle className="text-2xl">{data.username}</CardTitle>
                <CardDescription>{data.email}</CardDescription>
                <p className="text-sm text-muted-foreground">
                  Member since {formatDate(data.created_at)}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoRow label="User ID" value={data.uid.toString()} />
                  <InfoRow label="Gender" value={data.gender || '—'} />
                  <InfoRow
                    label="Age"
                    value={data.age !== null ? data.age.toString() : '—'}
                  />
                  <InfoRow label="MBTI" value={data.mbti || '—'} />
                  <InfoRow label="Location" value={location} />
                  <InfoRow label="Street" value={data.street || '—'} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoRow label="Last updated" value={formatDate(data.updated_at)} />
                  <InfoRow label="City" value={data.city || '—'} />
                  <InfoRow label="Province" value={data.province || '—'} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Hobbies</CardTitle>
                <CardDescription>As listed on the user profile</CardDescription>
              </CardHeader>
              <CardContent>{hobbiesContent}</CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  )
}
