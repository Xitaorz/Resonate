import { Suspense, lazy, useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil } from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog'

import { UserLookupForm } from '@/components/user-profile/UserLookupForm'
import { UserProfileSkeleton } from '@/components/user-profile/UserProfileSkeleton'
import { UserProfileForm, type UpdateUserInput } from '@/components/user-profile/UserProfileForm'

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

type UpdateUserPayload = UpdateUserInput

const updateUserProfile = async (uid: string, payload: UpdateUserPayload): Promise<UserProfile> => {
  const res = await fetch(`/api/users/${uid}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  let body: any = {}
  try {
    body = await res.json()
  } catch {
    body = {}
  }

  if (!res.ok || body?.error) {
    const message = typeof body?.error === 'string' ? body.error : `Failed to update user ${uid}`
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
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const queryClient = useQueryClient()

  useEffect(() => {
    setLastSaved(null)
    setEditOpen(false)
  }, [uid])

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

  const updateMutation = useMutation<UserProfile, Error, UpdateUserPayload>({
    mutationFn: (payload) => updateUserProfile(uid, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(['userProfile', uid], updated)
      setLastSaved(new Date())
      setEditOpen(false)
    },
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
        ) : data ? (
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <Suspense fallback={<UserProfileSkeleton uid={uid} />}>
              <UserProfileContent
                profile={data}
                footerSlot={
                  <DialogTrigger>
                    <Button variant="outline" className="gap-2">
                      <Pencil className="size-4" />
                      Edit profile
                    </Button>
                  </DialogTrigger>
                }
              />
            </Suspense>

            <DialogContent>
              <div className="px-6 py-5">
                <DialogHeader className="mb-4">
                  <DialogTitle>Edit profile</DialogTitle>
                  <DialogDescription>Update profile details and hobbies.</DialogDescription>
                </DialogHeader>
                <UserProfileForm
                  profile={data}
                  onSubmit={(payload) => updateMutation.mutate(payload)}
                  isSubmitting={updateMutation.isPending}
                  errorMessage={updateMutation.error?.message}
                  lastSaved={lastSaved}
                />
                <DialogFooter className="justify-between pt-6">
                  <span className="text-sm text-muted-foreground">
                    Tip: hobbies are comma-separated.
                  </span>
                  <DialogClose>
                    <Button variant="ghost">Cancel</Button>
                  </DialogClose>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        ) : null}
      </div>
    </div>
  )
}
