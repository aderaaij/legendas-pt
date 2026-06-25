"use client";

import { Copy } from "lucide-react";

import { ExtractedPhrase } from "@/lib/supabase";

interface SelectedPhrase {
  phrase: string;
  translation: string;
}

interface PhraseVariantRowProps {
  phrase: ExtractedPhrase;
  groupKey: string;
  selected: SelectedPhrase | undefined;
  onSelect: (groupKey: string, phrase: string, translation: string) => void;
}

/** A single phrase/translation variant within a duplicate group, with its
 * "Keep This" and "Keep Translation" selection controls. */
export default function PhraseVariantRow({
  phrase,
  groupKey,
  selected,
  onSelect,
}: PhraseVariantRowProps) {
  const isSelectedPhrase = selected?.phrase === phrase.phrase;
  const isSelectedTranslation = selected?.translation === phrase.translation;

  return (
    <div
      className="rounded-lg p-3 transition-all"
      style={{
        background:
          isSelectedPhrase && isSelectedTranslation
            ? "rgba(61,220,132,.1)"
            : "var(--bg2)",
        border: `1px solid ${
          isSelectedPhrase && isSelectedTranslation
            ? "var(--green)"
            : "var(--border)"
        }`,
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="font-medium mb-1" style={{ color: "var(--text)" }}>
            {phrase.phrase}
          </div>
          <div className="text-sm" style={{ color: "var(--muted)" }}>
            {phrase.translation}
          </div>
        </div>
        <div className="flex flex-col space-y-1 ml-4">
          <button
            onClick={() =>
              onSelect(groupKey, phrase.phrase, phrase.translation)
            }
            className="flex items-center space-x-1 px-2 py-1 rounded text-xs transition-colors"
            style={
              isSelectedPhrase && isSelectedTranslation
                ? { background: "var(--green)", color: "#04210f" }
                : {
                    background: "var(--surface2)",
                    border: "1px solid var(--border2)",
                    color: "var(--text)",
                  }
            }
          >
            <Copy className="w-3 h-3" />
            <span>Keep This</span>
          </button>

          {(!selected || !isSelectedPhrase) && (
            <button
              onClick={() =>
                onSelect(
                  groupKey,
                  selected?.phrase || phrase.phrase,
                  phrase.translation
                )
              }
              className="flex items-center space-x-1 px-2 py-1 rounded text-xs transition-colors"
              style={
                isSelectedTranslation
                  ? { background: "var(--blue)", color: "#04122e" }
                  : {
                      background: "var(--surface2)",
                      border: "1px solid var(--border2)",
                      color: "var(--muted)",
                    }
              }
            >
              <span>Keep Translation</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
