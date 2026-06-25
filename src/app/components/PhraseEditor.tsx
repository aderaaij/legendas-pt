"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Save, Trash2, Plus, Edit3, Settings, Copy } from "lucide-react";
import {
  PhraseExtractionService,
  ExtractedPhrase,
  Show,
  Episode,
} from "../../lib/supabase";
import AnkiExporter from "./AnkiExporter";
import MetadataEditor from "./MetadataEditor";
import DuplicatePhraseManager from "./DuplicatePhraseManager";

interface PhraseEditorProps {
  extractionId: string;
  showName: string;
  episodeTitle?: string;
  onBack: () => void;
}

interface EditablePhrase extends ExtractedPhrase {
  isEditing: boolean;
  hasChanges: boolean;
  isDuplicate?: boolean;
  duplicateCount?: number;
}

export default function PhraseEditor({
  extractionId,
  showName,
  episodeTitle,
  onBack,
}: PhraseEditorProps) {
  const [phrases, setPhrases] = useState<EditablePhrase[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");
  const [newPhrase, setNewPhrase] = useState({
    phrase: "",
    translation: "",
  });
  const [showAddForm, setShowAddForm] = useState(false);

  // Duplicate management state
  const [showDuplicateManager, setShowDuplicateManager] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState<Array<{
    normalizedPhrase: string;
    phrases: ExtractedPhrase[];
  }>>([]);
  const [duplicateCount, setDuplicateCount] = useState(0);

  // Metadata state
  const [showMetadataEditor, setShowMetadataEditor] = useState(false);
  const [currentShow, setCurrentShow] = useState<Show | undefined>();
  const [currentEpisode, setCurrentEpisode] = useState<Episode | undefined>();
  const [displayShowName, setDisplayShowName] = useState(showName);
  const [displayEpisodeTitle, setDisplayEpisodeTitle] = useState(episodeTitle);

  const loadPhrases = useCallback(async () => {
    try {
      setLoading(true);

      const { phrases: phrasesWithDuplicates, duplicateGroups: foundDuplicates } =
        await PhraseExtractionService.getPhrasesWithDuplicateAnalysis(extractionId);

      setPhrases(
        phrasesWithDuplicates.map((phrase) => ({
          ...phrase,
          isEditing: false,
          hasChanges: false,
        }))
      );

      setDuplicateGroups(foundDuplicates);
      setDuplicateCount(foundDuplicates.reduce((sum, group) => sum + group.phrases.length - 1, 0));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to load phrases: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [extractionId]);

  const loadMetadata = useCallback(async () => {
    try {
      const extractionData =
        await PhraseExtractionService.getExtractionWithMetadata(extractionId);
      setCurrentShow(extractionData.show);
      setCurrentEpisode(extractionData.episode);

      // Update display names if we have better data
      if (extractionData.show?.name) {
        setDisplayShowName(extractionData.show.name);
      }
      if (extractionData.episode?.title) {
        setDisplayEpisodeTitle(extractionData.episode.title);
      }
    } catch (err) {
      console.error("Failed to load metadata:", err);
    }
  }, [extractionId]);

  useEffect(() => {
    loadPhrases();
    loadMetadata();
  }, [extractionId, loadPhrases, loadMetadata]);

  const startEditing = (phraseId: string) => {
    setPhrases((prev) =>
      prev.map((phrase) =>
        phrase.id === phraseId ? { ...phrase, isEditing: true } : phrase
      )
    );
  };

  const cancelEditing = (phraseId: string) => {
    setPhrases((prev) =>
      prev.map((phrase) =>
        phrase.id === phraseId
          ? { ...phrase, isEditing: false, hasChanges: false }
          : phrase
      )
    );
    // Reload to reset changes
    loadPhrases();
  };

  const updatePhrase = (
    phraseId: string,
    field: keyof ExtractedPhrase,
    value: string
  ) => {
    setPhrases((prev) =>
      prev.map((phrase) =>
        phrase.id === phraseId
          ? { ...phrase, [field]: value, hasChanges: true }
          : phrase
      )
    );
  };

  const savePhrase = async (phraseId: string) => {
    const phrase = phrases.find((p) => p.id === phraseId);
    if (!phrase) return;

    try {
      setSaving(true);

      await PhraseExtractionService.updatePhrase(phraseId, {
        phrase: phrase.phrase,
        translation: phrase.translation,
      });

      setPhrases((prev) =>
        prev.map((p) =>
          p.id === phraseId ? { ...p, isEditing: false, hasChanges: false } : p
        )
      );
    } catch (err) {
      setError("Failed to save phrase");
      console.error("Error saving phrase:", err);
    } finally {
      setSaving(false);
    }
  };

  const deletePhrase = async (phraseId: string) => {
    if (!confirm("Are you sure you want to delete this phrase?")) return;

    try {
      setSaving(true);

      await PhraseExtractionService.deletePhrase(phraseId);

      setPhrases((prev) => prev.filter((p) => p.id !== phraseId));
    } catch (err) {
      setError("Failed to delete phrase");
      console.error("Error deleting phrase:", err);
    } finally {
      setSaving(false);
    }
  };

  const addNewPhrase = async () => {
    if (!newPhrase.phrase.trim() || !newPhrase.translation.trim()) {
      setError("Phrase and translation are required");
      return;
    }

    try {
      setSaving(true);

      await PhraseExtractionService.addPhrase(
        extractionId,
        newPhrase.phrase.trim(),
        newPhrase.translation.trim()
      );

      // Reset form
      setNewPhrase({ phrase: "", translation: "" });
      setShowAddForm(false);

      // Reload phrases
      await loadPhrases();
    } catch (err) {
      setError("Failed to add phrase");
      console.error("Error adding phrase:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicateManageComplete = () => {
    setShowDuplicateManager(false);
    // Reload phrases to get updated duplicate analysis
    loadPhrases();
  };

  const handleMetadataUpdate = (
    updatedShow?: Show,
    updatedEpisode?: Episode
  ) => {
    setCurrentShow(updatedShow);
    setCurrentEpisode(updatedEpisode);

    if (updatedShow?.name) {
      setDisplayShowName(updatedShow.name);
    }
    if (updatedEpisode?.title) {
      setDisplayEpisodeTitle(updatedEpisode.title);
    }
  };

  // Convert to format expected by AnkiExporter
  const ankiPhrases = phrases.map((phrase) => ({
    phrase: phrase.phrase,
    translation: phrase.translation,
    frequency: 1,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}></div>
        <span className="ml-2" style={{ color: "var(--muted)" }}>Loading phrases...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col space-x-3">
          <button
            onClick={onBack}
            className="flex items-center space-x-1 transition-colors"
            style={{ color: "var(--muted)" }}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Management</span>
          </button>

          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
                {displayShowName}
              </h1>
              <button
                onClick={() => setShowMetadataEditor(true)}
                className="p-1 transition-colors"
                style={{ color: "var(--faint)" }}
                title="Edit metadata"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
            {displayEpisodeTitle && (
              <p style={{ color: "var(--muted)" }}>{displayEpisodeTitle}</p>
            )}
            {currentShow && (
              <div className="flex items-center space-x-2 text-sm mt-1" style={{ color: "var(--faint)" }}>
                {currentShow.network && <span>{currentShow.network}</span>}
                {currentEpisode?.season && currentEpisode?.episode_number && (
                  <>
                    <span>•</span>
                    <span>
                      S{currentEpisode.season}E{currentEpisode.episode_number}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <AnkiExporter phrases={ankiPhrases} />
          {duplicateCount > 0 && (
            <button
              onClick={() => setShowDuplicateManager(true)}
              className="flex items-center space-x-1 px-3 py-2 rounded-md transition-colors"
              style={{ background: "var(--amber)", color: "#221603" }}
            >
              <Copy className="w-4 h-4" />
              <span>Manage Duplicates ({duplicateCount})</span>
            </button>
          )}
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center space-x-1 px-3 py-2 rounded-md transition-colors"
            style={{ background: "var(--green)", color: "#04210f" }}
          >
            <Plus className="w-4 h-4" />
            <span>Add Phrase</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg p-3" style={{ background: "rgba(229,9,20,.12)", border: "1px solid rgba(229,9,20,.25)" }}>
          <p className="text-sm" style={{ color: "var(--accent2)" }}>{error}</p>
          <button
            onClick={() => setError("")}
            className="underline hover:no-underline text-xs mt-1"
            style={{ color: "var(--accent2)" }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Add New Phrase Form */}
      {showAddForm && (
        <div className="rounded-lg p-4" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
          <h3 className="font-semibold mb-3" style={{ color: "var(--text)" }}>Add New Phrase</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--muted)" }}>
                Portuguese Phrase *
              </label>
              <input
                type="text"
                value={newPhrase.phrase}
                onChange={(e) =>
                  setNewPhrase((prev) => ({ ...prev, phrase: e.target.value }))
                }
                className="w-full px-3 py-2 rounded-md focus:outline-none"
                style={{ background: "var(--bg2)", border: "1px solid var(--border)", color: "var(--text)" }}
                placeholder="Enter Portuguese phrase..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "var(--muted)" }}>
                English Translation *
              </label>
              <input
                type="text"
                value={newPhrase.translation}
                onChange={(e) =>
                  setNewPhrase((prev) => ({
                    ...prev,
                    translation: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 rounded-md focus:outline-none"
                style={{ background: "var(--bg2)", border: "1px solid var(--border)", color: "var(--text)" }}
                placeholder="Enter English translation..."
              />
            </div>
          </div>
          <div className="flex items-center space-x-2 mt-3">
            <button
              onClick={addNewPhrase}
              disabled={saving}
              className="px-4 py-2 rounded-md disabled:opacity-50 transition-colors"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              {saving ? "Adding..." : "Add Phrase"}
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 rounded-md transition-colors"
              style={{ background: "var(--surface2)", border: "1px solid var(--border2)", color: "var(--text)" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="rounded-lg p-4" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between text-sm" style={{ color: "var(--muted)" }}>
          <span>{phrases.length} phrases total</span>
          <div className="flex items-center space-x-4">
            {duplicateCount > 0 && (
              <span className="font-medium" style={{ color: "var(--amber)" }}>
                {duplicateCount} duplicates found
              </span>
            )}
            <span>
              {phrases.filter((p) => p.hasChanges).length} unsaved changes
            </span>
          </div>
        </div>
      </div>

      {/* Phrases List */}
      <div className="space-y-3">
        {phrases.map((phrase) => (
          <div
            key={phrase.id}
            className="rounded-lg p-4 transition-all"
            style={{
              background: phrase.hasChanges
                ? "rgba(245,196,81,.08)"
                : phrase.isDuplicate
                ? "rgba(245,166,35,.08)"
                : "var(--surface)",
              border: `1px solid ${
                phrase.hasChanges
                  ? "rgba(245,196,81,.4)"
                  : phrase.isDuplicate
                  ? "rgba(245,166,35,.4)"
                  : "var(--border)"
              }`,
            }}
          >
            {phrase.isEditing ? (
              /* Edit Mode */
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: "var(--muted)" }}>
                      Portuguese Phrase
                    </label>
                    <input
                      type="text"
                      value={phrase.phrase}
                      onChange={(e) =>
                        updatePhrase(phrase.id, "phrase", e.target.value)
                      }
                      className="w-full px-3 py-2 rounded-md focus:outline-none"
                      style={{ background: "var(--bg2)", border: "1px solid var(--border)", color: "var(--text)" }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: "var(--muted)" }}>
                      English Translation
                    </label>
                    <input
                      type="text"
                      value={phrase.translation}
                      onChange={(e) =>
                        updatePhrase(phrase.id, "translation", e.target.value)
                      }
                      className="w-full px-3 py-2 rounded-md focus:outline-none"
                      style={{ background: "var(--bg2)", border: "1px solid var(--border)", color: "var(--text)" }}
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => savePhrase(phrase.id)}
                    disabled={saving}
                    className="flex items-center space-x-1 px-3 py-1 rounded text-sm disabled:opacity-50 transition-colors"
                    style={{ background: "var(--green)", color: "#04210f" }}
                  >
                    <Save className="w-3 h-3" />
                    <span>{saving ? "Saving..." : "Save"}</span>
                  </button>
                  <button
                    onClick={() => cancelEditing(phrase.id)}
                    className="px-3 py-1 rounded text-sm transition-colors"
                    style={{ background: "var(--surface2)", border: "1px solid var(--border2)", color: "var(--text)" }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* View Mode */
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <div className="font-semibold" style={{ color: "var(--text)" }}>
                      {phrase.phrase}
                    </div>
                    {phrase.isDuplicate && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium" style={{ background: "rgba(245,166,35,.15)", color: "var(--amber)" }}>
                        Duplicate ({phrase.duplicateCount})
                      </span>
                    )}
                  </div>
                  <div className="mb-2" style={{ color: "var(--muted)" }}>{phrase.translation}</div>
                </div>
                <div className="flex items-center space-x-1 ml-4">
                  <button
                    onClick={() => startEditing(phrase.id)}
                    className="p-1 transition-colors"
                    style={{ color: "var(--faint)" }}
                    title="Edit phrase"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deletePhrase(phrase.id)}
                    className="p-1 transition-colors"
                    style={{ color: "var(--faint)" }}
                    title="Delete phrase"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {phrases.length === 0 && (
        <div className="text-center py-12 rounded-lg" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
          <p style={{ color: "var(--muted)" }}>No phrases found for this extraction.</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="mt-2 underline hover:no-underline"
            style={{ color: "var(--accent2)" }}
          >
            Add the first phrase
          </button>
        </div>
      )}

      {/* Metadata Editor Modal */}
      <MetadataEditor
        extractionId={extractionId}
        currentShow={currentShow}
        currentEpisode={currentEpisode}
        onUpdate={handleMetadataUpdate}
        onClose={() => setShowMetadataEditor(false)}
        isOpen={showMetadataEditor}
      />

      {/* Duplicate Phrase Manager Modal */}
      <DuplicatePhraseManager
        extractionId={extractionId}
        duplicateGroups={duplicateGroups}
        onClose={() => setShowDuplicateManager(false)}
        onMergeComplete={handleDuplicateManageComplete}
        isOpen={showDuplicateManager}
      />
    </div>
  );
}
