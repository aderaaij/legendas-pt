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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading show...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-600 mb-4">{error}</p>
            <Link
              href="/"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
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
      <div className="min-h-screen bg-gray-50">
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
      <div className="min-h-screen bg-gradient-to-tr from-red-200 to-green-500">
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
              <h1 className="text-3xl font-bold text-gray-900">
                Edit {show?.name}
              </h1>
              <p className="text-gray-600">
                Manage show metadata, episodes, and phrase extractions
              </p>
            </div>
          </div>
        </div>

        {/* Show Management */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-800">Show Settings</h2>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowMetadataEditor(true)}
                className="inline-flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit Metadata</span>
              </button>
              <button
                onClick={deleteShow}
                disabled={deleting === show!.id}
                className="inline-flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleting === show!.id ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>Delete Show</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-lg font-bold text-blue-600">
                {episodes.length}
              </div>
              <div className="text-sm text-gray-600">Episodes</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-lg font-bold text-green-600">
                {extractions.length}
              </div>
              <div className="text-sm text-gray-600">Extractions</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-lg font-bold text-purple-600">
                {extractions.reduce((acc, ext) => acc + (ext.current_phrase_count || 0), 0)}
              </div>
              <div className="text-sm text-gray-600">Current Phrases</div>
            </div>
          </div>
        </div>

        {/* Extractions Management */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-800">Phrase Extractions</h2>
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
              {extractions.length} extractions
            </span>
          </div>

          {extractions.length > 0 ? (
            <div className="space-y-3">
              {extractions.map((extraction) => (
                <div
                  key={extraction.id}
                  className="bg-gray-50 rounded-lg p-4 flex items-center justify-between hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-center space-x-3">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <div>
                      <div className="font-medium text-gray-900">
                        {extraction.source}
                      </div>
                      <div className="text-sm text-gray-500">
                        {extraction.current_phrase_count} phrases
                        {extraction.current_phrase_count !== extraction.total_phrases_found && (
                          <span className="text-gray-400">
                            {" "}(originally {extraction.total_phrases_found})
                          </span>
                        )}
                        {" "}• {formatDate(extraction.created_at)}
                        {extraction.was_truncated && (
                          <span className="ml-2 bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">
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
                        className="flex items-center space-x-1 bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors text-sm"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Edit Phrases</span>
                      </button>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded flex items-center space-x-1">
                          <AlertTriangle className="w-3 h-3" />
                          <span>No phrases remaining</span>
                        </div>
                      </div>
                    )}

                    <button
                      onClick={() => deleteExtraction(extraction.id)}
                      disabled={deleting === extraction.id}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
                      title="Delete this extraction"
                    >
                      {deleting === extraction.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
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
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No Extractions Found
              </h3>
              <p className="text-gray-600">
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