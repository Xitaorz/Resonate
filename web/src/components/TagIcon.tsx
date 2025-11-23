import React from "react";

const TAG_ICON_MAP: Record<string, { icon: string; label: string }> = {
  party:    { icon: "🎉", label: "Party" },
  workout:  { icon: "🏋️‍♂️", label: "Workout" },
  sleeping: { icon: "🌙", label: "Sleeping" },
  relaxing: { icon: "🛋️", label: "Relaxing" },
  romantic: { icon: "💘", label: "Romantic" },
  sad:      { icon: "😢", label: "Sad" },
};

interface TagIconProps {
  tag: string;
}

export function TagIcon({ tag }: TagIconProps) {
  const key = tag.toLowerCase().trim();
  const meta = TAG_ICON_MAP[key];

  if (!meta) {
    return null;
  }

  return (
    <span className="text-xl" title={meta.label}>
      {meta.icon}
    </span>
  );
}
