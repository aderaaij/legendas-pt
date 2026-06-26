/**
 * Provider-agnostic LLM contracts shared by both the server-side LLM layer
 * (`providers.ts`, `extract-phrases.ts`, …) and the client UI (the provider
 * picker). Keep this file free of server-only imports so it stays UI-safe.
 */

export type Provider = "openai" | "anthropic" | "google";

export const PROVIDERS: Provider[] = ["openai", "anthropic", "google"];

/**
 * Default model per provider. Bare model-id strings (no date suffixes).
 * Overridable via the `LLM_MODEL` env var or a per-request selection.
 */
export const DEFAULT_MODELS: Record<Provider, string> = {
  openai: "gpt-4.1-mini",
  anthropic: "claude-sonnet-4-6",
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

export interface LlmSelection {
  provider: Provider;
  model: string;
}

export function isProvider(value: unknown): value is Provider {
  return typeof value === "string" && (PROVIDERS as string[]).includes(value);
}
