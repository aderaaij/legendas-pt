"use client";

interface StudyProgressBarProps {
  currentCard: number;
  totalCards: number;
  correctCards: number;
  studiedCards: number;
}

export function StudyProgressBar({
  currentCard,
  totalCards,
  correctCards,
  studiedCards,
}: StudyProgressBarProps) {
  const progressPercentage = totalCards > 0 ? (currentCard / totalCards) * 100 : 0;
  const accuracyPercentage =
    studiedCards > 0 ? Math.round((correctCards / studiedCards) * 100) : 100;

  return (
    <div className="px-6 pb-2 pt-[18px]">
      <div className="mb-2 flex justify-between text-[12.5px]">
        <span className="font-semibold" style={{ color: "var(--muted)" }}>
          Progresso
        </span>
        <span className="font-bold" style={{ color: "var(--text)" }}>
          {currentCard} / {totalCards}
        </span>
      </div>

      <div
        className="mb-3 h-[6px] overflow-hidden rounded-full"
        style={{ background: "rgba(255,255,255,.1)" }}
      >
        <div
          className="h-full rounded-full transition-[width] duration-[400ms] ease-out"
          style={{
            width: `${progressPercentage}%`,
            background: "linear-gradient(90deg, var(--accent), var(--accent2))",
          }}
        />
      </div>

      <div className="flex justify-between text-[12.5px]">
        <div className="flex gap-4">
          <span className="flex items-center gap-[6px]" style={{ color: "var(--muted)" }}>
            <span className="h-2 w-2 rounded-full" style={{ background: "var(--green)" }} />
            Certas: <b style={{ color: "var(--text)" }}>{correctCards}</b>
          </span>
          <span className="flex items-center gap-[6px]" style={{ color: "var(--muted)" }}>
            <span className="h-2 w-2 rounded-full" style={{ background: "var(--accent)" }} />
            Erradas: <b style={{ color: "var(--text)" }}>{studiedCards - correctCards}</b>
          </span>
        </div>
        <span style={{ color: "var(--muted)" }}>
          Precisão: <b style={{ color: "var(--text)" }}>{accuracyPercentage}%</b>
        </span>
      </div>
    </div>
  );
}
