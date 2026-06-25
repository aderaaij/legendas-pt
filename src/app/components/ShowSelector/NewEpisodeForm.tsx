"use client";

import { useState } from "react";
import { Plus, Loader2, Edit3 } from "lucide-react";

import { Show, Episode, PhraseExtractionService } from "@/lib/supabase";
import { fieldInputStyle } from "@/app/components/ui/FormField";

interface NewEpisodeFormProps {
  selectedShow: Show;
  onCreated: (episode: Episode) => void;
  onCancel: () => void;
}

const fieldClassName = "w-full px-3 py-2 text-sm rounded focus:outline-none";

/** Inline form to manually create a new episode for the selected show. */
export default function NewEpisodeForm({
  selectedShow,
  onCreated,
  onCancel,
}: NewEpisodeFormProps) {
  const [isCreatingEpisode, setIsCreatingEpisode] = useState(false);
  const [newEpisodeData, setNewEpisodeData] = useState({
    season: "",
    episodeNumber: "",
    title: "",
  });

  const handleCreateNewEpisode = async () => {
    if (!newEpisodeData.season || !newEpisodeData.episodeNumber) {
      return;
    }

    setIsCreatingEpisode(true);
    try {
      const season = parseInt(newEpisodeData.season);
      const episodeNumber = parseInt(newEpisodeData.episodeNumber);

      // Use provided title or fallback to default format
      const episodeTitle =
        newEpisodeData.title ||
        `S${season.toString().padStart(2, "0")}E${episodeNumber
          .toString()
          .padStart(2, "0")}`;

      // Create the episode (this will automatically fetch TVDB data if available)
      const newEpisode = await PhraseExtractionService.findOrCreateEpisode(
        selectedShow.id,
        season,
        episodeNumber,
        episodeTitle
      );

      onCreated(newEpisode);
      setNewEpisodeData({ season: "", episodeNumber: "", title: "" });
    } catch (err) {
      console.error("Failed to create episode:", err);
    } finally {
      setIsCreatingEpisode(false);
    }
  };

  return (
    <div
      className="rounded-lg p-4 space-y-3"
      style={{
        background: "rgba(91,140,255,.08)",
        border: "1px solid rgba(91,140,255,.25)",
      }}
    >
      <div className="flex items-center gap-2">
        <Edit3 className="w-4 h-4" style={{ color: "var(--blue)" }} />
        <h4 className="text-sm font-medium" style={{ color: "var(--blue)" }}>
          Add New Episode
        </h4>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label
            className="block text-xs font-medium mb-1"
            style={{ color: "var(--muted)" }}
          >
            Season
          </label>
          <input
            type="number"
            min="1"
            value={newEpisodeData.season}
            onChange={(e) =>
              setNewEpisodeData((prev) => ({ ...prev, season: e.target.value }))
            }
            className={fieldClassName}
            style={fieldInputStyle}
            placeholder="1"
          />
        </div>
        <div>
          <label
            className="block text-xs font-medium mb-1"
            style={{ color: "var(--muted)" }}
          >
            Episode
          </label>
          <input
            type="number"
            min="1"
            value={newEpisodeData.episodeNumber}
            onChange={(e) =>
              setNewEpisodeData((prev) => ({
                ...prev,
                episodeNumber: e.target.value,
              }))
            }
            className={fieldClassName}
            style={fieldInputStyle}
            placeholder="1"
          />
        </div>
      </div>
      <div>
        <label
          className="block text-xs font-medium mb-1"
          style={{ color: "var(--muted)" }}
        >
          Title (optional)
        </label>
        <input
          type="text"
          value={newEpisodeData.title}
          onChange={(e) =>
            setNewEpisodeData((prev) => ({ ...prev, title: e.target.value }))
          }
          className={fieldClassName}
          style={fieldInputStyle}
          placeholder="Episode title"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleCreateNewEpisode}
          disabled={
            isCreatingEpisode ||
            !newEpisodeData.season ||
            !newEpisodeData.episodeNumber
          }
          className="flex items-center gap-2 px-3 py-2 text-sm rounded transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: "var(--blue)", color: "#04122e" }}
        >
          {isCreatingEpisode ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Create Episode
            </>
          )}
        </button>
        <button
          onClick={onCancel}
          disabled={isCreatingEpisode}
          className="px-3 py-2 text-sm rounded transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{
            background: "var(--surface2)",
            border: "1px solid var(--border2)",
            color: "var(--text)",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
