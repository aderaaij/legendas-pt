/**
 * Model bake-off: run phrase extraction and essentials on a few stored episodes
 * with several candidate models, side by side. Read-only against the database —
 * it fetches stored subtitles and writes nothing back.
 *
 *   npx tsx scripts/model-bakeoff.ts [--episodes 4] [--only phrases|essentials]
 *                                    [--models gpt-6-luna,claude-haiku-5-5]
 *                                    [--reselect]
 *
 * Reads Supabase + LLM keys from `.env.worker`; a candidate whose provider has no
 * key is skipped. Each (episode, task, model) result is cached under
 * `.bakeoff/results/`, so a rerun (e.g. after adding a key) only sends the
 * missing runs. The episode pick is pinned in `.bakeoff/episodes.json` until
 * `--reselect`. Writes `.bakeoff/report.html` for side-by-side review.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import type { LanguageModelUsage } from "ai";
import { createServiceClient } from "@/lib/supabase-admin";
import {
  extractEssentialsFromSubtitle,
  extractFromSubtitle,
  reviewTranslationsFromSubtitle,
  type ExtractInput,
} from "@/lib/extractor";
import { MissingApiKeyError } from "@/lib/llm/providers";
import { REVIEW_PROMPT_VERSION } from "@/lib/llm/review-phrases";
import type { LlmSelection } from "@/lib/llm/types";
import type { EssentialCandidate } from "@/lib/llm/extract-essentials";
import { toTargetLanguage, type TargetLanguage } from "@/lib/i18n/languages";
import type { PhraseWithTimestamp } from "@/utils/subtitleUtils";

type Task = "phrases" | "essentials";

/** A model, optionally followed by a review of its phrase translations. */
type Candidate = LlmSelection & { review?: LlmSelection };

const SONNET_REVIEW: LlmSelection = {
  provider: "anthropic",
  model: "claude-sonnet-5-5",
};

/** The first entry per task is the current production default (the baseline). */
const CANDIDATES: Record<Task, Candidate[]> = {
  phrases: [
    { provider: "openai", model: "gpt-4.1-mini" },
    { provider: "anthropic", model: "claude-haiku-5-5", effort: "low" },
    { provider: "anthropic", model: "claude-haiku-5-5", effort: "none" },
    { provider: "anthropic", model: "claude-sonnet-5-5", effort: "none" },
    { provider: "openai", model: "gpt-6-luna", effort: "low" },
    {
      provider: "openai",
      model: "gpt-6-luna",
      effort: "low",
      review: { ...SONNET_REVIEW, effort: "low" },
    },
  ],
  essentials: [
    { provider: "openai", model: "gpt-4.1" },
    { provider: "anthropic", model: "claude-sonnet-5-5", effort: "medium" },
    { provider: "openai", model: "gpt-6-sol", effort: "medium" },
  ],
};

/**
 * USD per million tokens [input, output], standard tier, Oct 2026. Output
 * includes reasoning tokens. The GPT-6 rates come from third-party listings —
 * check OpenAI's pricing page before relying on them.
 */
const PRICES: Record<string, [number, number]> = {
  "gpt-4.1-mini": [0.4, 1.6],
  "gpt-4.1": [2, 8],
  "gpt-6-luna": [0.1, 0.5],
  "gpt-6-sol": [2, 10],
  "claude-haiku-5-5": [0.1, 0.5],
  "claude-sonnet-5-5": [2, 10],
};

const OUT_DIR = ".bakeoff";
const RESULTS_DIR = join(OUT_DIR, "results");
const EPISODES_FILE = join(OUT_DIR, "episodes.json");
const CONCURRENCY = 4;

interface Episode {
  extractionId: string;
  label: string;
  language: TargetLanguage;
  filename?: string;
}

interface ReviewRecord {
  ms: number;
  tokens?: RunRecord["tokens"];
  cost?: number;
  fixes: { phrase: string; before: string; after: string; issue: string }[];
}

interface RunRecord {
  task: Task;
  selection: Candidate;
  extractionId: string;
  ok: boolean;
  error?: string;
  ms: number;
  tokens?: { input: number; output: number; reasoning: number };
  cost?: number;
  phrases?: PhraseWithTimestamp[];
  truncated?: boolean;
  essentials?: EssentialCandidate[];
  /** Set when the phrases went through a review; `cost`/`ms` above include it. */
  review?: ReviewRecord;
}

