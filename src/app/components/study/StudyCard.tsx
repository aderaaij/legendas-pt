"use client";

import { useEffect, useRef, useCallback } from "react";
import { motion } from "motion/react";
import {
  StudyCard as StudyCardType,
  StudyRating,
  StudyDirection,
} from "@/types/spaced-repetition";
import { useLanguage } from "@/hooks/useLanguage";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { TargetLanguage } from "@/lib/i18n/languages";
import { FavoriteButton } from "../common/FavoriteButton";
import { RatingButtons } from "./RatingButtons";

interface StudyCardProps {
  card: StudyCardType;
  onResponse: (rating: StudyRating, responseTime: number) => void;
  showAnswer: boolean;
  onFlip: () => void;
  cardNumber: number;
  totalCards: number;
  isFavorite: boolean;
  onToggleFavorite: (phraseId: string) => Promise<void>;
  studyDirection: StudyDirection;
  /** The show's (content) language — the phrases' language, not the UI's. */
  language: TargetLanguage;
}

const RATINGS: {
  rating: StudyRating;
  key: keyof Dictionary["study"]["ratings"];
  bg: string;
  fg: string;
}[] = [
  { rating: 1, key: "again", bg: "var(--accent)", fg: "#fff" },
  { rating: 2, key: "hard", bg: "var(--amber)", fg: "#1a1206" },
  { rating: 3, key: "good", bg: "var(--green)", fg: "#04210f" },
  { rating: 4, key: "easy", bg: "var(--blue)", fg: "#05122e" },
];

function stateMeta(
  card: StudyCardType,
  labels: Dictionary["study"]["states"]
): { label: string; color: string } {
  switch (card.cardStudy?.state) {
    case "Learning":
      return { label: labels.learning, color: "var(--amber)" };
    case "Review":
      return { label: labels.review, color: "var(--green)" };
    case "Relearning":
      return { label: labels.relearning, color: "var(--accent2)" };
    case "New":
    default:
      return { label: labels.new, color: "var(--blue)" };
  }
}

export function StudyCard({
  card,
  onResponse,
  showAnswer,
  onFlip,
  cardNumber,
  totalCards,
  isFavorite,
  onToggleFavorite,
  studyDirection,
  language,
}: StudyCardProps) {
  const { t } = useLanguage();
  const startTimeRef = useRef(0);

  useEffect(() => {
    startTimeRef.current = Date.now();
  }, [card]);

  const handleResponse = useCallback(
    (rating: StudyRating) => {
      onResponse(rating, Date.now() - startTimeRef.current);
    },
    [onResponse]
  );

  // "pt-en" means target language → English, for any target language.
  const targetFront = studyDirection === "pt-en";
  const front = targetFront ? card.phrase.phrase : card.phrase.translation;
  const back = targetFront ? card.phrase.translation : card.phrase.phrase;
  const targetLabel = t.languageNames[language];
  const englishLabel = t.languageNames.en;
  const frontLabel = targetFront ? targetLabel : englishLabel;
  const backLabel = targetFront ? englishLabel : targetLabel;
  const state = stateMeta(card, t.study.states);

  return (
    <motion.div
      key={card.phrase.id}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -14 }}
      transition={{ duration: 0.25 }}
    >
      {/* Reveal card */}
      <div className="px-6 pb-6 pt-[18px]">
        <div
          onClick={onFlip}
          className="relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-2xl px-7 py-[34px]"
          style={{ background: "var(--bg2)", border: "1px solid var(--border)" }}
        >
          <div
            className="absolute left-[18px] top-[14px] text-[11px] font-bold tracking-[0.06em]"
            style={{ color: "var(--faint)" }}
          >
            {t.study.cardOf(cardNumber, totalCards)}
          </div>
          <div
            className="absolute right-4 top-3 flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <FavoriteButton
              phraseId={card.phrase.id}
              size={16}
              isFavorite={isFavorite}
              onToggleFavorite={onToggleFavorite}
            />
            <span
              className="rounded-full px-[9px] py-[3px] text-[11px] font-extrabold"
              style={{
                color: state.color,
                background: "color-mix(in srgb, " + state.color + " 18%, transparent)",
              }}
            >
              {state.label}
            </span>
          </div>

          <div
            className="mb-4 text-[11px] font-extrabold uppercase tracking-[0.14em]"
            style={{ color: "var(--accent2)" }}
          >
            {frontLabel}
          </div>
          <div className="study-card-text max-w-[440px] text-center text-[23px] font-bold leading-[1.4]">
            {front}
          </div>

          {showAnswer ? (
            <div
              className="mt-[22px] w-full max-w-[440px] pt-[22px]"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <div
                className="mb-3 text-center text-[11px] font-extrabold uppercase tracking-[0.14em]"
                style={{ color: "var(--green)" }}
              >
                {backLabel}
              </div>
              <div
                className="study-card-text text-center text-[21px] font-bold leading-[1.4]"
                style={{ color: "var(--text)" }}
              >
                {back}
              </div>
            </div>
          ) : (
            <div className="mt-[22px] text-[12.5px]" style={{ color: "var(--faint)" }}>
              {t.study.revealHint}
            </div>
          )}
        </div>
      </div>

      {/* Ratings or hint */}
      {showAnswer ? (
        <RatingButtons
          prompt={t.study.howDidItGo}
          options={RATINGS.map(({ rating, key, bg, fg }) => ({
            rating,
            label: t.study.ratings[key].label,
            hint: t.study.ratings[key].hint,
            shortcut: String(rating),
            bg,
            fg,
          }))}
          onRate={handleResponse}
        />
      ) : (
        <div className="px-6 pb-6 text-center text-[12.5px]" style={{ color: "var(--faint)" }}>
          {t.study.keyHintBefore}{" "}
          <span
            className="rounded-[5px] px-[7px] py-[2px] font-bold"
            style={{
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              color: "var(--muted)",
            }}
          >
            {t.study.spaceKey}
          </span>{" "}
          {t.study.keyHintAfter}
        </div>
      )}
    </motion.div>
  );
}
