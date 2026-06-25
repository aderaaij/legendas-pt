import Image from "next/image";
import { posterGradient } from "@/utils/posterGradient";

interface PosterArtProps {
  name: string;
  posterUrl?: string | null;
  /** Extra classes for the image element (e.g. object-position tweaks). */
  className?: string;
  sizes?: string;
  priority?: boolean;
}

/**
 * Fills its (positioned) parent with a show's poster image, or a deterministic
 * cinematic gradient when no poster_url exists. The parent must be
 * `position: relative` with `overflow: hidden`.
 */
export function PosterArt({
  name,
  posterUrl,
  className = "",
  sizes = "(max-width: 768px) 50vw, 240px",
  priority = false,
}: PosterArtProps) {
  if (posterUrl) {
    return (
      <Image
        src={posterUrl}
        alt={name}
        fill
        sizes={sizes}
        priority={priority}
        className={`object-cover ${className}`}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={name}
      className="absolute inset-0"
      style={{ background: posterGradient(name) }}
    />
  );
}
