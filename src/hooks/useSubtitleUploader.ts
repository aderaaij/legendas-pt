import { SubtitleMetadata } from "@/app/upload/page";
import { parseSRT, parseVTT } from "@/utils/subtitleUtils";
import { useState } from "react";
import { Show, Episode } from "@/lib/supabase";

interface SubtitleUploaderProps {
  onSubtitleLoad: (
    content: string,
    fileName: string,
    metadata: SubtitleMetadata
  ) => void;
}

export const useSubtitleUploader = ({
  onSubtitleLoad,
}: SubtitleUploaderProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [metadata, setMetadata] = useState<SubtitleMetadata>({
    source: "RTP",
    showName: "",
    season: undefined,
    episodeNumber: undefined,
  });
  const [showMetadataForm, setShowMetadataForm] = useState(false);
  const [selectedShow, setSelectedShow] = useState<Show | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [subtitleContent, setSubtitleContent] = useState<string>("");

  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    setError("");

    try {
      const text = await file.text();
      let parsedText = "";

      if (file.name.toLowerCase().endsWith(".vtt")) {
        parsedText = parseVTT(text);
      } else if (file.name.toLowerCase().endsWith(".srt")) {
        parsedText = parseSRT(text);
      } else {
        // Assume it's plain text
        parsedText = text;
      }

      if (parsedText.length < 50) {
        throw new Error("The subtitle file appears to be too short or empty");
      }

      setFileName(file.name);
      setSubtitleContent(parsedText);
      setShowMetadataForm(true); // Show show selection form
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to parse subtitle file"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowSelected = (show: Show, episode?: Episode) => {
    setSelectedShow(show);
    setSelectedEpisode(episode || null);

    // Build metadata from selected show and episode
    const metadata: SubtitleMetadata = {
      source: show.source,
      showName: show.name,
      season: episode?.season,
      episodeNumber: episode?.episode_number,
    };

    setMetadata(metadata);
    onSubtitleLoad(subtitleContent, fileName, metadata);
    setShowMetadataForm(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const subtitleFile = files.find(
      (file) =>
        file.name.toLowerCase().endsWith(".vtt") ||
        file.name.toLowerCase().endsWith(".srt") ||
        file.type === "text/plain"
    );

    if (subtitleFile) {
      handleFileUpload(subtitleFile);
    } else {
      setError("Please upload a .vtt or .srt subtitle file");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  return {
    isLoading,
    handleFileUpload,
    fileName,
    error,
    setError,
    showMetadataForm,
    handleFileSelect,
    handleShowSelected,
    isDragging,
    setIsDragging,
    setMetadata,
    metadata,
    setShowMetadataForm,
    handleDrop,
    selectedShow,
    selectedEpisode,
  };
};
