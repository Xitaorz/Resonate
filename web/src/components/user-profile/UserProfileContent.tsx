import type { UserProfile } from '@/api/users'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

import { AuroraText } from '@/components/ui/aurora-text'

type Props = {
  profile: UserProfile
  footerSlot?: React.ReactNode
}

function formatDate(value?: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString()
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-sm font-medium text-foreground">{value || '—'}</span>
    </div>
  )
}

export default function UserProfileContent({ profile, footerSlot }: Props) {
  const location = (() => {
    const parts = [profile.city, profile.province].filter(Boolean) as string[]
    return parts.length ? parts.join(', ') : '—'
  })()

  return (
    <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">
            {profile.isvip === 1 ? (
              <AuroraText className='text-2xl font-bold'>{profile.username}</AuroraText>
            ) : (
              profile.username
            )}
          </CardTitle>
          <CardDescription>{profile.email}</CardDescription>
          <p className="text-sm text-muted-foreground">
            Member since {formatDate(profile.created_at)}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoRow label="User ID" value={String(profile.uid ?? '—')} />
            <InfoRow label="Gender" value={profile.gender || '—'} />
            <InfoRow
              label="Age"
              value={profile.age !== null && profile.age !== undefined ? String(profile.age) : '—'}
            />
            <InfoRow label="MBTI" value={profile.mbti || '—'} />
            <InfoRow label="Location" value={location} />
            <InfoRow label="Street" value={profile.street || '—'} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoRow label="Last updated" value={formatDate(profile.updated_at)} />
            <InfoRow label="City" value={profile.city || '—'} />
            <InfoRow label="Province" value={profile.province || '—'} />
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2">{footerSlot}</CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hobbies</CardTitle>
          <CardDescription>As listed on the user profile</CardDescription>
        </CardHeader>
        <CardContent>
          {profile.hobbies && profile.hobbies.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {profile.hobbies.map((hobby) => (
                <span
                  key={hobby}
                  className="rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground"
                >
                  {hobby}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No hobbies listed.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
