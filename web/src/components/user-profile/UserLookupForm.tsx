import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type UserLookupFormProps = {
  value: string
  onChange: (next: string) => void
  onSubmit: () => void
  onRefresh: () => void
  onShowPlaylists?: () => void
  canSubmit: boolean
  isRefreshing: boolean
}

export function UserLookupForm({
  value,
  onChange,
  onSubmit,
  onRefresh,
  onShowPlaylists,
  canSubmit,
  isRefreshing,
}: UserLookupFormProps) {
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (canSubmit) {
          onSubmit()
        }
      }}
      className="flex flex-col gap-3 sm:flex-row sm:items-center"
    >
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Enter user id (e.g. 1)"
        className="sm:max-w-xs"
        inputMode="numeric"
      />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={!canSubmit}>
          View profile
        </Button>
        {onShowPlaylists ? (
          <Button
            type="button"
            variant="outline"
            className="bg-white text-foreground hover:bg-white/90"
            onClick={onShowPlaylists}
            disabled={!canSubmit}
          >
            Show playlists
          </Button>
        ) : null}
        <Button
          type="button"
          variant="outline"
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? 'Refreshing…' : 'Refresh current'}
        </Button>
      </div>
    </form>
  )
}
