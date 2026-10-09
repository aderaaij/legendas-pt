"use client";

import { motion } from "motion/react";

import { useLanguage } from "@/hooks/useLanguage";
import type { TargetLanguage } from "@/lib/i18n/languages";
import type { EpisodeEssential } from "@/types/essentials";

interface EssentialCardProps {
  essential: EpisodeEssential;
  showAnswer: boolean;
  onFlip: () => void;
  remaining: number;
  /** The show's (content) language — the essential's language, not the UI's. */
  language: TargetLanguage;
}

/** Front: the expression and the line where it's heard. Back: its meaning here. */
export function EssentialCard({
  essential,
  showAnswer,
  onFlip,
  remaining,
  language,
}: EssentialCardProps) {
  const { t } = useLanguage();

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -14 }}
      transition={{ duration: 0.25 }}
      className="px-6 pb-6 pt-[18px]"
    >
      <div
        onClick={onFlip}
        className="relative flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-2xl px-7 py-[34px]"
        style={{ background: "var(--bg2)", border: "1px solid var(--border)" }}
      >
        <div
          className="absolute left-[18px] top-[14px] text-[11px] font-bold tracking-[0.06em]"
          style={{ color: "var(--faint)" }}
        >
          {t.essentials.remaining(remaining)}
        </div>

        <div
          className="mb-4 text-[11px] font-extrabold uppercase tracking-[0.14em]"
          style={{ color: "var(--accent2)" }}
        >
          {t.languageNames[language]}
        </div>
        <div className="study-card-text max-w-[440px] text-center text-[25px] font-bold leading-[1.3]">
          {essential.expression}
        </div>
        {essential.example && (
          <div className="mt-4 max-w-[440px] text-center">
            <div className="mb-1 text-[10.5px] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--faint)" }}>
              {t.essentials.heardIn}
            </div>
            <div className="text-[14.5px] italic" style={{ color: "var(--muted)" }}>
              “{essential.example}”
            </div>
          </div>
        )}

        {showAnswer ? (
          <div
            className="mt-[22px] w-full max-w-[440px] pt-[22px] text-center"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <div
              className="mb-3 text-[11px] font-extrabold uppercase tracking-[0.14em]"
              style={{ color: "var(--green)" }}
            >
              {t.languageNames.en}
            </div>
            <div className="study-card-text text-[21px] font-bold leading-[1.4]">
              {essential.translation}
            </div>
            {essential.exampleTranslation && (
              <div className="mt-2 text-[13.5px] italic" style={{ color: "var(--muted)" }}>
                “{essential.exampleTranslation}”
              </div>
            )}
            {essential.note && (
              <span
                className="mt-3 inline-block rounded-full px-[10px] py-[3px] text-[11.5px] font-bold"
                style={{
                  color: "var(--gold)",
                  background: "color-mix(in srgb, var(--gold) 15%, transparent)",
                }}
              >
                {essential.note}
              </span>
            )}
          </div>
        ) : (
          <div className="mt-[22px] text-[12.5px]" style={{ color: "var(--faint)" }}>
            {t.essentials.revealHint}
          </div>
        )}
      </div>
    </motion.div>
  );
}
