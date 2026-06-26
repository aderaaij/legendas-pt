/**
 * Run a `manual_upload` job: resolve the target show/episode, extract phrases
 * from the embedded subtitle content, and persist them. No scraper — the content
 * was uploaded by the admin and embedded in the job's plan.
 *
 * Show/episode are resolved here with the service-role client (self-contained
 * find-or-create, mirroring how process-episode creates episode rows) rather
 * than reusing the app's findOrCreateShow/Episode, which are bound to the
 * browser's anon client + TVDB enrichment.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { updateExtractionJob } from "@/lib/db/extraction-jobs";
import { extractFromSubtitle } from "@/lib/extractor";
import { persistExtraction } from "@/lib/db/extractions";
import { MissingApiKeyError, UnknownProviderError } from "@/lib/llm/providers";
import { normalizeShowName } from "@/utils/slugify";
import type { ExtractionJob } from "@/types/database";
import type { ManualUploadResults } from "@/lib/manual-upload/types";
import type { ProcessJobHooks } from "./process-rtp-series";
import { sleep, backoffDelay } from "./util";

type Results = ExtractionJob["results"];

/** Find a show by exact then normalized name, else create a minimal row. */
async function resolveShowId(
  supabase: SupabaseClient,
  name: string,
  source: string
): Promise<string> {
  const { data: exact } = await supabase
    .from("shows")
    .select("id")
    .eq("name", name)
    .eq("source", source)
    .maybeSingle();
  if (exact) return exact.id;

  const target = normalizeShowName(name);
  const { data: all } = await supabase
    .from("shows")
    .select("id, name")
    .eq("source", source);
  const match = (all ?? []).find(
    (s) => normalizeShowName(s.name) === target
  );
  if (match) return match.id;

  const { data: created, error } = await supabase
    .from("shows")
    .insert({ name, source, language: "pt" })
    .select("id")
    .single();
  if (error) throw new Error(`Failed to create show: ${error.message}`);
  return created.id;
}

/** Find an episode by (show, season, number), else create a minimal row. */
async function resolveEpisodeId(
  supabase: SupabaseClient,
  showId: string,
  season: number,
  episodeNumber: number,
  title?: string
): Promise<string> {
  const { data: existing } = await supabase
    .from("episodes")
    .select("id")
    .eq("show_id", showId)
    .eq("season", season)
    .eq("episode_number", episodeNumber)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("episodes")
    .insert({
      show_id: showId,
      season,
      episode_number: episodeNumber,
      title: title ?? `Episode ${episodeNumber}`,
      air_date: new Date().toISOString().split("T")[0],
    })
    .select("id")
    .single();
  if (error) throw new Error(`Failed to create episode: ${error.message}`);
  return created.id;
}

export async function processManualUploadJob(
  supabase: SupabaseClient,
  job: ExtractionJob,
  hooks: ProcessJobHooks
): Promise<void> {
  const { log, isCancelled, shouldStop } = hooks;
  const results = job.results as unknown as ManualUploadResults | undefined;

  if (!results?.plan) {
    await updateExtractionJob(
      job.id,
      {
        status: "failed",
        error_message: "Job has no upload plan",
        completed_at: new Date().toISOString(),
      },
      supabase
    );
    log(`job ${job.id}: no upload plan — marked failed`);
    return;
  }

  if (shouldStop()) {
    log(`job ${job.id}: shutting down — left resumable`);
    return;
  }
  if (await isCancelled()) {
    log(`job ${job.id}: cancelled`);
    return;
  }

  const { plan } = results;

  const writeStage = async (label: string, status: ManualUploadResults["status"]) => {
    await updateExtractionJob(
      job.id,
      {
        current_episode: label,
        results: { ...results, status } as unknown as Results,
      },
      supabase
    );
  };

  // Finalize as failed without losing the reason.
  const fail = async (status: ManualUploadResults["status"], error: string) => {
    await updateExtractionJob(
      job.id,
      {
        status: "failed",
        progress: 100,
        failed_episodes: 1,
        error_message: error,
        results: { ...results, status, error } as unknown as Results,
        completed_at: new Date().toISOString(),
      },
      supabase
    );
    log(`job ${job.id}: ${status} — ${error}`);
  };

  try {
    await writeStage("Resolving show/episode", "extracting");
    const showId =
      plan.showId ?? (await resolveShowId(supabase, plan.showName, plan.source));
    const episodeId =
      plan.season && plan.episodeNumber
        ? await resolveEpisodeId(
            supabase,
            showId,
            plan.season,
            plan.episodeNumber,
            plan.episodeTitle
          )
        : null;

    await writeStage("Extracting phrases", "extracting");
    let extraction: Awaited<ReturnType<typeof extractFromSubtitle>>;
    for (let attempt = 0; ; attempt++) {
      try {
        extraction = await extractFromSubtitle({
          content: plan.content,
          filename: plan.filename,
          fileType: plan.fileType,
          provider: plan.provider,
          model: plan.model,
        });
        break;
      } catch (extractError) {
        // Missing key / unknown provider are permanent — don't retry.
        if (
          extractError instanceof MissingApiKeyError ||
          extractError instanceof UnknownProviderError
        ) {
          return await fail("extraction_failed", extractError.message);
        }
        const message =
          extractError instanceof Error
            ? extractError.message
            : "Failed to extract phrases";
        if (
          attempt >= hooks.maxRetries ||
          shouldStop() ||
          (await isCancelled())
        ) {
          return await fail("extraction_failed", message);
        }
        const delay = backoffDelay(attempt, hooks.retryBaseMs);
        log(
          `job ${job.id}: extract failed — retry ${attempt + 1}/${
            hooks.maxRetries
          } in ${delay}ms (${message})`
        );
        await sleep(delay);
      }
    }

    await writeStage("Saving", "saving");
    const result = await persistExtraction(supabase, {
      phrases: extraction.phrases,
      content: plan.content,
      language: plan.language,
      truncated: extraction.truncated,
      forceReExtraction: plan.forceReExtraction,
      showId,
      episodeId,
      provider: extraction.resolved.provider,
      model: extraction.resolved.model,
      filename: plan.filename,
      showTitle: plan.showName,
      episodeTitle: plan.episodeTitle,
      seasonNumber: plan.season,
      episodeNumber: plan.episodeNumber,
    });

    const status = result.alreadyExists ? "already_exists" : "success";
    await updateExtractionJob(
      job.id,
      {
        status: "completed",
        progress: 100,
        completed_episodes: 1,
        failed_episodes: 0,
        current_episode: null as unknown as undefined,
        results: {
          ...results,
          status,
          phraseCount: extraction.phrases.length,
          extractionId: result.extractionId,
        } as unknown as Results,
        completed_at: new Date().toISOString(),
      },
      supabase
    );
    log(
      `job ${job.id}: ${status} (${extraction.phrases.length} phrases, extraction ${result.extractionId})`
    );
  } catch (err) {
    await fail("error", err instanceof Error ? err.message : "Unknown error");
  }
}
