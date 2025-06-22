"use client";

import { useState, useEffect } from "react";
import { PhraseExtractionService, Show } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

interface DuplicateGroup {
  normalizedName: string;
  shows: Show[];
}

export default function ShowMerger() {
  const { user } = useAuth();
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    loadDuplicateShows();
  }, []);

  const loadDuplicateShows = async () => {
    try {
      const duplicates = await PhraseExtractionService.findDuplicateShows();

      console.log("Found duplicate shows:", duplicates);
      setDuplicateGroups(duplicates);
    } catch (error) {
      console.error("Failed to load duplicate shows:", error);
      setMessage({ type: "error", text: "Failed to load duplicate shows" });
    } finally {
      setLoading(false);
    }
  };

  const handleMerge = async (
    primaryShowId: string,
    duplicateShowId: string,
    groupIndex: number
  ) => {
    if (!user) return;

    setMerging(`${primaryShowId}-${duplicateShowId}`);
    setMessage(null);

    try {
      const result = await PhraseExtractionService.mergeShows(
        primaryShowId,
        duplicateShowId
      );

      if (result.success) {
        setMessage({ type: "success", text: result.message });
        // Remove the merged group from the list
        setDuplicateGroups((prev) =>
          prev.filter((_, index) => index !== groupIndex)
        );
      } else {
        setMessage({ type: "error", text: result.message });
      }
    } catch (_error) {
      setMessage({ type: "error", text: "Merge operation failed" });
    } finally {
      setMerging(null);
    }
  };

  if (loading) {
    return <div className="p-4">Loading duplicate shows...</div>;
  }

  if (duplicateGroups.length === 0) {
    return (
      <div className="p-4">
        <h2 className="text-xl font-bold mb-4">Show Merger</h2>
        <p className="text-green-600">No duplicate shows found!</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Show Merger</h2>

      {message && (
        <div
          className={`mb-4 p-3 rounded ${
            message.type === "success"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        {duplicateGroups.map((group, groupIndex) => (
          <div key={group.normalizedName} className="border rounded-lg p-4">
            <h3 className="font-semibold mb-3">
              Potential duplicates for:{" "}
              <span className="text-blue-600">{group.normalizedName}</span>
            </h3>

            <div className="space-y-3">
              {group.shows.map((show, showIndex) => (
                <div
                  key={show.id}
                  className="flex items-center justify-between bg-gray-50 p-3 rounded"
                >
                  <div>
                    <div className="font-medium">{show.name}</div>
                    <div className="text-sm text-gray-600">
                      Source: {show.source} | Created:{" "}
                      {new Date(show.created_at).toLocaleDateString()}
                      {show.tvdb_confidence &&
                        ` | TVDB confidence: ${(
                          show.tvdb_confidence * 100
                        ).toFixed(0)}%`}
                    </div>
                  </div>

                  {showIndex > 0 && (
                    <button
                      onClick={() =>
                        handleMerge(group.shows[0].id, show.id, groupIndex)
                      }
                      disabled={merging === `${group.shows[0].id}-${show.id}`}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                    >
                      {merging === `${group.shows[0].id}-${show.id}`
                        ? "Merging..."
                        : `Merge into "${group.shows[0].name}"`}
                    </button>
                  )}

                  {showIndex === 0 && (
                    <span className="text-sm text-green-600 font-medium">
                      Primary (keep this one)
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-3 text-sm text-gray-600">
              The first show will be kept as the primary, and all episodes and
              extractions from other shows will be moved to it.
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
