// Episode Essentials: a small per-episode deck drawn from a per-language
// lexicon. See database/essentials.sql.
import type { FsrsProgress } from "@/lib/fsrs";
import type { StudyDirection } from "./spaced-repetition";

/** One essential as shown for an episode: the lexicon item plus this episode's
 *  ranked link to it (meaning in context, and the line as heard). */
export interface EpisodeEssential {
  /** `essentials.id` — the lexicon item, and the key progress is stored under. */
  id: string;
  /** Dictionary form, e.g. "estar farto de". */
  expression: string;
  /** Meaning in this episode (falls back to the lexicon's canonical one). */
  translation: string;
  note: string | null;
  /** The subtitle line where it's heard. */
  example: string | null;
  exampleTranslation: string | null;
  rank: number;
}

/** A `user_essential_studies` row. */
export interface EssentialStudy extends FsrsProgress {
  id: string;
  user_id: string;
  essential_id: string;
  study_direction: StudyDirection;
  created_at: string;
  updated_at: string;
}