const baseKey = (s: LlmSelection) =>
  `${s.provider}-${s.model}-${s.effort ?? "default"}`;
const selectionKey = (s: Candidate) =>
  s.review
    ? `${baseKey(s)}+review-v${REVIEW_PROMPT_VERSION}-${baseKey(s.review)}`
    : baseKey(s);
const baseLabel = (s: LlmSelection) =>
  s.effort ? `${s.model} (${s.effort})` : s.model;
const selectionLabel = (s: Candidate) =>
  s.review
    ? `${baseLabel(s)} + ${baseLabel(s.review)} review v${REVIEW_PROMPT_VERSION}`
    : baseLabel(s);
const resultPath = (episode: Episode, task: Task, s: Candidate) =>
  join(RESULTS_DIR, `${episode.extractionId}__${task}__${selectionKey(s)}.json`);

function readJson<T>(path: string): T | undefined {
  return existsSync(path) ? (JSON.parse(readFileSync(path, "utf8")) as T) : undefined;
}

function tokensOf(usage: LanguageModelUsage | undefined) {
  if (!usage) return undefined;
  return {
    input: usage.inputTokens ?? 0,
    output: usage.outputTokens ?? 0,
    reasoning: usage.outputTokenDetails?.reasoningTokens ?? 0,
  };
}

function costOf(model: string, tokens: RunRecord["tokens"]) {
  const price = PRICES[model];
  if (!price || !tokens) return undefined;
  return (tokens.input * price[0] + tokens.output * price[1]) / 1_000_000;
}

// --- Episode selection -------------------------------------------------------

type ExtractionRow = {
  id: string;
  show_id: string | null;
  language: string | null;
  extraction_params: { filename?: string } | null;
  shows: { name: string } | null;
  episodes: { season: number | null; episode_number: number | null } | null;
};

/** One episode per show, alternating languages, most recent shows first. */
async function selectEpisodes(count: number): Promise<Episode[]> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("phrase_extractions")
    .select(
      "id, show_id, language, extraction_params, shows(name), episodes(season, episode_number)"
    )
    .not("content_full", "is", null)
    .not("episode_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(500)
    .returns<ExtractionRow[]>();
  if (error) throw new Error(`Listing extractions failed: ${error.message}`);

  const byLanguage = new Map<TargetLanguage, ExtractionRow[]>();
  const seenShows = new Set<string>();
  for (const row of data ?? []) {
    if (!row.show_id || seenShows.has(row.show_id)) continue;
    seenShows.add(row.show_id);
    const language = toTargetLanguage(row.language);
    byLanguage.set(language, [...(byLanguage.get(language) ?? []), row]);
  }

  const queues = [...byLanguage.values()];
  const picked: ExtractionRow[] = [];
  while (picked.length < count && queues.some((q) => q.length > 0)) {
    for (const queue of queues) {
      const next = queue.shift();
      if (next && picked.length < count) picked.push(next);
    }
  }

  return picked.map((row) => {
    const ep = row.episodes;
    const code =
      ep?.season != null && ep.episode_number != null
        ? ` S${String(ep.season).padStart(2, "0")}E${String(ep.episode_number).padStart(2, "0")}`
        : "";
    return {
      extractionId: row.id,
      label: `${row.shows?.name ?? "Unknown show"}${code}`,
      language: toTargetLanguage(row.language),
      filename: row.extraction_params?.filename,
    };
  });
}

async function fetchContent(episodes: Episode[]): Promise<Map<string, string>> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("phrase_extractions")
    .select("id, content_full")
    .in(
      "id",
      episodes.map((e) => e.extractionId)
    );
  if (error) throw new Error(`Fetching subtitles failed: ${error.message}`);
  return new Map((data ?? []).map((row) => [row.id, row.content_full as string]));
}

// --- Running -----------------------------------------------------------------

