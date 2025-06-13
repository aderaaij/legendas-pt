"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Database } from "lucide-react";

import ShowsList from "@/app/components/ShowsList";
import PhraseEditor from "@/app/components/PhraseEditor";

type ViewMode = "list" | "edit";

interface EditingSession {
  extractionId: string;
  showName: string;
  episodeTitle?: string;
}

export default function ManagePage() {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [editingSession, setEditingSession] = useState<EditingSession | null>(
    null
  );

  const handleEditExtraction = (
    extractionId: string,
    showName: string,
    episodeTitle?: string
  ) => {
    setEditingSession({ extractionId, showName, episodeTitle });
    setViewMode("edit");
  };

  const handleBackToList = () => {
    setEditingSession(null);
    setViewMode("list");
  };

  if (viewMode === "edit" && editingSession) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <PhraseEditor
            extractionId={editingSession.extractionId}
            showName={editingSession.showName}
            episodeTitle={editingSession.episodeTitle}
            onBack={handleBackToList}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-tr from-red-200 to-green-500">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-12">
          <div className="flex flex-col space-x-3 mb-6 gap-2">
            <Link
              href="/"
              className="flex items-center space-x-1 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Library</span>
            </Link>

            <div>
              <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                <Database className="text-blue-600" />
                Manage Extractions
              </h1>
            </div>
          </div>
          <p className="text-lg text-gray-600 max-w-2xl">
            Edit phrases, delete extractions, and manage your subtitle database
          </p>
        </header>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <ShowsList onEditExtraction={handleEditExtraction} />
        </div>
      </div>
    </div>
  );
}
