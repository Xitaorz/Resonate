import { Suspense, lazy, useState } from 'react'
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

import { UserLookupForm } from '@/components/user-profile/UserLookupForm'
import { UserProfileSkeleton } from '@/components/user-profile/UserProfileSkeleton'

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

const UserProfileContent = lazy(() => import('@/components/user-profile/UserProfileContent'))

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

  const handleSubmit = () => {
    const nextId = userIdInput.trim()
    if (!nextId) return
    navigate({ to: '/users/$uid', params: { uid: nextId } })
  }

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
            <UserLookupForm
              value={userIdInput}
              onChange={setUserIdInput}
              onSubmit={handleSubmit}
              onRefresh={() => refetch()}
              canSubmit={Boolean(userIdInput.trim())}
              isRefreshing={isFetching}
            />
          </CardContent>
        </Card>

        {isLoading ? (
          <UserProfileSkeleton uid={uid} />
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
          <Suspense fallback={<UserProfileSkeleton uid={uid} />}>
            <UserProfileContent profile={data} />
          </Suspense>
        ) : null}
      </div>
    </div>
  )
}
