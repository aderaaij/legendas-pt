#!/usr/bin/env node
/**
 * Backfill `phrase_extractions.content_full` for already-extracted RTP episodes
 * by re-scraping the source subtitles.
 *
 * The app didn't originally keep the full subtitle (only a 200-500 char preview
 * + a content hash). This re-fetches each RTP episode's subtitle and fills
 * content_full on the matching extraction. It never calls OpenAI, never creates
 * rows, and never touches phrases.
 *
 * Matching, strongest first:
 *   1. HASH      — the scraped file hashes identically to a stored content_hash
 *                  (raw hash for the RTP/API path, cleaned hash for the upload
 *                  path). Exact, byte-for-byte.
 *   2. FINGERPRINT — the stored content_preview (a ~200-char slice of dialogue)
 *                  appears inside the freshly scraped subtitle after whitespace
 *                  normalization. Used when the stored hash was produced by an
 *                  older/different cleaner and can't be reproduced, but the
 *                  episode is unmistakably the same. content_full is stored as
 *                  the RAW subtitle either way.
 *
 * Requires a Supabase SECRET key (modern, RLS-bypassing replacement for the
 * legacy service_role key) in .env.local:
 *     SUPABASE_SECRET_KEY=sb_secret_xxx        # server-only, NOT NEXT_PUBLIC_
 *
 * Usage (dry run by default — writes nothing):
 *     node scripts/backfill-subtitles.mjs
 *     node scripts/backfill-subtitles.mjs --write           # apply
 *     node scripts/backfill-subtitles.mjs --write --force    # overwrite existing
 *     node scripts/backfill-subtitles.mjs --no-fingerprint   # hash matches only
 *     node scripts/backfill-subtitles.mjs <rtpUrl> [...]      # specific shows
 *
 * Scraper logic is ported verbatim from src/lib/rtp-scraper.ts; generateContentHash
 * and cleanSubtitleContent from src/utils — keep in sync if those change.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://www.rtp.pt";

const DEFAULT_URLS = [
  "https://www.rtp.pt/play/p9165/por-do-sol",
  "https://www.rtp.pt/play/p14147/o-americano",
  "https://www.rtp.pt/play/p14856/daqui-houve-resistencia",
  "https://www.rtp.pt/play/p15094/faro",
];

// ---- args ----
const rawArgs = process.argv.slice(2);
const WRITE = rawArgs.includes("--write");
const FORCE = rawArgs.includes("--force");
const DEBUG = rawArgs.includes("--debug");
const NO_FINGERPRINT = rawArgs.includes("--no-fingerprint");
const urls = rawArgs.filter((a) => !a.startsWith("--"));
const seriesUrls = urls.length ? urls : DEFAULT_URLS;

// ---- env ----
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SECRET_KEY = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SECRET_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local");
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SECRET_KEY, {
  auth: { persistSession: false },
});

// ---- ported: generateContentHash (src/utils/extractPhrasesUtils.ts) ----
const generateContentHash = (content) => {
  if (!content || content.length === 0) return "empty_content_" + Date.now().toString(36);
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    hash = (hash << 5) - hash + content.charCodeAt(i);
    hash = hash & hash;
  }
  const hashString = Math.abs(hash).toString(36) + "_" + content.length;
  if (hashString === "0" || hashString === "0_0")
    return "fallback_" + Date.now().toString(36) + "_" + content.length;
  return hashString;
};

// ---- ported: cleanSubtitleContent (src/utils/subtitleUtils.ts) ----
const cleanSubtitleContent = (content) => {
  if (!content || content.length === 0) return "";
  const lines = content
    .split(/[\r\n]+|#\s*#/)
    .map((line) => line.replace(/^#+\s*|#+\s*$/g, "").trim())
    .filter((line) => line.length > 0);
  const filteredLines = lines.filter((line) => {
    const trimmed = line.trim();
    return (
      trimmed.length > 0 &&
      !trimmed.includes("-->") &&
      !trimmed.includes("WEBVTT") &&
      !/^\d+$/.test(trimmed) &&
      (/[a-záàâãéèêíìîóòôõúùûçñA-ZÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇÑ]/.test(trimmed) ||
        /[a-zA-Z]/.test(trimmed))
    );
  });
  return filteredLines
    .map((line) => line.replace(/^[A-Z]+\s*:\s*/, "").trim())
    .filter((line) => line.length > 3)
    .join("\n");
};

