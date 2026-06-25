"use client";

import { useEffect, useRef, useCallback } from "react";
import { motion } from "motion/react";
import {
  StudyCard as StudyCardType,
  StudyRating,
  StudyDirection,
} from "@/types/spaced-repetition";
import { FavoriteButton } from "../common/FavoriteButton";

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
}

const RATINGS: {
  rating: StudyRating;
  label: string;
  hint: string;
  bg: string;
  fg: string;
}[] = [
  { rating: 1, label: "Outra vez", hint: "Esqueci por completo · 1", bg: "var(--accent)", fg: "#fff" },
  { rating: 2, label: "Difícil", hint: "Custou a lembrar · 2", bg: "var(--amber)", fg: "#1a1206" },
  { rating: 3, label: "Bom", hint: "Lembrei com esforço · 3", bg: "var(--green)", fg: "#04210f" },
  { rating: 4, label: "Fácil", hint: "Lembrei logo · 4", bg: "var(--blue)", fg: "#05122e" },
];

function stateMeta(card: StudyCardType): { label: string; color: string } {
  switch (card.cardStudy?.state) {
    case "Learning":
      return { label: "A aprender", color: "var(--amber)" };
    case "Review":
      return { label: "Revisão", color: "var(--green)" };
    case "Relearning":
      return { label: "Reaprender", color: "var(--accent2)" };
    case "New":
    default:
      return { label: "Nova", color: "var(--blue)" };
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
}: StudyCardProps) {
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

  const ptFront = studyDirection === "pt-en";
  const front = ptFront ? card.phrase.phrase : card.phrase.translation;
  const back = ptFront ? card.phrase.translation : card.phrase.phrase;
  const frontLabel = ptFront ? "PORTUGUÊS" : "INGLÊS";
  const backLabel = ptFront ? "INGLÊS" : "PORTUGUÊS";
  const state = stateMeta(card);

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
            Cartão {cardNumber} de {totalCards}
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
            className="mb-4 text-[11px] font-extrabold tracking-[0.14em]"
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
                className="mb-3 text-center text-[11px] font-extrabold tracking-[0.14em]"
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
              Clica para revelar a tradução
            </div>
          )}
        </div>
      </div>

      {/* Ratings or hint */}
      {showAnswer ? (
        <div className="px-6 pb-[22px]">
          <div className="mb-[14px] text-center text-[13px]" style={{ color: "var(--muted)" }}>
            Como correu esta frase?
          </div>
          <div className="grid grid-cols-2 gap-[11px]">
            {RATINGS.map(({ rating, label, hint, bg, fg }) => (
              <button
                key={rating}
                onClick={() => handleResponse(rating)}
                className="rounded-xl p-[14px] text-left transition-transform hover:scale-[1.02]"
                style={{ background: bg, color: fg }}
              >
                <div className="text-[15px] font-extrabold">{label}</div>
                <div className="text-[11.5px] opacity-80">{hint}</div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="px-6 pb-6 text-center text-[12.5px]" style={{ color: "var(--faint)" }}>
          Carrega{" "}
          <span
            className="rounded-[5px] px-[7px] py-[2px] font-bold"
            style={{
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              color: "var(--muted)",
            }}
          >
            Espaço
          </span>{" "}
          ou clica no cartão para ver a resposta
        </div>
      )}
    </motion.div>
  );
}
