"use client";

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Save, Trash2, Plus, Edit3, Settings } from "lucide-react";
import {
  PhraseExtractionService,
  ExtractedPhrase,
  Show,
  Episode,
} from "../../lib/supabase";
import AnkiExporter from "./AnkiExporter";
import MetadataEditor from "./MetadataEditor";

interface PhraseEditorProps {
  extractionId: string;
  showName: string;
  episodeTitle?: string;
  onBack: () => void;
}

interface EditablePhrase extends ExtractedPhrase {
  isEditing: boolean;
  hasChanges: boolean;
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

  // Metadata state
  const [showMetadataEditor, setShowMetadataEditor] = useState(false);
  const [currentShow, setCurrentShow] = useState<Show | undefined>();
  const [currentEpisode, setCurrentEpisode] = useState<Episode | undefined>();
  const [displayShowName, setDisplayShowName] = useState(showName);
  const [displayEpisodeTitle, setDisplayEpisodeTitle] = useState(episodeTitle);

  const loadPhrases = useCallback(async () => {
    try {
      setLoading(true);

      const extractedPhrases =
        await PhraseExtractionService.getExtractedPhrases(extractionId);

      setPhrases(
        extractedPhrases.map((phrase) => ({
          ...phrase,
          isEditing: false,
          hasChanges: false,
        }))
      );
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

      // Note: You'll need to add an update method to PhraseExtractionService
      // For now, this is a placeholder

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

      // Note: You'll need to add a delete method to PhraseExtractionService

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

      // Note: You'll need to add an insert method to PhraseExtractionService
      const newPhraseData = {
        extraction_id: extractionId,
        phrase: newPhrase.phrase,
        translation: newPhrase.translation,
        position_in_content: phrases.length,
      };

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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading phrases...</span>
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
            className="flex items-center space-x-1 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Management</span>
          </button>

          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold text-gray-900">
                {displayShowName}
              </h1>
              <button
                onClick={() => setShowMetadataEditor(true)}
                className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                title="Edit metadata"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
            {displayEpisodeTitle && (
              <p className="text-gray-600">{displayEpisodeTitle}</p>
            )}
            {currentShow && (
              <div className="flex items-center space-x-2 text-sm text-gray-500 mt-1">
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
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center space-x-1 bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Phrase</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-600 text-sm">{error}</p>
          <button
            onClick={() => setError("")}
            className="text-red-700 underline hover:no-underline text-xs mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Add New Phrase Form */}
      {showAddForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-3">Add New Phrase</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Portuguese Phrase *
              </label>
              <input
                type="text"
                value={newPhrase.phrase}
                onChange={(e) =>
                  setNewPhrase((prev) => ({ ...prev, phrase: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter Portuguese phrase..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter English translation..."
              />
            </div>
          </div>
          <div className="flex items-center space-x-2 mt-3">
            <button
              onClick={addNewPhrase}
              disabled={saving}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Adding..." : "Add Phrase"}
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>{phrases.length} phrases total</span>
          <span>
            {phrases.filter((p) => p.hasChanges).length} unsaved changes
          </span>
        </div>
      </div>

      {/* Phrases List */}
      <div className="space-y-3">
        {phrases.map((phrase) => (
          <div
            key={phrase.id}
            className={`bg-white rounded-lg border p-4 transition-all ${
              phrase.hasChanges
                ? "border-yellow-300 bg-yellow-50"
                : "border-gray-200"
            }`}
          >
            {phrase.isEditing ? (
              /* Edit Mode */
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Portuguese Phrase
                    </label>
                    <input
                      type="text"
                      value={phrase.phrase}
                      onChange={(e) =>
                        updatePhrase(phrase.id, "phrase", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      English Translation
                    </label>
                    <input
                      type="text"
                      value={phrase.translation}
                      onChange={(e) =>
                        updatePhrase(phrase.id, "translation", e.target.value)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => savePhrase(phrase.id)}
                    disabled={saving}
                    className="flex items-center space-x-1 bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    <Save className="w-3 h-3" />
                    <span>{saving ? "Saving..." : "Save"}</span>
                  </button>
                  <button
                    onClick={() => cancelEditing(phrase.id)}
                    className="bg-gray-300 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* View Mode */
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 mb-1">
                    {phrase.phrase}
                  </div>
                  <div className="text-gray-600 mb-2">{phrase.translation}</div>
                </div>
                <div className="flex items-center space-x-1 ml-4">
                  <button
                    onClick={() => startEditing(phrase.id)}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                    title="Edit phrase"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deletePhrase(phrase.id)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
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
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No phrases found for this extraction.</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="mt-2 text-blue-600 underline hover:no-underline"
          >
            Add the first phrase
          </button>
        </div>
      )}

      {/* Metadata Editor Modal */}
      {showMetadataEditor && (
        <MetadataEditor
          extractionId={extractionId}
          currentShow={currentShow}
          currentEpisode={currentEpisode}
          onUpdate={handleMetadataUpdate}
          onClose={() => setShowMetadataEditor(false)}
        />
      )}
    </div>
  );
}
