/**
 * Provider-agnostic LLM contracts shared by both the server-side LLM layer
 * (`providers.ts`, `extract-phrases.ts`, …) and the client UI (the provider
 * picker). Keep this file free of server-only imports so it stays UI-safe.
 */

export type Provider = "openai" | "anthropic" | "google";

export const PROVIDERS: Provider[] = ["openai", "anthropic", "google"];

/**
 * Default phrase-extraction model per provider. Bare model-id strings (no date
 * suffixes). Overridable via the `LLM_MODEL` env var or a per-request selection.
 * Picked by `scripts/model-bakeoff.ts` (Oct 2026).
 */
export const DEFAULT_MODELS: Record<Provider, string> = {
  openai: "gpt-6-luna",
  anthropic: "claude-haiku-5-5",
  google: "gemini-2.5-flash",
};

/** Human-friendly labels for the provider picker. */
export const PROVIDER_LABELS: Record<Provider, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic (Claude)",
  google: "Google (Gemini)",
};

/** Env var holding the API key for each provider. */
export const API_KEY_ENV: Record<Provider, string> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  google: "GOOGLE_GENERATIVE_AI_API_KEY",
};

/**
 * Reasoning effort, mapped to each provider's own setting in `providers.ts`.
 * `none` turns reasoning off where the model allows it. Claude Sonnet 5.5 can't
 * fully disable it, so the AI SDK sends its lowest setting instead; Opus 5.5
 * always reasons, so use `low` there.
 */
export type Effort = "none" | "low" | "medium" | "high";

/**
 * Effort for each provider's default model, applied only when that model is
 * the one in use. Bulk extraction needs little reasoning, and Haiku's
 * reasoning can eat its output budget on a long episode, so it gets none.
 */
export const DEFAULT_EFFORTS: Record<Provider, Effort | undefined> = {
  openai: "low",
  anthropic: "none",
  google: undefined,
};

export interface LlmSelection {
  provider: Provider;
  model: string;
  /** Unset → the model's own default effort. */
  effort?: Effort;
}

export function isProvider(value: unknown): value is Provider {
  return typeof value === "string" && (PROVIDERS as string[]).includes(value);
}
