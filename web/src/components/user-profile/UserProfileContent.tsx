import type { UserProfile } from '@/api/users'
import { Crown } from 'lucide-react'
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

function InfoRow({ label, value, isVip = false }: { label: string; value: string; isVip?: boolean }) {
  return (
    <div className={`flex flex-col gap-1 rounded-lg border px-4 py-3 transition-all ${
      isVip 
        ? "border-amber-400/40 bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-amber-500/10 shadow-sm shadow-amber-500/10" 
        : "border-border/60 bg-muted/30"
    }`}>
      <span className={`text-xs uppercase tracking-wide ${
        isVip ? "text-amber-700 dark:text-amber-300 font-semibold" : "text-muted-foreground"
      }`}>
        {label}
      </span>
      <span className={`text-sm font-medium ${
        isVip ? "text-amber-900 dark:text-amber-100" : "text-foreground"
      }`}>
        {value || '—'}
      </span>
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
      <Card className={profile.isvip === 1 ? "relative overflow-hidden border-2 border-amber-400/30 shadow-lg shadow-amber-500/20" : ""}>
        {profile.isvip === 1 && (
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-yellow-500/5 to-amber-500/5 pointer-events-none" />
        )}
        <CardHeader className="space-y-1 relative">
          <div className="flex items-center gap-3">
            <CardTitle className="text-2xl">
              {profile.isvip === 1 ? (
                <AuroraText className='text-2xl font-bold'>{profile.username}</AuroraText>
              ) : (
                profile.username
              )}
            </CardTitle>
            {profile.isvip === 1 && (
              <div className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 px-3 py-1 text-xs font-bold text-amber-900 shadow-md shadow-amber-500/50">
                <Crown className="size-3 fill-amber-900" />
                <span>VIP</span>
              </div>
            )}
          </div>
          <CardDescription>{profile.email}</CardDescription>
          <p className="text-sm text-muted-foreground">
            Member since {formatDate(profile.created_at)}
          </p>
        </CardHeader>
        <CardContent className="space-y-4 relative">
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoRow
              label="Playlists created"
              value={
                typeof profile.num_playlists === 'number'
                  ? profile.num_playlists.toString()
                  : '0'
              }
              isVip={profile.isvip === 1}
            />
            <InfoRow
              label="Songs favorited"
              value={
                typeof profile.num_favorites === 'number'
                  ? profile.num_favorites.toString()
                  : '0'
              }
              isVip={profile.isvip === 1}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoRow label="User ID" value={profile.uid !== undefined && profile.uid !== null ? String(profile.uid) : '—'} isVip={profile.isvip === 1} />
            <InfoRow label="Gender" value={profile.gender || '—'} isVip={profile.isvip === 1} />
            <InfoRow
              label="Age"
              value={profile.age !== null && profile.age !== undefined ? String(profile.age) : '—'}
              isVip={profile.isvip === 1}
            />
            <InfoRow label="MBTI" value={profile.mbti || '—'} isVip={profile.isvip === 1} />
            <InfoRow label="Location" value={location} isVip={profile.isvip === 1} />
            <InfoRow label="Street" value={profile.street || '—'} isVip={profile.isvip === 1} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <InfoRow label="Last updated" value={formatDate(profile.updated_at)} isVip={profile.isvip === 1} />
            <InfoRow label="City" value={profile.city || '—'} isVip={profile.isvip === 1} />
            <InfoRow label="Province" value={profile.province || '—'} isVip={profile.isvip === 1} />
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap gap-2">{footerSlot}</CardFooter>
      </Card>

      <Card className={profile.isvip === 1 ? "relative overflow-hidden border-2 border-amber-400/30 shadow-lg shadow-amber-500/20" : ""}>
        {profile.isvip === 1 && (
          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-yellow-500/5 to-amber-500/5 pointer-events-none" />
        )}
        <CardHeader className="relative">
          <div className="flex items-center gap-2">
            <CardTitle>Hobbies</CardTitle>
            {profile.isvip === 1 && (
              <Crown className="size-4 text-amber-500 fill-amber-500" />
            )}
          </div>
          <CardDescription>As listed on the user profile</CardDescription>
        </CardHeader>
        <CardContent className="relative">
          {profile.hobbies && profile.hobbies.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {profile.hobbies.map((hobby) => (
                <span
                  key={hobby}
                  className={`rounded-full px-3 py-1 text-sm font-medium transition-all ${
                    profile.isvip === 1
                      ? "bg-gradient-to-r from-amber-400/20 via-yellow-400/20 to-amber-500/20 border border-amber-400/40 text-amber-900 dark:text-amber-100 shadow-md shadow-amber-500/20 hover:shadow-lg hover:shadow-amber-500/30 hover:scale-105"
                      : "bg-secondary text-secondary-foreground"
                  }`}
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