// Collapse everything that isn't a letter (incl. accented) to single spaces so
// timestamps / cue numbers / markers / line-join differences fall away. Used for
// fingerprint matching.
const normalizeForMatch = (s) =>
  (s || "")
    .toLowerCase()
    .replace(/[^a-záàâãéèêíìîóòôõúùûçñ]+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

// ---- ported: extractEpisodes (src/lib/rtp-scraper.ts), minus date parsing ----
function extractEpisodes(html, seriesId, seriesSlug) {
  const episodes = [];
  const episodeArticleRegex =
    /<article[^>]*class="[^"]*episode-article[^"]*"[^>]*>([\s\S]*?)<\/article>/g;
  let articleMatch;
  while ((articleMatch = episodeArticleRegex.exec(html)) !== null) {
    const articleContent = articleMatch[1];
    const linkMatch =
      articleContent.match(
        /<a href="\/play\/p\d+\/(e\d+)\/[^"]*"[^>]*title="([^"]*)"[^>]*class="episode-item[^"]*"[^>]*>/
      ) ||
      articleContent.match(
        /<a href="\/play\/p\d+\/(e\d+)\/[^"]*"[^>]*class="episode-item[^"]*"[^>]*title="([^"]*)"[^>]*>/
      ) ||
      articleContent.match(/<a href="\/play\/p\d+\/(e\d+)\/[^"]*"[^>]*>/);
    if (!linkMatch) continue;
    const episodeId = linkMatch[1];
    const linkTitle = linkMatch[2] || "";
    const episodeNumberMatch = articleContent.match(/<div class="episode">Ep\.\s*(\d+)<\/div>/);
    if (!episodeNumberMatch) continue;
    const episodeNumber = parseInt(episodeNumberMatch[1]);
    const expectedShowName = seriesSlug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
    const title =
      linkTitle && linkTitle !== `Aceder a ${expectedShowName}`
        ? linkTitle.replace(/^Aceder a\s+/, "").trim()
        : `Episode ${episodeNumber}`;
    episodes.push({
      id: episodeId,
      url: `${BASE_URL}/play/${seriesId}/${episodeId}/${seriesSlug}`,
      title,
      episodeNumber,
    });
  }
  if (episodes.length < 10) {
    const broadEpisodeRegex = /<a[^>]*href="\/play\/p\d+\/(e\d+)\/[^"]*"[^>]*>([\s\S]*?)<\/a>/g;
    const found = new Set(episodes.map((ep) => ep.id));
    let broadMatch;
    while ((broadMatch = broadEpisodeRegex.exec(html)) !== null) {
      const episodeId = broadMatch[1];
      if (found.has(episodeId)) continue;
      const m =
        broadMatch[2].match(/Ep\.\s*(\d+)/) ||
        broadMatch[2].match(/Episode\s+(\d+)/i) ||
        broadMatch[2].match(/(\d+)/);
      if (m) {
        const episodeNumber = parseInt(m[1]);
        if (episodeNumber > 0 && episodeNumber < 100) {
          episodes.push({
            id: episodeId,
            url: `${BASE_URL}/play/${seriesId}/${episodeId}/${seriesSlug}`,
            title: `Episode ${episodeNumber}`,
            episodeNumber,
          });
        }
      }
    }
  }
  return episodes.sort((a, b) => a.episodeNumber - b.episodeNumber);
}

async function scrapeSeries(seriesUrl) {
  const response = await fetch(seriesUrl);
  if (!response.ok) throw new Error(`Failed to fetch series page: ${response.statusText}`);
  const html = await response.text();
  const m = seriesUrl.match(/\/play\/(p\d+)\/([^\/]+)/);
  if (!m) throw new Error("Invalid RTP series URL format");
  const titleMatch = html.match(/<title>([^<]+)<\/title>/);
  const title = titleMatch ? titleMatch[1].replace(" - RTP Play", "").trim() : "Unknown Series";
  return { id: m[1], title, episodes: extractEpisodes(html, m[1], m[2]) };
}

