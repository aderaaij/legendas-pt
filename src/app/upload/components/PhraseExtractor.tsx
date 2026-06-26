"use client";

import { useState } from "react";
import { Play, Settings } from "lucide-react";
import { usePhraseExtraction } from "./usePhraseExtraction";
import { SubtitleMetadata } from "../page";
import { parseShowInfo } from "@/utils/extractPhrasesUtils";
import {
  DEFAULT_MODELS,
  PROVIDER_LABELS,
  PROVIDERS,
  type Provider,
} from "@/lib/llm/types";

interface PhraseExtractorProps {
  subtitleContent: string;
  onExtractionSuccess: (
    showName: string,
    season?: number,
    episodeNumber?: number
  ) => void;
  fileName?: string;
  metadata: SubtitleMetadata | null;
}

export interface ExtractionSettings {
  forceReExtraction: boolean;
  /** Override the server's default LLM provider for this extraction. */
  provider?: Provider;
  /** Override the provider's default model for this extraction. */
  model?: string;
}

export default function PhraseExtractor({
  subtitleContent,
  onExtractionSuccess,
  fileName,
  metadata,
}: PhraseExtractorProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [forceReExtraction, setForceReExtraction] = useState(false);
  // "" = use the server's default provider (LLM_PROVIDER env / built-in default).
  const [provider, setProvider] = useState<Provider | "">("");
  const [model, setModel] = useState("");

  const settings: ExtractionSettings = {
    forceReExtraction,
    provider: provider || undefined,
    model: model.trim() || undefined,
  };

  const { isExtracting, statusLabel, handleExtraction } = usePhraseExtraction({
    settings,
    fileName,
    metadata,
  });

  const handleExtract = async () => {
    if (!subtitleContent) return;

    try {
      await handleExtraction(subtitleContent, () => {
        const { showName, season, episodeNumber } =
          metadata || parseShowInfo(fileName);

        onExtractionSuccess(showName, season, episodeNumber);
      });
    } catch (error) {
      console.error("Error extracting phrases:", error);
      alert(
        `Error extracting phrases: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm" style={{ color: "var(--muted)" }}>
          Ready to extract phrases from your subtitle content
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center space-x-1 transition-colors hover:opacity-80"
            style={{ color: "var(--muted)" }}
          >
            <Settings className="w-4 h-4" />
            <span className="text-sm">Settings</span>
          </button>

          <button
            onClick={handleExtract}
            disabled={isExtracting || !subtitleContent}
            className="px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            style={{ background: "var(--accent)", color: "#fff" }}
          >
            <Play className="w-4 h-4" />
            <span>{isExtracting ? "Extracting..." : "Extract Phrases"}</span>
          </button>
        </div>
      </div>

      {showSettings && (
        <div
          className="p-4 rounded-lg space-y-3"
          style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
        >
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={forceReExtraction}
              onChange={(e) => setForceReExtraction(e.target.checked)}
              className="rounded"
              style={{ accentColor: "var(--accent)" }}
            />
            <span className="text-sm" style={{ color: "var(--text)" }}>
              Force re-extraction (add to existing phrases)
            </span>
          </label>

          <div className="space-y-2 pt-1">
            <label className="block text-sm" style={{ color: "var(--text)" }}>
              LLM provider
            </label>
            <select
              value={provider}
              onChange={(e) => {
                setProvider(e.target.value as Provider | "");
                setModel(""); // reset model when switching provider
              }}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            >
              <option value="">Default (server setting)</option>
              {PROVIDERS.map((p) => (
                <option key={p} value={p}>
                  {PROVIDER_LABELS[p]}
                </option>
              ))}
            </select>

            {provider && (
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder={`Model (default: ${DEFAULT_MODELS[provider]})`}
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                }}
              />
            )}
          </div>
        </div>
      )}

      {isExtracting && (
        <div className="mt-4 flex items-center space-x-2" style={{ color: "var(--accent2)" }}>
          <div
            className="animate-spin rounded-full h-4 w-4 border-b-2"
            style={{ borderColor: "var(--accent)", borderBottomColor: "var(--accent)" }}
          ></div>
          <span className="text-sm">
            {statusLabel ?? "Extracting phrases on the worker…"}
          </span>
        </div>
      )}
    </div>
  );
}
