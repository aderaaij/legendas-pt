"use client";

import { Save, X } from "lucide-react";
import * as Dialog from "@radix-ui/react-dialog";

import { Show, Episode } from "@/lib/supabase";
import ModalBase from "@/app/components/ui/ModalBase";

import EpisodeMetadataForm from "./EpisodeMetadataForm";
import ShowMetadataForm from "./ShowMetadataForm";
import TVDBSearchSection from "./TVDBSearchSection";
import { useMetadataEditor } from "./useMetadataEditor";

interface MetadataEditorProps {
  extractionId: string;
  currentShow?: Show;
  currentEpisode?: Episode;
  onUpdate: (show?: Show, episode?: Episode) => void;
  onClose: () => void;
  isOpen: boolean;
}

export default function MetadataEditor({
  extractionId,
  currentShow,
  currentEpisode,
  onUpdate,
  onClose,
  isOpen,
}: MetadataEditorProps) {
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    searching,
    saving,
    error,
    showData,
    updateShowData,
    episodeData,
    updateEpisodeData,
    selectedTVDBShow,
    handleSearch,
    selectTVDBShow,
    handleSave,
  } = useMetadataEditor({
    extractionId,
    currentShow,
    currentEpisode,
    onUpdate,
    onClose,
  });

  return (
    <ModalBase
      isOpen={isOpen}
      onClose={onClose}
      contentClassName="rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-4"
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Dialog.Title
            className="text-2xl font-bold"
            style={{ color: "var(--text)" }}
          >
            Edit Metadata
          </Dialog.Title>
          <Dialog.Close
            className="p-2 transition-colors"
            style={{ color: "var(--faint)" }}
          >
            <X className="w-5 h-5" />
          </Dialog.Close>
        </div>

        {error && (
          <div
            className="rounded-lg p-3 mb-6"
            style={{
              background: "rgba(229,9,20,.12)",
              border: "1px solid rgba(229,9,20,.25)",
            }}
          >
            <p className="text-sm" style={{ color: "var(--accent2)" }}>
              {error}
            </p>
          </div>
        )}

        <TVDBSearchSection
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          onSearch={handleSearch}
          searching={searching}
          searchResults={searchResults}
          selectedTVDBShow={selectedTVDBShow}
          onSelectResult={selectTVDBShow}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ShowMetadataForm showData={showData} onChange={updateShowData} />
          <EpisodeMetadataForm
            episodeData={episodeData}
            onChange={updateEpisodeData}
          />
        </div>

        {/* Action Buttons */}
        <div
          className="flex items-center justify-end space-x-3 mt-8 pt-6"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md transition-colors"
            style={{
              background: "var(--surface2)",
              border: "1px solid var(--border2)",
              color: "var(--text)",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !showData.name.trim()}
            className="flex items-center space-x-2 px-6 py-2 rounded-md disabled:opacity-50 transition-colors"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Saving..." : "Save Metadata"}</span>
          </button>
        </div>
      </div>
    </ModalBase>
  );
}