async function scrapeEpisodeSubtitle(episode) {
  const response = await fetch(episode.url);
  if (!response.ok) throw new Error(`Failed to fetch episode page: ${response.statusText}`);
  const html = await response.text();
  let subtitleUrl = null;
  const rtpPlayerMatch = html.match(/new\s+RTPPlayer\s*\(\s*\{([\s\S]*?)\}\s*\)\s*;/);
  if (rtpPlayerMatch) {
    const vttMatch = rtpPlayerMatch[1].match(
      /vtt:\s*\[\s*\[\s*['"]PT['"],\s*['"][^'"]*['"],\s*['"]([^'"]+\.vtt)['"][^\]]*\]\s*\]/
    );
    if (vttMatch) subtitleUrl = vttMatch[1];
  }
  if (!subtitleUrl) {
    const vttUrlMatch = html.match(
      /(https:\/\/cdn-ondemand\.rtp\.pt\/nas2\.share\/legendas\/video\/web\/p\d+\/[^"'\s]+\.vtt)/
    );
    if (vttUrlMatch) subtitleUrl = vttUrlMatch[1];
  }
  if (!subtitleUrl) return null;
  const subtitleResponse = await fetch(subtitleUrl);
  if (!subtitleResponse.ok)
    throw new Error(`Failed to download subtitle: ${subtitleResponse.statusText}`);
  return await subtitleResponse.text();
}

// ---- snapshot of all extractions (small table) ----
const { data: snapshotRows, error: snapErr } = await supabase
  .from("phrase_extractions")
  .select("id, content_hash, content_preview, content_full");
if (snapErr) {
  console.error("Failed to load extractions:", snapErr.message);
  process.exit(1);
}
// Mutable view: track which rows already have content_full (so we don't double-fill).
const snapshot = snapshotRows.map((r) => ({
  id: r.id,
  content_hash: r.content_hash,
  fingerprint: normalizeForMatch(r.content_preview),
  filled: !!r.content_full,
}));

const hashMatchesRow = (row, hashes) =>
  hashes.some((h) => row.content_hash === h || row.content_hash.startsWith(`${h}_ep_`));

async function applyFill(rows, content) {
  if (WRITE) {
    const { error } = await supabase
      .from("phrase_extractions")
      .update({ content_full: content })
      .in("id", rows.map((r) => r.id));
    if (error) throw new Error(error.message);
  }
  for (const r of rows) r.filled = true;
}

async function backfillSeries(seriesUrl) {
  console.log(`\n=== ${seriesUrl} ===`);
  let series;
  try {
    series = await scrapeSeries(seriesUrl);
  } catch (e) {
    console.log(`  ! scrape failed: ${e.message}`);
    return { hash: 0, fp: 0, already: 0, noMatch: 0, noSub: 0, err: 1 };
  }
  console.log(`  "${series.title}" — ${series.episodes.length} episodes found`);
  const tally = { hash: 0, fp: 0, already: 0, noMatch: 0, noSub: 0, err: 0 };

  for (const ep of series.episodes) {
    const label = `Ep ${String(ep.episodeNumber).padStart(2, "0")}`;
    try {
      const content = await scrapeEpisodeSubtitle(ep);
      if (!content) {
        tally.noSub++;
        console.log(`  ${label}: no subtitle`);
        continue;
      }
      const hashes = [
        ...new Set([
          generateContentHash(content),
          generateContentHash(cleanSubtitleContent(content)),
        ]),
      ];

      // 1) strong: hash match
      let targets = snapshot.filter((r) => hashMatchesRow(r, hashes));
      let matchType = "hash";

      // 2) fallback: dialogue fingerprint (preview ⊆ scraped content)
      if (targets.length === 0 && !NO_FINGERPRINT) {
        const normRaw = normalizeForMatch(content);
        const fpHit = snapshot.find(
          (r) => r.fingerprint.length >= 60 && normRaw.includes(r.fingerprint)
        );
        if (fpHit) {
          targets = [fpHit];
          matchType = "fingerprint";
        }
      }

      if (targets.length === 0) {
        tally.noMatch++;
        console.log(`  ${label}: no match (not extracted yet, or content changed)`);
        if (DEBUG) {
          console.log(
            `      rawHash=${hashes[0]} cleanHash=${hashes[1] ?? hashes[0]} rawLen=${content.length}`
          );
        }
        continue;
      }

      const pending = FORCE ? targets : targets.filter((r) => !r.filled);
      if (pending.length === 0) {
        tally.already++;
        console.log(`  ${label}: already filled (${targets.length})`);
        continue;
      }

      await applyFill(pending, content);
      if (matchType === "hash") tally.hash++;
      else tally.fp++;
      console.log(
        `  ${label}: ${WRITE ? "filled" : "would fill"} ${pending.length} via ${matchType} (${content.length} chars)`
      );
      await new Promise((r) => setTimeout(r, 700)); // be polite to RTP
    } catch (e) {
      tally.err++;
      console.log(`  ${label}: error — ${e.message}`);
    }
  }
  return tally;
}

// ---- main ----
console.log(`Backfill content_full — ${WRITE ? "WRITE" : "DRY RUN"}${FORCE ? " +FORCE" : ""}`);
const totals = { hash: 0, fp: 0, already: 0, noMatch: 0, noSub: 0, err: 0 };
for (const url of seriesUrls) {
  const t = await backfillSeries(url);
  for (const k of Object.keys(totals)) totals[k] += t[k];
}
const verb = WRITE ? "filled" : "wouldFill";
console.log(`\n=== TOTAL ===`);
console.log(
  `  ${verb}: hash=${totals.hash} fingerprint=${totals.fp} | already=${totals.already} ` +
    `noMatch=${totals.noMatch} noSubtitle=${totals.noSub} errors=${totals.err}`
);
const unfilled = snapshot.filter((r) => !r.filled).length;
console.log(`  extractions still without content_full: ${unfilled}/${snapshot.length}`);
if (!WRITE) console.log(`  (dry run — re-run with --write to apply)`);
