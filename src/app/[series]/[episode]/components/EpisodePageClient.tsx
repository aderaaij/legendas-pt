"use client";

import { useState, useMemo } from "react";
import { FileText, Settings, Brain, Grid3X3, List } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";

import { ExtractedPhrase, Show, Episode } from "@/lib/supabase";
import { generateShowSlug } from "@/utils/slugify";
import AnkiExporter from "@/app/components/AnkiExporter";
import { useAuth } from "@/hooks/useAuth";
import { useFavorites } from "@/hooks/useFavorites";
import { useCardProgress } from "@/hooks/useCardProgress";
import { PhraseCard } from "@/app/components/PhraseCard";
import { EpisodeStatistics } from "@/app/components/EpisodeStatistics";
import {
  PhraseSortAndFilter,
  SortOption,
  FilterOption,
} from "@/app/components/PhraseSortAndFilter";
import { SpacedRepetitionGame } from "@/app/components/SpacedRepetitionGame";
import Breadcrumb from "@/app/components/Breadcrumb";
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

  // Wrapper for toggleFavorite to match FavoriteButton's expected signature
  const handleToggleFavorite = async (phraseId: string): Promise<void> => {
    const result = await toggleFavorite(phraseId);
    if (result?.error) {
      console.error("Error toggling favorite:", result.error);
    }
  };

  // Filter and sort phrases
  const filteredAndSortedPhrases = useMemo(() => {
    let filtered = phrases;

    // Apply filter
    if (filterOption === "favorites") {
      filtered = phrases.filter((phrase) => isFavorite(phrase.id));
    }

    // Apply sort
    if (sortOption === "alphabetical") {
      filtered = [...filtered].sort((a, b) => a.phrase.localeCompare(b.phrase));
    } else if (sortOption === "reverse-alphabetical") {
      filtered = [...filtered].sort((a, b) => b.phrase.localeCompare(a.phrase));
    } else if (sortOption === "progress-high") {
      filtered = [...filtered].sort((a, b) => {
        const progressA = getProgressForPhrase(a.id)?.progressPercentage || 0;
        const progressB = getProgressForPhrase(b.id)?.progressPercentage || 0;
        return progressB - progressA; // Highest progress first
      });
    } else if (sortOption === "progress-low") {
      filtered = [...filtered].sort((a, b) => {
        const progressA = getProgressForPhrase(a.id)?.progressPercentage || 0;
        const progressB = getProgressForPhrase(b.id)?.progressPercentage || 0;
        return progressA - progressB; // Lowest progress first
      });
    }

    return filtered;
  }, [phrases, sortOption, filterOption, isFavorite, getProgressForPhrase]);

  // Selection handlers
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

  const handleSelectAll = () => {
    setSelectedPhrases(new Set(filteredAndSortedPhrases.map((p) => p.id)));
  };

  const handleDeselectAll = () => {
    setSelectedPhrases(new Set());
  };

  const handleEnterExportMode = () => {
    setIsExportMode(true);
    // Select all filtered phrases when entering export mode
    setSelectedPhrases(new Set(filteredAndSortedPhrases.map((p) => p.id)));
  };

  const handleExitExportMode = () => {
    setIsExportMode(false);
    setSelectedPhrases(new Set());
  };

  // Convert selected phrases to format expected by AnkiExporter
  const selectedPhrasesData = phrases.filter((p) => selectedPhrases.has(p.id));
  const ankiPhrases = selectedPhrasesData.map((phrase) => ({
    phrase: phrase.phrase,
    translation: phrase.translation,
    frequency: 1,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-tr from-red-200 to-green-500">
      <div className="container mx-auto px-4 py-8">
        {/* Header with Breadcrumbs */}
        <div className="mb-8">
          <Breadcrumb
            items={[
              { label: "Shows", href: "/" },
              { label: show.name, href: `/${generateShowSlug(show.name)}` },
              {
                label: `S${episode.season
                  ?.toString()
                  .padStart(2, "0")}E${episode.episode_number
                  ?.toString()
                  .padStart(2, "0")}`,
                isCurrentPage: true,
              },
            ]}
            className="mb-6"
          />

          {/* Episode info section */}
          <EpisodeInfoSection 
            show={show}
            episode={episode}
            phrases={phrases}
            onStartStudy={() => setShowStudyGame(true)}
          />
        </div>

        {/* Episode Statistics */}
        {/* <EpisodeStatistics
          totalPhrases={phrases.length}
          season={episode.season || 0}
          episodeNumber={episode.episode_number || 0}
          showName={show.name || ""}
        /> */}

        {/* Phrases Grid */}
        {phrases.length > 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-800">Phrases</h2>
              <div className="flex items-center space-x-3">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  {phrases.length} phrases
                </span>
                <AnkiExporter
                  phrases={ankiPhrases}
                  isExportMode={isExportMode}
                  onEnterExportMode={handleEnterExportMode}
                  onExitExportMode={handleExitExportMode}
                  selectedCount={selectedPhrases.size}
                  totalCount={filteredAndSortedPhrases.length}
                  onSelectAll={handleSelectAll}
                  onDeselectAll={handleDeselectAll}
                />
              </div>
            </div>

            <div className="flex items-center justify-between mb-4">
              <PhraseSortAndFilter
                onSortChange={setSortOption}
                onFilterChange={setFilterOption}
                currentSort={sortOption}
                currentFilter={filterOption}
                totalPhrases={phrases.length}
                filteredPhrases={filteredAndSortedPhrases.length}
              />
              <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === "grid"
                      ? "bg-white shadow-sm text-gray-900"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                  title="Grid view"
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === "list"
                      ? "bg-white shadow-sm text-gray-900"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                  title="List view"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

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
                      ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start"
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
                        transition={{
                          duration: 0.2,
                          delay: index * 0.02,
                          ease: "easeOut",
                        }}
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
                          progressPercentage={
                            progressData?.progressPercentage || 0
                          }
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
              <div className="text-center py-8">
                <p className="text-gray-600">
                  {filterOption === "favorites"
                    ? "No favorite phrases found. Try favoriting some phrases first!"
                    : "No phrases match your current filters."}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Phrases Found
            </h3>
            <p className="text-gray-600">
              This episode doesn&apos;t have any extracted phrases yet.
            </p>
          </div>
        )}

        {/* Spaced Repetition Game */}
        <SpacedRepetitionGame
          episodeId={episode.id}
          episodeTitle={`S${episode.season
            ?.toString()
            .padStart(2, "0")}E${episode.episode_number
            ?.toString()
            .padStart(2, "0")}${episode.title ? ` - ${episode.title}` : ""}`}
          open={showStudyGame}
          onClose={() => setShowStudyGame(false)}
        />
      </div>
    </div>
  );
}
