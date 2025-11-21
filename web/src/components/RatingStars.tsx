import { Star } from "lucide-react"
import type { CSSProperties } from "react"

type RatingStarsProps = {
  value: number
  max?: number
  onChange?: (value: number) => void
  disabled?: boolean
  className?: string
  size?: number
}

export function RatingStars({
  value,
  max = 5,
  onChange,
  disabled,
  className,
  size = 20,
}: RatingStarsProps) {
  const stars = Array.from({ length: max }, (_, i) => i + 1)
  const style: CSSProperties = { color: "var(--color-primary)" }

  return (
    <div className={className} role="group" aria-label="Rate this song">
      <div className="flex items-center gap-1">
        {stars.map((star) => {
          const filled = star <= value
          return (
            <button
              key={star}
              type="button"
              className="text-muted-foreground transition hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
              disabled={disabled}
              onClick={() => onChange?.(star)}
              aria-label={`Rate ${star} star${star === 1 ? "" : "s"}`}
            >
              <Star
                size={size}
                fill={filled ? "currentColor" : "none"}
                style={filled ? style : undefined}
              />
            </button>
          )
        })}
      </div>
    </div>
  )
}
