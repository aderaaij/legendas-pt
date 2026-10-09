"use client";

import type { StudyRating } from "@/types/spaced-repetition";

interface RatingOption {
  rating: StudyRating;
  label: string;
  hint: string;
  /** The keyboard key that triggers it. */
  shortcut: string;
  bg: string;
  fg: string;
}

interface RatingButtonsProps {
  prompt: string;
  options: RatingOption[];
  onRate: (rating: StudyRating) => void;
}

/** The grid of rating buttons shown once a card is revealed. */
export function RatingButtons({ prompt, options, onRate }: RatingButtonsProps) {
  return (
    <div className="px-6 pb-[22px]">
      <div className="mb-[14px] text-center text-[13px]" style={{ color: "var(--muted)" }}>
        {prompt}
      </div>
      <div className="grid grid-cols-2 gap-[11px]">
        {options.map(({ rating, label, hint, shortcut, bg, fg }) => (
          <button
            key={rating}
            onClick={() => onRate(rating)}
            className="rounded-xl p-[14px] text-left transition-transform hover:scale-[1.02]"
            style={{ background: bg, color: fg }}
          >
            <div className="text-[15px] font-extrabold">{label}</div>
            <div className="text-[11.5px] opacity-80">
              {hint} · {shortcut}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
