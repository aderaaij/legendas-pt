"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  ArrowLeft,
  Upload,
  BookOpen,
  Languages,
  Globe,
  Merge,
} from "lucide-react";

import { AdminRoute } from "@/app/components/ProtectedRoute";
import { generateShowSlug } from "@/utils/slugify";

import SubtitleUploader from "./components/SubtitleUploader";
import PhraseExtractor from "./components/PhraseExtractor";
import RTPImporter from "./components/RTPImporter";
import ShowMerger from "./components/ShowMerger";

export interface SubtitleMetadata {
  source: string;
  showName: string;
  season?: number;
  episodeNumber?: number;
}

export default function UploadPage() {
  const [activeTab, setActiveTab] = useState<"upload" | "rtp" | "merge">(
    "upload"
  );
  const [subtitleContent, setSubtitleContent] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [metadata, setMetadata] = useState<SubtitleMetadata | null>(null);
  const [isRedirecting, setIsRedirecting] = useState<boolean>(false);

  const router = useRouter();

  const handleSubtitleLoad = (
    content: string,
    filename: string,
    subtitleMetadata?: SubtitleMetadata
  ) => {
    setSubtitleContent(content);
    setFileName(filename);
    setMetadata(subtitleMetadata || null);
  };

  const handleCancel = () => {
    // Clear all upload page state
    setSubtitleContent("");
    setFileName("");
    setMetadata(null);
    setIsRedirecting(false);
  };

  const handleExtractionSuccess = async (
    showName: string,
    season?: number,
    episodeNumber?: number
  ) => {
    setIsRedirecting(true);

    // Generate the appropriate redirect URL
    if (season && episodeNumber) {
      // Redirect to episode edit page
      const seriesSlug = generateShowSlug(showName);
      const episodeSlug = `s${String(season).padStart(2, "0")}e${String(
        episodeNumber
      ).padStart(2, "0")}`;
      router.push(`/${seriesSlug}/${episodeSlug}/edit`);
    } else {
      // Redirect to series page if no episode info
      const seriesSlug = generateShowSlug(showName);
      router.push(`/${seriesSlug}`);
    }
  };

  const tabs = [
    { id: "upload" as const, icon: Upload, label: "Manual Upload" },
    { id: "rtp" as const, icon: Globe, label: "RTP Series Import" },
    { id: "merge" as const, icon: Merge, label: "Merge Shows" },
  ];

  return (
    <AdminRoute redirectTo="/">
      <div className="min-h-screen" style={{ background: "var(--bg)", color: "var(--text)" }}>
        <div className="container mx-auto px-5 py-10 md:px-10">
          <header className="mb-10">
            <div className="mb-6 flex flex-col gap-4">
              <Link
                href="/"
                className="flex items-center gap-1 transition-colors hover:opacity-80"
                style={{ color: "var(--muted)" }}
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Library</span>
              </Link>
              <h1 className="font-display flex items-center gap-3 text-[40px] uppercase leading-none">
                <Languages style={{ color: "var(--accent)" }} />
                Upload New Subtitles
              </h1>
            </div>
            <p className="max-w-2xl text-lg" style={{ color: "var(--muted)" }}>
              Upload Portuguese subtitle files to extract meaningful phrases for
              language learning
            </p>
          </header>

          <div className="mx-auto max-w-6xl">
            <div
              className="overflow-hidden rounded-[var(--radius-lg)]"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              {/* Tab Navigation */}
              <div style={{ borderBottom: "1px solid var(--border)" }}>
                <nav className="flex gap-2 px-4" aria-label="Tabs">
                  {tabs.map(({ id, icon: Icon, label }) => {
                    const active = activeTab === id;
                    return (
                      <button
                        key={id}
                        onClick={() => setActiveTab(id)}
                        className="flex items-center gap-2 px-4 py-4 text-sm font-semibold transition-colors"
                        style={{
                          borderBottom: `2px solid ${active ? "var(--accent)" : "transparent"}`,
                          color: active ? "var(--text)" : "var(--muted)",
                        }}
                      >
                        <Icon className="h-4 w-4" />
                        {label}
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className="p-6 md:p-8">
                {activeTab === "upload" && (
                  <div className="space-y-8">
                    {/* Upload Section */}
                    <div>
                      <div className="mb-6 flex items-center gap-3">
                        <div className="rounded-full p-2" style={{ background: "rgba(91,140,255,.15)" }}>
                          <Upload className="h-5 w-5" style={{ color: "var(--blue)" }} />
                        </div>
                        <h2 className="text-xl font-extrabold">Upload Subtitles</h2>
                      </div>
                      <SubtitleUploader
                        onSubtitleLoad={handleSubtitleLoad}
                        onCancel={handleCancel}
                      />
                    </div>

                    {/* Extraction Section - only show when subtitle is loaded */}
                    {subtitleContent && (
                      <div className="pt-8" style={{ borderTop: "1px solid var(--border)" }}>
                        <div className="mb-6 flex items-center gap-3">
                          <div className="rounded-full p-2" style={{ background: "rgba(61,220,132,.15)" }}>
                            <BookOpen className="h-5 w-5" style={{ color: "var(--green)" }} />
                          </div>
                          <h2 className="text-xl font-extrabold">Extract Phrases</h2>
                        </div>
                        <PhraseExtractor
                          subtitleContent={subtitleContent}
                          onExtractionSuccess={handleExtractionSuccess}
                          fileName={fileName}
                          metadata={metadata}
                        />
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "rtp" && (
                  <div>
                    <div className="mb-6 flex items-center gap-3">
                      <div className="rounded-full p-2" style={{ background: "rgba(61,220,132,.15)" }}>
                        <Globe className="h-5 w-5" style={{ color: "var(--green)" }} />
                      </div>
                      <h2 className="text-xl font-extrabold">Import from RTP Series</h2>
                    </div>
                    <RTPImporter />
                  </div>
                )}

                {activeTab === "merge" && (
                  <div>
                    <div className="mb-6 flex items-center gap-3">
                      <div className="rounded-full p-2" style={{ background: "rgba(229,9,20,.15)" }}>
                        <Merge className="h-5 w-5" style={{ color: "var(--accent2)" }} />
                      </div>
                      <h2 className="text-xl font-extrabold">Merge Duplicate Shows</h2>
                    </div>
                    <ShowMerger />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Redirect Loading State */}
          {isRedirecting && (
            <div
              className="mt-12 rounded-[var(--radius-lg)] p-8"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <div className="flex flex-col items-center justify-center space-y-4">
                <div
                  className="h-12 w-12 animate-spin rounded-full border-2 border-t-transparent"
                  style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
                />
                <div className="text-center">
                  <h3 className="mb-2 text-lg font-bold">Extraction Complete!</h3>
                  <p style={{ color: "var(--muted)" }}>
                    Redirecting to the editing interface...
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminRoute>
  );
}
