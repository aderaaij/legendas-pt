"use client";

import MetadataEditor from "@/app/components/MetadataEditor";
import DuplicatePhraseManager from "@/app/components/DuplicatePhraseManager";

import AddPhraseForm from "./AddPhraseForm";
import PhraseEditorHeader from "./PhraseEditorHeader";
import PhraseListItem from "./PhraseListItem";
import PhraseStatsBar from "./PhraseStatsBar";
import { usePhraseEditor } from "./usePhraseEditor";

interface PhraseEditorProps {
  extractionId: string;
  showName: string;
  episodeTitle?: string;
  onBack: () => void;
}

export default function PhraseEditor({
  extractionId,
  showName,
  episodeTitle,
  onBack,
}: PhraseEditorProps) {
  const {
    phrases,
    loading,
    saving,
    error,
    setError,
    newPhrase,
    setNewPhrase,
    showAddForm,
    setShowAddForm,
    showDuplicateManager,
    setShowDuplicateManager,
    duplicateGroups,
    duplicateCount,
    showMetadataEditor,
    setShowMetadataEditor,
    currentShow,
    currentEpisode,
    displayShowName,
    displayEpisodeTitle,
    startEditing,
    cancelEditing,
    updatePhraseField,
    savePhrase,
    deletePhrase,
    addNewPhrase,
    handleDuplicateManageComplete,
    handleMetadataUpdate,
  } = usePhraseEditor({ extractionId, showName, episodeTitle });

  // Convert to format expected by AnkiExporter
  const ankiPhrases = phrases.map((phrase) => ({
    phrase: phrase.phrase,
    translation: phrase.translation,
    frequency: 1,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div
          className="animate-spin rounded-full h-8 w-8 border-b-2"
          style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
        ></div>
        <span className="ml-2" style={{ color: "var(--muted)" }}>
          Loading phrases...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PhraseEditorHeader
        displayShowName={displayShowName}
        displayEpisodeTitle={displayEpisodeTitle}
        currentShow={currentShow}
        currentEpisode={currentEpisode}
        ankiPhrases={ankiPhrases}
        duplicateCount={duplicateCount}
        onBack={onBack}
        onEditMetadata={() => setShowMetadataEditor(true)}
        onManageDuplicates={() => setShowDuplicateManager(true)}
        onAddPhrase={() => setShowAddForm(true)}
      />

      {error && (
        <div
          className="rounded-lg p-3"
          style={{
            background: "rgba(229,9,20,.12)",
            border: "1px solid rgba(229,9,20,.25)",
          }}
        >
          <p className="text-sm" style={{ color: "var(--accent2)" }}>
            {error}
          </p>
          <button
            onClick={() => setError("")}
            className="underline hover:no-underline text-xs mt-1"
            style={{ color: "var(--accent2)" }}
          >
            Dismiss
          </button>
        </div>
      )}

      {showAddForm && (
        <AddPhraseForm
          newPhrase={newPhrase}
          saving={saving}
          onChange={(patch) => setNewPhrase((prev) => ({ ...prev, ...patch }))}
          onAdd={addNewPhrase}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      <PhraseStatsBar
        total={phrases.length}
        duplicateCount={duplicateCount}
        unsavedChanges={phrases.filter((p) => p.hasChanges).length}
      />

      <div className="space-y-3">
        {phrases.map((phrase) => (
          <PhraseListItem
            key={phrase.id}
            phrase={phrase}
            saving={saving}
            onStartEdit={startEditing}
            onCancelEdit={cancelEditing}
            onUpdateField={updatePhraseField}
            onSave={savePhrase}
            onDelete={deletePhrase}
          />
        ))}
      </div>

      {phrases.length === 0 && (
        <div
          className="text-center py-12 rounded-lg"
          style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
        >
          <p style={{ color: "var(--muted)" }}>
            No phrases found for this extraction.
          </p>
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
