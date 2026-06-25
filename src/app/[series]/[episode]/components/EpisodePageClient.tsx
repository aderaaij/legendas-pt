"use client";

import { useState, useMemo } from "react";
import { FileText, Grid3X3, List } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

import { ExtractedPhrase, Show, Episode } from "@/lib/supabase";
import { episodeCode } from "@/utils/slugify";
import AnkiExporter from "@/app/components/phrase/AnkiExporter";
import { useAuth } from "@/hooks/useAuth";
import { useFavorites } from "@/hooks/useFavorites";
import { useCardProgress } from "./useCardProgress";
import { PhraseCard } from "@/app/components/phrase/PhraseCard";
import {
  PhraseSortAndFilter,
  SortOption,
  FilterOption,
} from "@/app/components/phrase/PhraseSortAndFilter";
import { SpacedRepetitionGame } from "@/app/components/study/SpacedRepetitionGame";
import { EpisodeInfoSection } from "./EpisodeInfoSection";

interface EpisodePageClientProps {
  show: Show;
  episode: Episode;
  phrases: ExtractedPhrase[];
  series: string;
  episodeSlug: string;
}

export default function EpisodePageClient({
  show,
  episode,
  phrases,
}: EpisodePageClientProps) {
  const [sortOption, setSortOption] = useState<SortOption>("none");
  const [filterOption, setFilterOption] = useState<FilterOption>("all");
  const [selectedPhrases, setSelectedPhrases] = useState<Set<string>>(
    new Set(phrases.map((p) => p.id))
  );
  const [isExportMode, setIsExportMode] = useState(false);
  const [showStudyGame, setShowStudyGame] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const { isAuthenticated } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { getProgressForPhrase } = useCardProgress(phrases.map((p) => p.id));

  const handleToggleFavorite = async (phraseId: string): Promise<void> => {
    const result = await toggleFavorite(phraseId);
    if (result?.error) {
      console.error("Error toggling favorite:", result.error);
    }
  };

  const filteredAndSortedPhrases = useMemo(() => {
    let filtered = phrases;

    if (filterOption === "favorites") {
      filtered = phrases.filter((phrase) => isFavorite(phrase.id));
    }

    if (sortOption === "alphabetical") {
      filtered = [...filtered].sort((a, b) => a.phrase.localeCompare(b.phrase));
    } else if (sortOption === "reverse-alphabetical") {
      filtered = [...filtered].sort((a, b) => b.phrase.localeCompare(a.phrase));
    } else if (sortOption === "progress-high") {
      filtered = [...filtered].sort((a, b) => {
        const progressA = getProgressForPhrase(a.id)?.progressPercentage || 0;
        const progressB = getProgressForPhrase(b.id)?.progressPercentage || 0;
        return progressB - progressA;
      });
    } else if (sortOption === "progress-low") {
      filtered = [...filtered].sort((a, b) => {
        const progressA = getProgressForPhrase(a.id)?.progressPercentage || 0;
        const progressB = getProgressForPhrase(b.id)?.progressPercentage || 0;
        return progressA - progressB;
      });
    }

    return filtered;
  }, [phrases, sortOption, filterOption, isFavorite, getProgressForPhrase]);

  const handlePhraseToggle = (phraseId: string) => {
    setSelectedPhrases((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(phraseId)) {
        newSet.delete(phraseId);
      } else {
        newSet.add(phraseId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () =>
    setSelectedPhrases(new Set(filteredAndSortedPhrases.map((p) => p.id)));
  const handleDeselectAll = () => setSelectedPhrases(new Set());

  const handleEnterExportMode = () => {
    setIsExportMode(true);
    setSelectedPhrases(new Set(filteredAndSortedPhrases.map((p) => p.id)));
  };

  const handleExitExportMode = () => {
    setIsExportMode(false);
    setSelectedPhrases(new Set());
  };

  const selectedPhrasesData = phrases.filter((p) => selectedPhrases.has(p.id));
  const ankiPhrases = selectedPhrasesData.map((phrase) => ({
    phrase: phrase.phrase,
    translation: phrase.translation,
    frequency: 1,
  }));

  const viewToggleClass = "grid h-8 w-8 place-items-center rounded-md transition-colors";

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <EpisodeInfoSection
        show={show}
        episode={episode}
        phrases={phrases}
        onStartStudy={() => setShowStudyGame(true)}
      />

      <section className="px-5 pb-[60px] pt-1 md:px-10">
        {phrases.length > 0 ? (
          <>
            <div className="mb-[22px] flex flex-wrap items-center gap-3">
              <h2 className="text-[22px] font-extrabold tracking-[-0.01em]">Frases</h2>
              <span
                className="rounded-full px-[11px] py-1 text-[12px] font-bold"
                style={{
                  background: "var(--surface2)",
                  border: "1px solid var(--border)",
                  color: "var(--muted)",
                }}
              >
                {phrases.length} frases
              </span>
              <div className="flex-1" />

              <PhraseSortAndFilter
                onSortChange={setSortOption}
                onFilterChange={setFilterOption}
                currentSort={sortOption}
                currentFilter={filterOption}
                totalPhrases={phrases.length}
                filteredPhrases={filteredAndSortedPhrases.length}
              />

              <div
                className="flex items-center gap-1 rounded-lg p-1"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <button
                  onClick={() => setViewMode("grid")}
                  className={viewToggleClass}
                  style={{
                    background: viewMode === "grid" ? "var(--surface2)" : "transparent",
                    color: viewMode === "grid" ? "var(--text)" : "var(--muted)",
                  }}
                  title="Grelha"
                >
                  <Grid3X3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={viewToggleClass}
                  style={{
                    background: viewMode === "list" ? "var(--surface2)" : "transparent",
                    color: viewMode === "list" ? "var(--text)" : "var(--muted)",
                  }}
                  title="Lista"
                >
                  <List className="h-4 w-4" />
                </button>
              </div>

              {!isExportMode && (
                <AnkiExporter
                  phrases={ankiPhrases}
                  isExportMode={false}
                  onEnterExportMode={handleEnterExportMode}
                />
              )}
            </div>

            {isExportMode && (
              <div className="mb-6">
                <AnkiExporter
                  phrases={ankiPhrases}
                  isExportMode
                  onExitExportMode={handleExitExportMode}
                  selectedCount={selectedPhrases.size}
                  totalCount={filteredAndSortedPhrases.length}
                  onSelectAll={handleSelectAll}
                  onDeselectAll={handleDeselectAll}
                />
              </div>
            )}

            {filteredAndSortedPhrases.length > 0 ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={viewMode}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className={
                    viewMode === "grid"
                      ? "grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3"
                      : "space-y-2"
                  }
                >
                  {filteredAndSortedPhrases.map((phrase, index) => {
                    const progressData = getProgressForPhrase(phrase.id);
                    return (
                      <motion.div
                        key={phrase.id || index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: index * 0.02, ease: "easeOut" }}
                        className={viewMode === "grid" ? "h-full" : ""}
                      >
                        <PhraseCard
                          phrase={phrase}
                          isSelected={selectedPhrases.has(phrase.id)}
                          onToggleSelection={handlePhraseToggle}
                          showSelection={isExportMode}
                          isFavorite={isFavorite(phrase.id)}
                          onToggleFavorite={handleToggleFavorite}
                          showProgress={isAuthenticated}
                          progressPercentage={progressData?.progressPercentage || 0}
                          learningState={progressData?.state || "New"}
                          isLearned={progressData?.isLearned || false}
                          viewMode={viewMode}
                        />
                      </motion.div>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            ) : (
              <div className="py-8 text-center" style={{ color: "var(--muted)" }}>
                {filterOption === "favorites"
                  ? "Ainda não há frases favoritas. Marca algumas com o coração!"
                  : "Nenhuma frase corresponde aos filtros."}
              </div>
            )}
          </>
        ) : (
          <div
            className="rounded-2xl p-12 text-center"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <FileText className="mx-auto mb-4 h-16 w-16" style={{ color: "var(--faint)" }} />
            <h3 className="mb-2 text-xl font-bold">Sem frases</h3>
            <p style={{ color: "var(--muted)" }}>
              Este episódio ainda não tem frases extraídas.
            </p>
          </div>
        )}
      </section>

      <SpacedRepetitionGame
        episodeId={episode.id}
        episodeTitle={`${episodeCode(episode.season, episode.episode_number)}${
          episode.title ? ` — ${episode.title}` : ""
        }`}
        open={showStudyGame}
        onClose={() => setShowStudyGame(false)}
      />
    </div>
  );
}
