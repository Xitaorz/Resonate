import { Suspense, lazy, useEffect, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil } from 'lucide-react'

import {
  fetchUserProfile,
  updateUserProfile,
  type UpdateUserPayload,
  type UserProfile,
} from '@/api/users'
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
import { UserProfileForm } from '@/components/user-profile/UserProfileForm'

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
