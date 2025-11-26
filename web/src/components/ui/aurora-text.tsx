import React, { memo } from "react"

interface AuroraTextProps {
  children: React.ReactNode
  className?: string
  colors?: string[]
  speed?: number
}

export const AuroraText = memo(
  ({
    children,
    className = "",
    colors = ["#FF0080", "#FF6B9D", "#C44569", "#F8B500", "#FFC312", "#FF0080"],
    speed = 1,
  }: AuroraTextProps) => {
    const gradientStyle = {
      backgroundImage: `linear-gradient(135deg, ${colors.join(", ")}, ${
        colors[0]
      })`,
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      animationDuration: `${8 / speed}s`,
      backgroundSize: "200% 200%",
    }

    return (
      <span className={`relative inline-block ${className}`}>
        <span className="sr-only">{children}</span>
        {/* Glow effect behind text */}
        <span
          className="absolute inset-0 blur-xl opacity-50 animate-aurora"
          style={{
            backgroundImage: `linear-gradient(135deg, ${colors.join(", ")}, ${colors[0]})`,
            backgroundSize: "200% 200%",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
          aria-hidden="true"
        />
        {/* Main text */}
        <span
          className="relative animate-aurora bg-clip-text text-transparent font-bold drop-shadow-[0_0_8px_rgba(255,0,128,0.5)]"
          style={gradientStyle}
          aria-hidden="true"
        >
          {children}
        </span>
        {/* Shimmer effect overlay */}
        <span
          className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/30 to-transparent blur-[2px] pointer-events-none"
          aria-hidden="true"
        />
      </span>
    )
  }
)

AuroraText.displayName = "AuroraText"
