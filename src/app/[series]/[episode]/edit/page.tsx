"use client";

import Link from "next/link";

import MetadataEditor from "@/app/components/phrase/MetadataEditor";
import PhraseEditor from "@/app/components/phrase/PhraseEditor";
import { AdminRoute } from "@/app/components/common/ProtectedRoute";
import { useEpisodeEdit } from "@/hooks/useEpisodeEdit";

import EpisodeEditHeader from "./components/EpisodeEditHeader";
import EpisodeSettingsCard from "./components/EpisodeSettingsCard";
import ExtractionsSection from "./components/ExtractionsSection";

export default function EpisodeEditPage() {
  const {
    show,
    episodeData,
    phrases,
    extractions,
    loading,
    error,
    deleting,
    showMetadataEditor,
    setShowMetadataEditor,
    viewMode,
    editingSession,
    handleEditExtraction,
    handleBackFromPhraseEdit,
    deleteExtraction,
    deleteEpisode,
    handleMetadataUpdate,
  } = useEpisodeEdit();

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--bg)", color: "var(--text)" }}
      >
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-8 w-8 border-2 mx-auto mb-4"
            style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
          ></div>
          <p style={{ color: "var(--muted)" }}>Loading episode...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--bg)", color: "var(--text)" }}
      >
        <div className="text-center max-w-md">
          <div
            className="rounded-[var(--radius-lg)] p-6"
            style={{
              background: "rgba(229,9,20,.12)",
              border: "1px solid rgba(229,9,20,.25)",
            }}
          >
            <p className="mb-4" style={{ color: "var(--accent2)" }}>
              {error}
            </p>
            <Link
              href="/"
              className="inline-block px-4 py-2 rounded-md transition-opacity hover:opacity-90"
              style={{ background: "var(--accent)", color: "#fff" }}
            >
              Back to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === "phrase-edit" && editingSession) {
    return (
      <div
        className="min-h-screen"
        style={{ background: "var(--bg)", color: "var(--text)" }}
      >
        <div className="container mx-auto px-4 py-8">
          <PhraseEditor
            extractionId={editingSession.extractionId}
            showName={editingSession.showName}
            episodeTitle={editingSession.episodeTitle}
            onBack={handleBackFromPhraseEdit}
          />
        </div>
      </div>
    );
  }

  return (
    <AdminRoute redirectTo="/">
      <div
        className="min-h-screen"
        style={{ background: "var(--bg)", color: "var(--text)" }}
      >
        <div className="container mx-auto px-4 py-8">
          <EpisodeEditHeader show={show} episodeData={episodeData} />

          <EpisodeSettingsCard
            show={show}
            episodeData={episodeData}
            phrasesCount={phrases.length}
            extractionsCount={extractions.length}
            isDeletingEpisode={deleting === episodeData?.id}
            onEditMetadata={() => setShowMetadataEditor(true)}
            onDeleteEpisode={deleteEpisode}
          />

          <ExtractionsSection
            extractions={extractions}
            deleting={deleting}
            showName={show?.name ?? ""}
            onEditExtraction={handleEditExtraction}
            onDeleteExtraction={deleteExtraction}
          />

          {/* Metadata Editor Modal */}
          {show && episodeData && (
            <MetadataEditor
              extractionId="" // Not needed for episode-level editing
              currentShow={show}
              currentEpisode={episodeData}
              onUpdate={handleMetadataUpdate}
              onClose={() => setShowMetadataEditor(false)}
              isOpen={showMetadataEditor}
            />
          )}
        </div>
      </div>
    </AdminRoute>
  );
}
