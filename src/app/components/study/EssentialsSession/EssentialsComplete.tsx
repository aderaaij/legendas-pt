"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { motion } from "motion/react";
import { RotateCcw, Trophy } from "lucide-react";

import { useLanguage } from "@/hooks/useLanguage";

interface EssentialsCompleteProps {
  episodeTitle: string;
  total: number;
  firstTryPercent: number;
  durationSeconds: number;
  isAuthenticated: boolean;
  onPracticeAll: () => void;
}

/** End of a round: every essential answered "got it". */
export function EssentialsComplete({
  episodeTitle,
  total,
  firstTryPercent,
  durationSeconds,
  isAuthenticated,
  onPracticeAll,
}: EssentialsCompleteProps) {
  const { t } = useLanguage();
  const stats = [
    { value: total, label: t.essentials.statEssentials, color: "var(--blue)" },
    { value: `${firstTryPercent}%`, label: t.essentials.statFirstTry, color: "var(--green)" },
    { value: `${Math.max(1, Math.round(durationSeconds / 60))}m`, label: t.study.statDuration, color: "var(--gold)" },
  ];

  return (
    <div className="p-8 text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
        style={{ color: "var(--gold)" }}
        className="mb-4"
      >
        <Trophy className="mx-auto h-16 w-16" />
      </motion.div>
      <Dialog.Title className="mb-2 text-2xl font-extrabold">
        {t.essentials.completeTitle}
      </Dialog.Title>
      <Dialog.Description className="mb-6 text-sm" style={{ color: "var(--muted)" }}>
        {t.essentials.completeBody(episodeTitle)}
      </Dialog.Description>

      <div
        className="mb-6 grid grid-cols-3 gap-4 rounded-2xl p-4"
        style={{ background: "var(--bg2)", border: "1px solid var(--border)" }}
      >
        {stats.map((stat) => (
          <div key={stat.label}>
            <div className="font-display text-2xl" style={{ color: stat.color }}>
              {stat.value}
            </div>
            <div className="text-xs" style={{ color: "var(--muted)" }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {!isAuthenticated && (
        <div
          className="mb-6 rounded-xl p-4 text-left text-sm"
          style={{ background: "rgba(245,196,81,.1)", border: "1px solid rgba(245,196,81,.25)" }}
        >
          <p style={{ color: "var(--gold)" }}>
            <strong>{t.study.saveProgressStrong}</strong> {t.study.saveProgressRest}
          </p>
        </div>
      )}

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
          onClick={onPracticeAll}
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
