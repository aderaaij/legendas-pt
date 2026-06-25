"use client";

import { useParams } from "next/navigation";
import {
  Trash2,
  Edit3,
  AlertTriangle,
  FileText,
} from "lucide-react";
import Link from "next/link";

import { generateShowSlug } from "@/utils/slugify";
import { formatDate } from "@/utils/formatDate";
import MetadataEditor from "@/app/components/MetadataEditor";
import PhraseEditor from "@/app/components/PhraseEditor";
import { AdminRoute } from "@/app/components/ProtectedRoute";
import Breadcrumb from "@/app/components/Breadcrumb";
import { useShowEdit } from "@/hooks/useShowEdit";

export default function ShowEditPage() {
  const params = useParams();
  const series = params.series as string;

  const {
    show,
    episodes,
    extractions,
    loading,
    error,
    deleting,
    showMetadataEditor,
    viewMode,
    editingSession,
    setShowMetadataEditor,
    handleEditExtraction,
    handleBackFromPhraseEdit,
    deleteExtraction,
    deleteShow,
    handleMetadataUpdate,
  } = useShowEdit(series);

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
          <p style={{ color: "var(--muted)" }}>Loading show...</p>
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
            <p className="mb-4" style={{ color: "var(--accent2)" }}>{error}</p>
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
      <div className="min-h-screen" style={{ background: "var(--bg)", color: "var(--text)" }}>
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
      <div className="min-h-screen" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col justify-between mb-8">
          <div className="flex flex-col gap-2">
            <Breadcrumb
              items={[
                { label: "Shows", href: "/" },
                { label: show?.name || "", href: `/${generateShowSlug(show!.name)}` },
                { label: "Edit", isCurrentPage: true }
              ]}
              className="mb-2"
            />
            <div>
              <h1 className="text-3xl font-bold" style={{ color: "var(--text)" }}>
                Edit {show?.name}
              </h1>
              <p style={{ color: "var(--muted)" }}>
                Manage show metadata, episodes, and phrase extractions
              </p>
            </div>
          </div>
        </div>

        {/* Show Management */}
        <div
          className="rounded-[var(--radius-lg)] p-6 mb-8"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold" style={{ color: "var(--text)" }}>Show Settings</h2>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowMetadataEditor(true)}
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg transition-opacity hover:opacity-90"
                style={{ background: "var(--accent)", color: "#fff" }}
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit Metadata</span>
              </button>
              <button
                onClick={deleteShow}
                disabled={deleting === show!.id}
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
                style={{ background: "var(--surface2)", border: "1px solid var(--border2)", color: "var(--accent2)" }}
              >
                {deleting === show!.id ? (
                  <div
                    className="animate-spin rounded-full h-4 w-4 border-2"
                    style={{ borderColor: "var(--accent2)", borderTopColor: "transparent" }}
                  ></div>
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>Delete Show</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              className="p-4 rounded-[var(--radius)]"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
            >
              <div className="text-lg font-bold" style={{ color: "var(--blue)" }}>
                {episodes.length}
              </div>
              <div className="text-sm" style={{ color: "var(--muted)" }}>Episodes</div>
            </div>
            <div
              className="p-4 rounded-[var(--radius)]"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
            >
              <div className="text-lg font-bold" style={{ color: "var(--green)" }}>
                {extractions.length}
              </div>
              <div className="text-sm" style={{ color: "var(--muted)" }}>Extractions</div>
            </div>
            <div
              className="p-4 rounded-[var(--radius)]"
              style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
            >
              <div className="text-lg font-bold" style={{ color: "var(--gold)" }}>
                {extractions.reduce((acc, ext) => acc + (ext.current_phrase_count || 0), 0)}
              </div>
              <div className="text-sm" style={{ color: "var(--muted)" }}>Current Phrases</div>
            </div>
          </div>
        </div>

        {/* Extractions Management */}
        <div
          className="rounded-[var(--radius-lg)] p-6"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold" style={{ color: "var(--text)" }}>Phrase Extractions</h2>
            <span
              className="px-3 py-1 rounded-full text-sm font-medium"
              style={{ background: "rgba(91,140,255,.15)", color: "var(--blue)" }}
            >
              {extractions.length} extractions
            </span>
          </div>

          {extractions.length > 0 ? (
            <div className="space-y-3">
              {extractions.map((extraction) => (
                <div
                  key={extraction.id}
                  className="rounded-[var(--radius)] p-4 flex items-center justify-between transition-colors"
                  style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
                >
                  <div className="flex items-center space-x-3">
                    <FileText className="w-5 h-5" style={{ color: "var(--faint)" }} />
                    <div>
                      <div className="font-medium" style={{ color: "var(--text)" }}>
                        {extraction.source}
                      </div>
                      <div className="text-sm" style={{ color: "var(--muted)" }}>
                        {extraction.current_phrase_count} phrases
                        {extraction.current_phrase_count !== extraction.total_phrases_found && (
                          <span style={{ color: "var(--faint)" }}>
                            {" "}(originally {extraction.total_phrases_found})
                          </span>
                        )}
                        {" "}• {formatDate(extraction.created_at)}
                        {extraction.was_truncated && (
                          <span
                            className="ml-2 px-2 py-1 rounded text-xs"
                            style={{ background: "rgba(245,176,65,.15)", color: "var(--amber)" }}
                          >
                            Truncated
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {extraction.current_phrase_count > 0 ? (
                      <button
                        onClick={() =>
                          handleEditExtraction(
                            extraction.id,
                            show!.name,
                            extraction.source
                          )
                        }
                        className="flex items-center space-x-1 px-3 py-1 rounded-md transition-opacity hover:opacity-90 text-sm"
                        style={{ background: "var(--accent)", color: "#fff" }}
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Edit Phrases</span>
                      </button>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <div
                          className="text-xs px-2 py-1 rounded flex items-center space-x-1"
                          style={{ background: "rgba(229,9,20,.12)", color: "var(--accent2)" }}
                        >
                          <AlertTriangle className="w-3 h-3" />
                          <span>No phrases remaining</span>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => deleteExtraction(extraction.id)}
                      disabled={deleting === extraction.id}
                      className="p-1 transition-colors disabled:opacity-50 hover:opacity-80"
                      style={{ color: "var(--faint)" }}
                      title="Delete this extraction"
                    >
                      {deleting === extraction.id ? (
                        <div
                          className="animate-spin rounded-full h-4 w-4 border-2"
                          style={{ borderColor: "var(--accent2)", borderTopColor: "transparent" }}
                        ></div>
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto mb-4" style={{ color: "var(--faint)" }} />
              <h3 className="text-xl font-semibold mb-2" style={{ color: "var(--text)" }}>
                No Extractions Found
              </h3>
              <p style={{ color: "var(--muted)" }}>
                This show doesn&apos;t have any phrase extractions yet.
              </p>
            </div>
          )}
        </div>

        {/* Metadata Editor Modal */}
        {show && (
          <MetadataEditor
            extractionId="" // Not needed for show-level editing
            currentShow={show}
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