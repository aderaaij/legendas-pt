import type { TargetLanguage } from "../languages";
import { es } from "./es";
import { pt, type Dictionary } from "./pt";

export type { Dictionary };

const DICTIONARIES: Record<TargetLanguage, Dictionary> = { pt, es };

export function getDictionary(lang: TargetLanguage): Dictionary {
  return DICTIONARIES[lang];
}
