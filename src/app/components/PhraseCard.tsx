import { ExtractedPhrase } from "@/lib/supabase";
import { FavoriteButton } from "./FavoriteButton";

interface PhraseCardProps {
  phrase: ExtractedPhrase;
  isSelected?: boolean;
  onToggleSelection?: (phraseId: string) => void;
  showSelection?: boolean;
  isFavorite: boolean;
  onToggleFavorite: (phraseId: string) => Promise<void>;
  progressPercentage?: number;
  learningState?: "New" | "Learning" | "Review" | "Relearning";
  isLearned?: boolean;
  showProgress?: boolean;
  viewMode?: "grid" | "list";
  showTimestamp?: boolean;
}

function stateMeta(
  state: PhraseCardProps["learningState"],
  isLearned: boolean
): { label: string; color: string } {
  if (isLearned) return { label: "Dominada", color: "var(--green)" };
  switch (state) {
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

export const PhraseCard = ({
  phrase,
  isSelected = false,
  onToggleSelection,
  showSelection = false,
  isFavorite,
  onToggleFavorite,
  progressPercentage = 0,
  learningState = "New",
  isLearned = false,
  showProgress = false,
  viewMode = "grid",
}: PhraseCardProps) => {
  const { label, color } = stateMeta(learningState, isLearned);
  const pct = Math.round(progressPercentage);
  const isListView = viewMode === "list";

  const selectionBox = showSelection ? (
    <input
      type="checkbox"
      checked={isSelected}
      onChange={() => onToggleSelection?.(phrase.id)}
      className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]"
    />
  ) : null;

  if (isListView) {
    return (
      <div
        className="flex items-start gap-4 rounded-[var(--radius)] p-4"
        style={{
          background: "var(--surface)",
          border: `1px solid ${isSelected && showSelection ? "var(--accent)" : "var(--border)"}`,
        }}
      >
        {selectionBox}
        <div className="grid min-w-0 flex-1 gap-3 md:grid-cols-2">
          <div className="text-[15px] font-bold leading-snug" style={{ color: "var(--text)" }}>
            {phrase.phrase}
          </div>
          <div className="text-[13.5px] leading-snug" style={{ color: "var(--muted)" }}>
            {phrase.translation}
          </div>
        </div>
        <FavoriteButton
          phraseId={phrase.id}
          isFavorite={isFavorite}
          onToggleFavorite={onToggleFavorite}
        />
      </div>
    );
  }

  return (
    <div
      className="flex h-full flex-col rounded-[var(--radius-lg)] p-[18px] transition-all duration-200 hover:-translate-y-[2px]"
      style={{
        background: "var(--surface)",
        border: `1px solid ${isSelected && showSelection ? "var(--accent)" : "var(--border)"}`,
      }}
    >
      <div className="mb-[9px] flex justify-between gap-3">
        <div className="flex items-start gap-3">
          {selectionBox}
          <div className="text-[15px] font-bold leading-[1.4]" style={{ color: "var(--text)" }}>
            {phrase.phrase}
          </div>
        </div>
        <div className="shrink-0">
          <FavoriteButton
            phraseId={phrase.id}
            size={17}
            isFavorite={isFavorite}
            onToggleFavorite={onToggleFavorite}
          />
        </div>
      </div>

      <div className="mb-4 flex-1 text-[13.5px] leading-[1.45]" style={{ color: "var(--muted)" }}>
        {phrase.translation}
      </div>

      {showProgress && (
        <>
          <div
            className="mb-[9px] h-[5px] overflow-hidden rounded-full"
            style={{ background: "rgba(255,255,255,.09)" }}
          >
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max(pct, 6)}%`, background: color }}
            />
          </div>
          <div className="flex justify-between text-[11.5px] font-bold">
            <span style={{ color }}>{label}</span>
            <span style={{ color: "var(--muted)" }}>{pct}%</span>
          </div>
        </>
      )}
    </div>
  );
};