async function runOne(
  task: Task,
  selection: LlmSelection,
  episode: Episode,
  content: string
): Promise<RunRecord> {
  const input: ExtractInput = {
    content,
    language: episode.language,
    filename: episode.filename,
    ...selection,
  };
  const base = { task, selection, extractionId: episode.extractionId };
  const started = Date.now();
  try {
    if (task === "phrases") {
      const result = await extractFromSubtitle(input);
      const tokens = tokensOf(result.usage);
      return {
        ...base,
        ok: true,
        ms: Date.now() - started,
        tokens,
        cost: costOf(selection.model, tokens),
        phrases: result.phrases,
        truncated: result.truncated,
      };
    }
    const result = await extractEssentialsFromSubtitle(input);
    const tokens = tokensOf(result.usage);
    return {
      ...base,
      ok: true,
      ms: Date.now() - started,
      tokens,
      cost: costOf(selection.model, tokens),
      essentials: result.essentials,
    };
  } catch (error) {
    if (error instanceof MissingApiKeyError) throw error;
    return {
      ...base,
      ok: false,
      ms: Date.now() - started,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Run a candidate. A reviewed candidate reuses (or first runs) its base model's
 * result, then has the reviewer fix the translations against the subtitles.
 */
async function runCandidate(
  task: Task,
  candidate: Candidate,
  episode: Episode,
  content: string
): Promise<RunRecord> {
  if (!candidate.review) return runOne(task, candidate, episode, content);
  const { review, ...baseSelection } = candidate;
  const basePath = resultPath(episode, task, baseSelection);
  let base = readJson<RunRecord>(basePath);
  if (!base?.ok) {
    base = await runOne(task, baseSelection, episode, content);
    writeFileSync(basePath, JSON.stringify(base, null, 2));
    if (!base.ok) return { ...base, selection: candidate };
  }

  const phrases = base.phrases ?? [];
  const started = Date.now();
  try {
    const result = await reviewTranslationsFromSubtitle({
      content,
      language: episode.language,
      filename: episode.filename,
      phrases,
      reviewer: review,
    });
    const ms = Date.now() - started;
    const tokens = tokensOf(result.usage);
    const reviewCost = costOf(review.model, tokens);
    const fixByIndex = new Map(result.fixes.map((fix) => [fix.index, fix]));
    return {
      task,
      selection: candidate,
      extractionId: episode.extractionId,
      ok: true,
      ms: base.ms + ms,
      tokens,
      cost: (base.cost ?? 0) + (reviewCost ?? 0),
      truncated: base.truncated,
      phrases: phrases.map((p, i) => {
        const fix = fixByIndex.get(i);
        return fix ? { ...p, translation: fix.translation } : p;
      }),
      review: {
        ms,
        tokens,
        cost: reviewCost,
        fixes: result.fixes.map((fix) => ({
          phrase: phrases[fix.index].phrase,
          before: phrases[fix.index].translation,
          after: fix.translation,
          issue: fix.issue,
        })),
      },
    };
  } catch (error) {
    if (error instanceof MissingApiKeyError) throw error;
    return {
      task,
      selection: candidate,
      extractionId: episode.extractionId,
      ok: false,
      ms: Date.now() - started,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function pool<T>(jobs: (() => Promise<T>)[], size: number): Promise<void> {
  let next = 0;
  const lanes = Array.from({ length: Math.min(size, jobs.length) }, async () => {
    while (next < jobs.length) await jobs[next++]();
  });
  await Promise.all(lanes);
}

// --- Report ------------------------------------------------------------------

const esc = (s: unknown) =>
  String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const normalize = (s: string) =>
  s.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, "").replace(/\s+/g, " ").trim();
const usd = (n: number | undefined) =>
  n == null ? "–" : n < 0.01 ? `$${n.toFixed(4)}` : `$${n.toFixed(3)}`;
const avg = (xs: number[]) =>
  xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : undefined;

function summaryTable(task: Task, records: RunRecord[]): string {
  const rows = CANDIDATES[task].map((s) => {
    const runs = records.filter(
      (r) => r.task === task && selectionKey(r.selection) === selectionKey(s)
    );
    const ok = runs.filter((r) => r.ok);
    const items = ok.map((r) =>
      task === "phrases" ? r.phrases?.length ?? 0 : r.essentials?.length ?? 0
    );
    const matched =
      task === "phrases"
        ? avg(
            ok.map((r) => {
              const p = r.phrases ?? [];
              return p.length
                ? p.filter((x) => (x.matchedConfidence ?? 0) > 0).length / p.length
                : 0;
            })
          )
        : undefined;
    const fixes = s.review
      ? ` <small>· avg ${Math.round(avg(ok.map((r) => r.review?.fixes.length ?? 0)) ?? 0)} fixes</small>`
      : "";
    return `<tr><td>${esc(selectionLabel(s))}${fixes}</td><td>${ok.length}/${runs.length}</td>
      <td>${items.length ? Math.round(avg(items)!) : "–"}</td>
      ${task === "phrases" ? `<td>${matched == null ? "–" : `${Math.round(matched * 100)}%`}</td><td>${ok.filter((r) => r.truncated).length}</td>` : ""}
      <td>${ok.length ? `${Math.round(avg(ok.map((r) => r.ms))! / 1000)}s` : "–"}</td>
      <td>${ok.length ? Math.round(avg(ok.map((r) => r.tokens?.output ?? 0))!) : "–"}</td>
      <td>${ok.length ? Math.round(avg(ok.map((r) => r.tokens?.reasoning ?? 0))!) : "–"}</td>
      <td>${usd(avg(ok.flatMap((r) => (r.cost == null ? [] : [r.cost]))))}</td></tr>`;
  });
  const head =
    task === "phrases"
      ? "<th>Model</th><th>Runs OK</th><th>Avg phrases</th><th>Matched to a cue</th><th>Truncated</th>"
      : "<th>Model</th><th>Runs OK</th><th>Avg essentials</th>";
  return `<table><thead><tr>${head}<th>Avg time</th><th>Avg output tok</th><th>…of which reasoning</th><th>Avg cost / episode</th></tr></thead><tbody>${rows.join("")}</tbody></table>`;
}

function essentialsColumns(runs: RunRecord[]): string {
  return `<div class="cols">${runs
    .map((r) => {
      const body = r.ok
        ? `<ol>${(r.essentials ?? [])
            .map(
              (e) => `<li><b>${esc(e.expression)}</b> <span class="imp">${"●".repeat(e.importance ?? 0)}</span> — ${esc(e.translation)}
              <div class="ex">“${esc(e.example)}”<br>${esc(e.exampleTranslation)}</div>${e.note ? `<div class="note">${esc(e.note)}</div>` : ""}</li>`
            )
            .join("")}</ol>`
        : `<p class="err">${esc(r.error)}</p>`;
      return `<div class="col"><h4>${esc(selectionLabel(r.selection))} <small>${r.ok ? `${r.essentials?.length} kept · ${usd(r.cost)}` : "failed"}</small></h4>${body}</div>`;
    })
    .join("")}</div>`;
}

function phrasesSection(runs: RunRecord[]): string {
  const ok = runs.filter((r) => r.ok);
  // Same phrase from several models with differing translations — the most
  // direct read on translation quality.
  const byPhrase = new Map<string, Map<string, PhraseWithTimestamp>>();
  for (const r of ok) {
    for (const p of r.phrases ?? []) {
      const key = normalize(p.phrase);
      if (!byPhrase.has(key)) byPhrase.set(key, new Map());
      byPhrase.get(key)!.set(selectionKey(r.selection), p);
    }
  }
  const differing = [...byPhrase.values()]
    .filter(
      (m) =>
        m.size >= 2 &&
        new Set([...m.values()].map((p) => normalize(p.translation))).size > 1
    )
    .slice(0, 40);
  const compare = differing.length
    ? `<details open><summary>Same phrase, different translations (${differing.length} shown)</summary><table class="cmp"><thead><tr><th>Phrase</th>${ok.map((r) => `<th>${esc(selectionLabel(r.selection))}</th>`).join("")}</tr></thead><tbody>${differing
        .map((m) => {
          const any = [...m.values()][0];
          return `<tr><td>${esc(any.phrase)}</td>${ok.map((r) => `<td>${esc(m.get(selectionKey(r.selection))?.translation ?? "—")}</td>`).join("")}</tr>`;
        })
        .join("")}</tbody></table></details>`
    : "";

  const lists = `<details><summary>Full phrase lists</summary><div class="cols">${runs
    .map((r) => {
      const others = ok.filter((o) => o !== r);
      const body = r.ok
        ? `<ol>${(r.phrases ?? [])
            .map((p) => {
              const unique = others.every(
                (o) => !(o.phrases ?? []).some((q) => normalize(q.phrase) === normalize(p.phrase))
              );
              const unmatched = (p.matchedConfidence ?? 0) === 0;
              return `<li class="${unique ? "uniq" : ""}${unmatched ? " unm" : ""}">${esc(p.phrase)} — <i>${esc(p.translation)}</i></li>`;
            })
            .join("")}</ol>`
        : `<p class="err">${esc(r.error)}</p>`;
      return `<div class="col"><h4>${esc(selectionLabel(r.selection))} <small>${r.ok ? `${r.phrases?.length} phrases · ${usd(r.cost)}` : "failed"}</small></h4>${body}</div>`;
    })
    .join("")}</div><p class="legend"><span class="uniq">highlighted</span> = only this model found it · <span class="unm">struck</span> = not matched back to a subtitle cue</p></details>`;
  const fixes = ok
    .filter((r) => r.review)
    .map(
      (r) => `<details open><summary>Fixes by ${esc(selectionLabel(r.selection))} (${r.review!.fixes.length} · ${usd(r.review!.cost)})</summary><table class="cmp"><thead><tr><th>Phrase</th><th>Before</th><th>After</th><th>Why</th></tr></thead><tbody>${r
        .review!.fixes.map(
          (f) =>
            `<tr><td>${esc(f.phrase)}</td><td>${esc(f.before)}</td><td>${esc(f.after)}</td><td><small>${esc(f.issue)}</small></td></tr>`
        )
        .join("")}</tbody></table></details>`
    )
    .join("");
  return fixes + compare + lists;
}

function writeReport(episodes: Episode[], records: RunRecord[]): string {
  const sections = episodes
    .map((episode) => {
      const forTask = (task: Task) =>
        CANDIDATES[task].flatMap((s) => {
          const r = records.find(
            (x) =>
              x.extractionId === episode.extractionId &&
              x.task === task &&
              selectionKey(x.selection) === selectionKey(s)
          );
          return r ? [r] : [];
        });
      const essentials = forTask("essentials");
      const phrases = forTask("phrases");
      return `<section><h2>${esc(episode.label)} <small>${episode.language}</small></h2>
        ${essentials.length ? `<h3>Essentials</h3>${essentialsColumns(essentials)}` : ""}
        ${phrases.length ? `<h3>Phrases</h3>${phrasesSection(phrases)}` : ""}</section>`;
    })
    .join("");

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Model bake-off</title><style>
:root{--bg:#fbfaf7;--fg:#1d1d1b;--muted:#6b6a64;--line:#e3e1da;--card:#fff;--accent:#2f6f5e;--hl:#fff3c4;--err:#b3261e}
@media (prefers-color-scheme:dark){:root{--bg:#171715;--fg:#ecebe6;--muted:#a09f98;--line:#33322e;--card:#1f1f1c;--accent:#7cc4ad;--hl:#4a3f12;--err:#f2b8b5}}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,sans-serif;padding:24px 16px;max-width:1500px;margin-inline:auto}
h1{font-size:24px;margin:0 0 4px}h2{margin-top:40px;border-top:1px solid var(--line);padding-top:24px}h3{color:var(--accent)}
small{color:var(--muted);font-weight:400;font-size:13px}
table{border-collapse:collapse;width:100%;margin:8px 0 16px;font-size:14px}th,td{border-bottom:1px solid var(--line);padding:6px 8px;text-align:left;vertical-align:top}
th{color:var(--muted);font-weight:500}
.cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px}
.col{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:12px;min-width:0}
.col h4{margin:0 0 8px}ol{padding-left:22px;margin:0}li{margin-bottom:8px}
.ex{color:var(--muted);font-size:13px}.note{font-size:13px;font-style:italic}.imp{color:var(--accent);font-size:10px}
.uniq{background:var(--hl)}.unm{text-decoration:line-through;color:var(--muted)}
.err{color:var(--err)}summary{cursor:pointer;margin:8px 0;font-weight:500}.legend{font-size:13px;color:var(--muted)}
.cmp td:first-child{font-weight:500}
</style></head><body>
<h1>Model bake-off</h1><p><small>${episodes.length} episodes · generated ${new Date().toISOString().slice(0, 16).replace("T", " ")} · the first model per task is the current default</small></p>
<h3>Essentials</h3>${summaryTable("essentials", records)}
<h3>Phrases</h3>${summaryTable("phrases", records)}
${sections}</body></html>`;
  const path = join(OUT_DIR, "report.html");
  writeFileSync(path, html);
  return path;
}

// --- Main --------------------------------------------------------------------

async function main() {
  try {
    process.loadEnvFile(".env.worker");
  } catch {
    // Env may come from the process instead.
  }
  const { values } = parseArgs({
    options: {
      episodes: { type: "string", default: "4" },
      only: { type: "string" },
      models: { type: "string" },
      reselect: { type: "boolean", default: false },
    },
  });
  const tasks: Task[] =
    values.only === "phrases" || values.only === "essentials"
      ? [values.only]
      : ["essentials", "phrases"];
  const modelFilter = values.models?.split(",").map((m) => m.trim());

  mkdirSync(RESULTS_DIR, { recursive: true });
  let episodes = values.reselect ? undefined : readJson<Episode[]>(EPISODES_FILE);
  if (!episodes) {
    episodes = await selectEpisodes(Number(values.episodes));
    writeFileSync(EPISODES_FILE, JSON.stringify(episodes, null, 2));
  }
  console.log(`Episodes: ${episodes.map((e) => `${e.label} [${e.language}]`).join(", ")}`);

  const todo: { task: Task; selection: Candidate; episode: Episode }[] = [];
  for (const task of tasks) {
    for (const selection of CANDIDATES[task]) {
      if (modelFilter && !modelFilter.includes(selection.model)) continue;
      for (const episode of episodes) {
        const cached = readJson<RunRecord>(resultPath(episode, task, selection));
        if (!cached?.ok) todo.push({ task, selection, episode });
      }
    }
  }

  const content = todo.length ? await fetchContent(episodes) : new Map<string, string>();
  const skippedProviders = new Set<string>();
  console.log(`${todo.length} run(s) to do, ${CONCURRENCY} at a time…`);

  await pool(
    todo.map(({ task, selection, episode }) => async () => {
      if (skippedProviders.has(selection.provider)) return;
      const text = content.get(episode.extractionId);
      if (!text) {
        console.log(`  ! no stored subtitle for ${episode.label}`);
        return;
      }
      try {
        const record = await runCandidate(task, selection, episode, text);
        writeFileSync(resultPath(episode, task, selection), JSON.stringify(record, null, 2));
        const count =
          task === "phrases"
            ? `${record.phrases?.length} phrases${record.review ? `, ${record.review.fixes.length} fixed` : ""}`
            : `${record.essentials?.length} essentials`;
        console.log(
          record.ok
            ? `  ✓ ${task.padEnd(10)} ${selectionLabel(selection).padEnd(26)} ${episode.label} · ${count} · ${Math.round(record.ms / 1000)}s · ${usd(record.cost)}`
            : `  ✗ ${task.padEnd(10)} ${selectionLabel(selection).padEnd(26)} ${episode.label} · ${record.error}`
        );
      } catch (error) {
        if (!(error instanceof MissingApiKeyError)) throw error;
        if (!skippedProviders.has(selection.provider)) {
          console.log(`  – skipping ${selection.provider}: ${error.message}`);
        }
        skippedProviders.add(selection.provider);
      }
    }),
    CONCURRENCY
  );

  const records = readdirSync(RESULTS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => readJson<RunRecord>(join(RESULTS_DIR, f))!)
    .filter((r) => episodes.some((e) => e.extractionId === r.extractionId));
  const reportPath = writeReport(episodes, records);
  const total = records.reduce((sum, r) => sum + (r.cost ?? 0), 0);
  console.log(`\nReport: ${reportPath}  (spend across all cached runs: ${usd(total)})`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
