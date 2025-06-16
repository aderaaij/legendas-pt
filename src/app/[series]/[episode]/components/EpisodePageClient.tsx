"use client";

import { useState, useMemo } from "react";
import { ArrowLeft, FileText, Settings, Brain } from "lucide-react";
import Link from "next/link";

import {
  ExtractedPhrase,
  Show,
  Episode,
} from "@/lib/supabase";
import { generateShowSlug } from "@/utils/slugify";
import AnkiExporter from "@/app/components/AnkiExporter";
import { useAuth } from "@/hooks/useAuth";
import { useFavorites } from "@/hooks/useFavorites";
import { useCardProgress } from "@/hooks/useCardProgress";
import { PhraseCard } from "@/app/components/PhraseCard";
import { EpisodeStatistics } from "@/app/components/EpisodeStatistics";
import { PhraseSortAndFilter, SortOption, FilterOption } from "@/app/components/PhraseSortAndFilter";
import { SpacedRepetitionGame } from "@/app/components/SpacedRepetitionGame";

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
  const [sortOption, setSortOption] = useState<SortOption>('none');
  const [filterOption, setFilterOption] = useState<FilterOption>('all');
  const [selectedPhrases, setSelectedPhrases] = useState<Set<string>>(new Set(phrases.map(p => p.id)));
  const [isExportMode, setIsExportMode] = useState(false);
  const [showStudyGame, setShowStudyGame] = useState(false);
  const { isAdmin, isAuthenticated } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { getProgressForPhrase } = useCardProgress(phrases.map(p => p.id));

  // Wrapper for toggleFavorite to match FavoriteButton's expected signature
  const handleToggleFavorite = async (phraseId: string): Promise<void> => {
    const result = await toggleFavorite(phraseId);
    if (result?.error) {
      console.error('Error toggling favorite:', result.error);
    }
  };

  // Filter and sort phrases
  const filteredAndSortedPhrases = useMemo(() => {
    let filtered = phrases;

    // Apply filter
    if (filterOption === 'favorites') {
      filtered = phrases.filter(phrase => isFavorite(phrase.id));
    }

    // Apply sort
    if (sortOption === 'alphabetical') {
      filtered = [...filtered].sort((a, b) => a.phrase.localeCompare(b.phrase));
    } else if (sortOption === 'reverse-alphabetical') {
      filtered = [...filtered].sort((a, b) => b.phrase.localeCompare(a.phrase));
    }

    return filtered;
  }, [phrases, sortOption, filterOption, isFavorite]);

  // Selection handlers
  const handlePhraseToggle = (phraseId: string) => {
    setSelectedPhrases(prev => {
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
    setSelectedPhrases(new Set(filteredAndSortedPhrases.map(p => p.id)));
  };

  const handleDeselectAll = () => {
    setSelectedPhrases(new Set());
  };

  const handleEnterExportMode = () => {
    setIsExportMode(true);
    // Select all filtered phrases when entering export mode
    setSelectedPhrases(new Set(filteredAndSortedPhrases.map(p => p.id)));
  };

  const handleExitExportMode = () => {
    setIsExportMode(false);
    setSelectedPhrases(new Set());
  };

  // Convert selected phrases to format expected by AnkiExporter
  const selectedPhrasesData = phrases.filter(p => selectedPhrases.has(p.id));
  const ankiPhrases = selectedPhrasesData.map((phrase) => ({
    phrase: phrase.phrase,
    translation: phrase.translation,
    frequency: 1,
  }));

  return (
    <div className="min-h-screen bg-gradient-to-tr from-red-200 to-green-500">
      <div className="container mx-auto px-4 py-8">
        {/* Header with Breadcrumbs */}
        <div className="flex flex-col justify-between mb-8">
          <div className="flex flex-col gap-2">
            {/* Breadcrumb navigation */}
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Link href="/" className="hover:text-gray-800 transition-colors">
                Shows
              </Link>
              <span>/</span>
              <Link
                href={`/${generateShowSlug(show.name)}`}
                className="hover:text-gray-800 transition-colors"
              >
                {show.name}
              </Link>
              <span>/</span>
              <span className="text-gray-900">
                S{episode.season?.toString().padStart(2, "0")}E
                {episode.episode_number?.toString().padStart(2, "0")}
              </span>
            </div>

            <Link
              href={`/${generateShowSlug(show.name)}`}
              className="flex items-center space-x-1 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Episodes</span>
            </Link>

            <div>
              <h1 className="text-3xl font-bold text-gray-900">{show.name}</h1>
              <p className="text-gray-600">
                Season {episode.season}, Episode{" "}
                {episode.episode_number}
                {episode.title && ` - ${episode.title}`}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 justify-end mt-4">
            {phrases.length > 0 && (
              <button
                onClick={() => setShowStudyGame(true)}
                className="inline-flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <Brain className="w-4 h-4" />
                <span>Start Study</span>
              </button>
            )}
            {isAdmin && (
              <Link
                href={`/${generateShowSlug(show.name)}/s${episode.season
                  ?.toString()
                  .padStart(2, "0")}e${episode.episode_number
                  ?.toString()
                  .padStart(2, "0")}/edit`}
                className="inline-flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span>Edit Episode</span>
              </Link>
            )}
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

        {/* Episode Statistics */}
        <EpisodeStatistics
          totalPhrases={phrases.length}
          season={episode.season || 0}
          episodeNumber={episode.episode_number || 0}
          showName={show.name || ""}
        />

        {/* Phrases Grid */}
        {phrases.length > 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-800">Phrases</h2>
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                {phrases.length} phrases
              </span>
            </div>

            <PhraseSortAndFilter
              onSortChange={setSortOption}
              onFilterChange={setFilterOption}
              currentSort={sortOption}
              currentFilter={filterOption}
              totalPhrases={phrases.length}
              filteredPhrases={filteredAndSortedPhrases.length}
            />

            {filteredAndSortedPhrases.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAndSortedPhrases.map((phrase, index) => {
                  const progressData = getProgressForPhrase(phrase.id);
                  return (
                    <PhraseCard 
                      key={phrase.id || index} 
                      phrase={phrase} 
                      isSelected={selectedPhrases.has(phrase.id)}
                      onToggleSelection={handlePhraseToggle}
                      showSelection={isExportMode}
                      isFavorite={isFavorite(phrase.id)}
                      onToggleFavorite={handleToggleFavorite}
                      showProgress={isAuthenticated}
                      progressPercentage={progressData?.progressPercentage || 0}
                      learningState={progressData?.state || 'New'}
                      isLearned={progressData?.isLearned || false}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">
                  {filterOption === 'favorites' 
                    ? "No favorite phrases found. Try favoriting some phrases first!"
                    : "No phrases match your current filters."
                  }
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
        {showStudyGame && (
          <SpacedRepetitionGame
            episodeId={episode.id}
            episodeTitle={`S${episode.season?.toString().padStart(2, "0")}E${episode.episode_number?.toString().padStart(2, "0")}${episode.title ? ` - ${episode.title}` : ""}`}
            onClose={() => setShowStudyGame(false)}
          />
        )}
      </div>
    </div>
  );
}