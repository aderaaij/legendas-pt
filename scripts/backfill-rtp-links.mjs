#!/usr/bin/env node
/**
 * Backfill `shows.rtp_links` for existing shows so the show page / home hero can
 * link back to the show's RTP program page(s).
 *
 * A show can map to several RTP "programa" pages (one per season — RTP gives each
 * season its own program id, e.g. Pôr do Sol S1 = p9165, S2 = p10551). This script
 * reconstructs those links from two sources, strongest first:
 *
 *   1. IMPORT HISTORY — completed `extraction_jobs` of type `rtp_series` carry the
 *      `series_url` that was imported and a `series_title` that often names the
 *      season ("…, temporada 2"). The job's program page is matched to a show by
 *      comparing the URL slug to the show-name slug, and the season is read from
 *      the title (default 1). This yields precise per-season links.
 *   2. watch_url FALLBACK — for a show with no usable job history but whose legacy
 *      `watch_url` already points at rtp.pt, that single URL is added as one
 *      (season-less) link.
 *
 * Existing `rtp_links` are MERGED, not clobbered: a derived per-season link
 * replaces the entry for that season; the season-less fallback is added only when
 * the show has no links at all. Safe to re-run.
 *
 * Requires the migration `database/add_rtp_links.sql` to have been applied first,
 * and a Supabase SECRET key in .env.local (SUPABASE_SECRET_KEY=sb_secret_xxx).
 *
 * Usage (dry run by default — writes nothing):
 *     node scripts/backfill-rtp-links.mjs
 *     node scripts/backfill-rtp-links.mjs --write     # apply
 *
 * The slug + URL logic is ported from src/utils/slugify.ts and
 * src/lib/rtp-scraper.ts — keep in sync if those change.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://www.rtp.pt";

// ---- args ----
const WRITE = process.argv.slice(2).includes("--write");

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

// ---- ported: normalizePortugueseText + generateShowSlug (src/utils/slugify.ts) ----
const ACCENTS = {
  á: "a", à: "a", â: "a", ã: "a", ä: "a", é: "e", è: "e", ê: "e", ë: "e",
  í: "i", ì: "i", î: "i", ï: "i", ó: "o", ò: "o", ô: "o", õ: "o", ö: "o",
  ú: "u", ù: "u", û: "u", ü: "u", ç: "c", ñ: "n",
};
const stripAccents = (text) =>
  text.replace(/[áàâãäéèêëíìîïóòôõöúùûüçñ]/gi, (m) => ACCENTS[m.toLowerCase()] ?? m);
const showSlug = (name) =>
  stripAccents(name)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

// ---- ported: RTPScraperService.canonicalSeriesUrl (src/lib/rtp-scraper.ts) ----
const canonicalSeriesUrl = (url) => {
  if (!url) return null;
  const m = url.match(/\/play\/(p\d+)\/(?:e\d+\/)?([^/?#]+)/);
  if (!m) return null;
  const [, programId, slug] = m;
  return { programId, slug, url: `${BASE_URL}/play/${programId}/${slug}` };
};

// Minimal HTML-entity decode — job titles are stored encoded ("P&ocirc;r do Sol").
const decode = (s) =>
  (s || "")
    .replace(/&ocirc;/g, "ô").replace(/&oacute;/g, "ó").replace(/&aacute;/g, "á")
    .replace(/&eacute;/g, "é").replace(/&ecirc;/g, "ê").replace(/&atilde;/g, "ã")
    .replace(/&ccedil;/g, "ç").replace(/&iacute;/g, "í").replace(/&uacute;/g, "ú")
    .replace(/&amp;/g, "&");

const seasonFromTitle = (title) => {
  const m = decode(title).match(/temporada\s+(\d+)/i);
  return m ? parseInt(m[1], 10) : 1;
};

// ---- load ----
const { data: shows, error: showsError } = await supabase
  .from("shows")
  .select("id,name,source,watch_url,rtp_links")
  .order("name");
if (showsError) {
  console.error("Failed to load shows:", showsError.message);
  console.error("(Did you apply database/add_rtp_links.sql first?)");
  process.exit(1);
}

const { data: jobs, error: jobsError } = await supabase
  .from("extraction_jobs")
  .select("series_title,series_url,status")
  .eq("job_type", "rtp_series")
  .eq("status", "completed");
if (jobsError) {
  console.error("Failed to load extraction_jobs:", jobsError.message);
  process.exit(1);
}

const showBySlug = new Map(shows.map((s) => [showSlug(s.name), s]));

// slug -> (season -> url), from import history
const derived = new Map();
let unmatched = 0;
for (const job of jobs) {
  const canon = canonicalSeriesUrl(job.series_url);
  if (!canon) continue;
  const show = showBySlug.get(canon.slug);
  if (!show) {
    unmatched++;
    continue;
  }
  const season = seasonFromTitle(job.series_title);
  if (!derived.has(show.id)) derived.set(show.id, new Map());
  derived.get(show.id).set(season, canon.url);
}

// ---- plan + (optionally) write ----
let changed = 0;
for (const show of shows) {
  const existing = Array.isArray(show.rtp_links) ? show.rtp_links : [];
  const bySeason = new Map(
    existing.filter((l) => l.season != null).map((l) => [l.season, l])
  );
  const seasonless = existing.filter((l) => l.season == null);

  const jobLinks = derived.get(show.id);
  if (jobLinks && jobLinks.size) {
    for (const [season, url] of [...jobLinks].sort((a, b) => a[0] - b[0])) {
      bySeason.set(season, { url, season });
    }
  }

  let next = [
    ...[...bySeason.values()].sort((a, b) => a.season - b.season),
    ...seasonless,
  ];

  // watch_url fallback — only when we still have nothing and it's an rtp.pt link.
  if (next.length === 0 && show.watch_url && /rtp\.pt/i.test(show.watch_url)) {
    const canon = canonicalSeriesUrl(show.watch_url);
    if (canon) next = [{ url: canon.url }];
  }

  const before = JSON.stringify(existing);
  const after = JSON.stringify(next);
  const willChange = before !== after;
  if (willChange) changed++;

  const tag = willChange ? (WRITE ? "WRITE" : "PLAN ") : "skip ";
  console.log(
    `[${tag}] ${show.name}\n        ${after === "[]" ? "(no rtp links found)" : after}`
  );

  if (willChange && WRITE) {
    const { error } = await supabase
      .from("shows")
      .update({ rtp_links: next })
      .eq("id", show.id);
    if (error) console.error(`        ! update failed: ${error.message}`);
  }
}

console.log(
  `\n${WRITE ? "Wrote" : "Would write"} ${changed} show(s).` +
    (unmatched ? ` ${unmatched} job(s) had no matching show.` : "") +
    (WRITE ? "" : "  Re-run with --write to apply.")
);
