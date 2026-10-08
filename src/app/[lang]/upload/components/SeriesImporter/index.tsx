"use client";

import JobStatusBanner from "@/app/components/common/JobStatusBanner";

import ShowMapper from "../ShowMapper";
import ShowTVDBCreator from "../ShowTVDBCreator";
import ProcessingResults from "./ProcessingResults";
import SeriesUrlForm from "./SeriesUrlForm";
import SeriesPreviewCard from "./SeriesPreviewCard";
import SeriesPreviewSkeleton from "./SeriesPreviewSkeleton";
import { useSeriesImporter } from "./useSeriesImporter";

export default function SeriesImporter() {
  const {
    user,
    isAdmin,
    seriesUrl,
    setSeriesUrl,
    isScrapingPreview,
    isProcessing,
    saveToDatabase,
    setSaveToDatabase,
    forceReExtraction,
    setForceReExtraction,
    seriesPreview,
    results,
    summary,
    error,
    selectedEpisodes,
    toggleEpisodeSelection,
    selectAllEpisodes,
    deselectAllEpisodes,
    showMappingStep,
    selectedShow,
    setSelectedShow,
    handlePreview,
    handleSeasonChange,
    handleProcess,
    handleShowSelected,
    handleShowCreated,
    handleCancelMapping,
    handleCreateNewShow,
  } = useSeriesImporter();

  // The mapping/creation modals should preview only the episodes the user chose
  // to import (the backend already filters on the same selection), not the whole
  // series.
  const episodesToImport = (seriesPreview?.episodes ?? []).filter((ep) =>
    selectedEpisodes.has(ep.episodeNumber)
  );
  // The whole import uses one season (parsed from the RTP title or the chosen
  // RTVE season; defaults to 1). Mirror the backend's resolution.
  const importSeason = seriesPreview?.season ?? 1;

  // Show authentication message if not logged in or not admin
  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div
          className="rounded-lg p-6 text-center"
          style={{
            background: "rgba(247,181,0,.1)",
            border: "1px solid rgba(247,181,0,.25)",
          }}
        >
          <h3 className="text-lg font-semibold mb-2" style={{ color: "var(--gold)" }}>
            Authentication Required
          </h3>
          <p style={{ color: "var(--muted)" }}>
            Please log in to use the Series Importer.
          </p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div
          className="rounded-lg p-6 text-center"
          style={{
            background: "rgba(229,9,20,.1)",
            border: "1px solid rgba(229,9,20,.25)",
          }}
        >
          <h3
            className="text-lg font-semibold mb-2"
            style={{ color: "var(--accent2)" }}
          >
            Admin Access Required
          </h3>
          <p style={{ color: "var(--muted)" }}>
            Only administrators can use the Series Importer.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <JobStatusBanner />

      <SeriesUrlForm
        seriesUrl={seriesUrl}
        onUrlChange={setSeriesUrl}
        onPreview={handlePreview}
        isScrapingPreview={isScrapingPreview}
        isProcessing={isProcessing}
        error={error}
      />

      {isScrapingPreview && <SeriesPreviewSkeleton />}

      {seriesPreview && !isScrapingPreview && (
        <SeriesPreviewCard
          seriesPreview={seriesPreview}
          onSeasonChange={handleSeasonChange}
          selectedEpisodes={selectedEpisodes}
          onToggleEpisode={toggleEpisodeSelection}
          onSelectAll={selectAllEpisodes}
          onDeselectAll={deselectAllEpisodes}
          selectedShow={selectedShow}
          onChangeShowSelection={() => setSelectedShow(null)}
          saveToDatabase={saveToDatabase}
          onSaveToDatabaseChange={setSaveToDatabase}
          forceReExtraction={forceReExtraction}
          onForceReExtractionChange={setForceReExtraction}
          isProcessing={isProcessing}
          onProcess={handleProcess}
        />
      )}

      {(results.length > 0 || summary) && (
        <ProcessingResults results={results} summary={summary} />
      )}

      {isProcessing && (
        <div
          className="rounded-lg p-6"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center justify-center space-x-2">
            <div
              className="animate-spin rounded-full h-6 w-6 border-b-2"
              style={{
                borderColor: "var(--accent)",
                borderBottomColor: "var(--accent)",
              }}
            ></div>
            <span>Processing episodes... This may take several minutes.</span>
          </div>
        </div>
      )}

      {/* Show Mapping Modal */}
      <ShowMapper
        isOpen={showMappingStep === "mapping"}
        seriesTitle={seriesPreview?.title || ""}
        source={seriesPreview?.source ?? "rtp"}
        episodes={episodesToImport}
        season={importSeason}
        onShowSelected={handleShowSelected}
        onCreateNewShow={handleCreateNewShow}
        onCancel={handleCancelMapping}
      />

      {/* Show TVDB Creator Modal — keyed by series so its form state is seeded
          from the previewed series rather than the empty first render. */}
      <ShowTVDBCreator
        key={seriesPreview ? `${seriesPreview.source}:${seriesPreview.id}` : "none"}
        isOpen={showMappingStep === "creating"}
        seriesTitle={seriesPreview?.title || ""}
        source={seriesPreview?.source ?? "rtp"}
        episodes={episodesToImport}
        season={importSeason}
        onShowCreated={handleShowCreated}
        onCancel={handleCancelMapping}
      />
    </div>
  );
}
