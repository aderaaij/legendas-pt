/**
 * The single reuse point for every LLM consumer. Resolves the effective
 * provider/model (per-request override → env default → built-in default) and
 * constructs the matching Vercel AI SDK model. Kept pure: no Supabase, no Next,
 * no app-specific types — data in, model out — so it stays easy to extract.
 *
 * Server-only by convention: only route handlers import this (the UI imports
 * `./types` alone), and it reads non-`NEXT_PUBLIC_` env vars, so nothing leaks
 * to the client bundle.
 */
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import type { LanguageModel } from "ai";
import {
  API_KEY_ENV,
  DEFAULT_MODELS,
  isProvider,
  type LlmSelection,
  type Provider,
} from "./types";

/** The selected provider has no API key configured. */
export class MissingApiKeyError extends Error {
  constructor(public readonly provider: Provider) {
    super(`API key for ${provider} not configured`);
    this.name = "MissingApiKeyError";
  }
}

/** A request asked for an unknown provider. */
export class UnknownProviderError extends Error {
  constructor(public readonly value: string) {
    super(`Unknown LLM provider: ${value}`);
    this.name = "UnknownProviderError";
  }
}

/**
 * Resolve the effective provider + model. Precedence:
 *   per-request override → env default (`LLM_PROVIDER` / `LLM_MODEL`) → built-in.
 * Empty strings are treated as unset.
 */
export function resolveSelection(
  override?: Partial<LlmSelection>
): LlmSelection {
  const providerValue =
    override?.provider || process.env.LLM_PROVIDER || "openai";

  if (!isProvider(providerValue)) {
    throw new UnknownProviderError(providerValue);
  }
  const provider: Provider = providerValue;

  const model =
    override?.model || process.env.LLM_MODEL || DEFAULT_MODELS[provider];

  return { provider, model };
}

/**
 * Build an AI SDK language model for a resolved selection. The only place
 * providers are constructed — to add a provider, extend this switch and `./types`.
 */
export function getModel(selection: LlmSelection): LanguageModel {
  const apiKey = process.env[API_KEY_ENV[selection.provider]];
  if (!apiKey) {
    throw new MissingApiKeyError(selection.provider);
  }

  switch (selection.provider) {
    case "openai":
      return createOpenAI({ apiKey })(selection.model);
    case "anthropic":
      return createAnthropic({ apiKey })(selection.model);
    case "google":
      return createGoogleGenerativeAI({ apiKey })(selection.model);
  }
}

// Future consumer — a full subtitle-translation module (translate every cue,
// preserve VTT/SRT timing for re-muxing) will reuse `resolveSelection` + `getModel`
// here exactly as `extract-phrases.ts` does, differing only in its own Zod schema
// (cues with timing) and prompt. No changes to this file or `./types` are needed.
