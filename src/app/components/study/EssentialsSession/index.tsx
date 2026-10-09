"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AnimatePresence } from "motion/react";
import { CheckCircle2, RotateCcw, Sparkles, X } from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import type { TargetLanguage } from "@/lib/i18n/languages";
import type { EpisodeEssential } from "@/types/essentials";
import type { StudyRating } from "@/types/spaced-repetition";

import { StudyShell } from "../StudyShell";
import { StudyProgressBar } from "../StudyProgressBar";
import { RatingButtons } from "../RatingButtons";
import { EssentialCard } from "./EssentialCard";
import { EssentialsComplete } from "./EssentialsComplete";
import { useEssentialsSession } from "./useEssentialsSession";

interface EssentialsSessionProps {
  open: boolean;
  onClose: () => void;
  essentials: EpisodeEssential[];
  episodeTitle: string;
  /** The show's (content) language. */
  language: TargetLanguage;
  knownIds: Set<string>;
  onReview: (essentialId: string, rating: StudyRating) => void;
}

/** The essentials drill, in the shared study modal. */
export function EssentialsSession({ open, onClose, ...props }: EssentialsSessionProps) {
  return (
    <StudyShell open={open} onClose={onClose}>
      <SessionBody {...props} />
    </StudyShell>
  );
}

// Mounted only while open (StudyShell renders children only then), so every
// open starts a fresh round from the current progress.
function SessionBody({
  essentials,
  episodeTitle,
  language,
  knownIds,
  onReview,
}: Omit<EssentialsSessionProps, "open" | "onClose">) {
  const { t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const session = useEssentialsSession({ essentials, knownIds, onReview });

  if (session.allKnown) {
    return (
      <div className="p-8 text-center">
        <CheckCircle2 className="mx-auto mb-4 h-14 w-14" style={{ color: "var(--green)" }} />
        <Dialog.Title className="mb-2 text-xl font-extrabold">
          {t.essentials.allKnownTitle}
        </Dialog.Title>
        <Dialog.Description className="mb-6 text-sm" style={{ color: "var(--muted)" }}>
          {t.essentials.allKnownBody}
        </Dialog.Description>
        <div className="flex gap-3">
          <Dialog.Close asChild>
            <button
              className="flex-1 rounded-lg py-2 text-sm font-semibold"
              style={{ background: "var(--surface2)", color: "var(--text)" }}
            >
              {t.common.close}
            </button>
          </Dialog.Close>
          <button
            onClick={session.practiceAll}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-bold text-white"
            style={{ background: "var(--accent)" }}
          >
            <RotateCcw className="h-4 w-4" />
            {t.essentials.practiceAll}
          </button>
        </div>
      </div>
    );
  }

  if (session.complete) {
    return (
      <EssentialsComplete
        episodeTitle={episodeTitle}
        total={session.total}
        firstTryPercent={session.firstTryPercent}
        durationSeconds={session.durationSeconds}
        isAuthenticated={isAuthenticated}
        onPracticeAll={session.practiceAll}
      />
    );
  }

  if (!session.current) return null;

  return (
    <>
      <div
        className="flex items-center gap-[14px] px-6 py-5"
        style={{
          borderBottom: "1px solid var(--border)",
          background: "linear-gradient(180deg, var(--surface2), var(--surface))",
        }}
      >
        <div
          className="grid h-[38px] w-[38px] place-items-center rounded-[10px]"
          style={{ background: "var(--accent)", boxShadow: "0 8px 20px -6px var(--accent)" }}
        >
          <Sparkles className="h-[18px] w-[18px] text-white" />
        </div>
        <div className="flex-1">
          <Dialog.Title className="text-base font-extrabold">
            {t.essentials.sessionTitle}
          </Dialog.Title>
          <Dialog.Description className="text-[12.5px]" style={{ color: "var(--muted)" }}>
            {episodeTitle}
            {session.knownAtStart > 0 && session.total < essentials.length
              ? ` · ${t.essentials.alreadyKnown(session.knownAtStart)}`
              : ""}
          </Dialog.Description>
        </div>
        <Dialog.Close asChild>
          <button
            className="grid h-[34px] w-[34px] place-items-center rounded-lg"
            style={{ color: "var(--muted)", border: "1px solid transparent" }}
            aria-label={t.common.close}
          >
            <X className="h-[17px] w-[17px]" />
          </button>
        </Dialog.Close>
      </div>

      <StudyProgressBar
        currentCard={session.passed}
        totalCards={session.total}
        correctCards={session.gotIt}
        studiedCards={session.answers}
      />

      <AnimatePresence mode="wait">
        <EssentialCard
          key={`${session.current.id}-${session.answers}`}
          essential={session.current}
          showAnswer={session.showAnswer}
          onFlip={session.flip}
          remaining={session.remaining}
          language={language}
        />
      </AnimatePresence>

      {session.showAnswer ? (
        <RatingButtons
          prompt={t.essentials.howDidItGo}
          options={[
            {
              rating: 1,
              label: t.essentials.again.label,
              hint: t.essentials.again.hint,
              shortcut: "1",
              bg: "var(--accent)",
              fg: "#fff",
            },
            {
              rating: 3,
              label: t.essentials.gotIt.label,
              hint: t.essentials.gotIt.hint,
              shortcut: "2",
              bg: "var(--green)",
              fg: "#04210f",
            },
          ]}
          onRate={(rating) => session.answer(rating >= 3)}
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

      {!isAuthenticated && (
        <div
          className="px-6 py-3 text-center text-xs"
          style={{ borderTop: "1px solid var(--border)", color: "var(--muted)" }}
        >
          {t.study.guestFooter}
        </div>
      )}
    </>
  );
}
