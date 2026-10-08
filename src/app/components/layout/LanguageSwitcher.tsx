"use client";

import { useLanguage } from "@/hooks/useLanguage";
import { LANGUAGES, TARGET_LANGUAGES } from "@/lib/i18n/languages";

/** Segmented PT / ES pill in the nav that switches the target language. */
export function LanguageSwitcher() {
  const { lang, t, setLanguage } = useLanguage();

  return (
    <div
      role="group"
      aria-label={t.nav.languageSwitch}
      className="flex items-center rounded-full p-[3px]"
      style={{ border: "1px solid var(--border2)" }}
    >
      {TARGET_LANGUAGES.map((code) => {
        const active = code === lang;
        const info = LANGUAGES[code];
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLanguage(code)}
            aria-pressed={active}
            title={t.languageNames[code]}
            className="flex items-center gap-1.5 rounded-full px-2.5 py-[4px] text-[12.5px] font-semibold transition-colors"
            style={
              active
                ? { background: "var(--accent)", color: "white" }
                : { color: "var(--muted)" }
            }
          >
            <span aria-hidden>{info.flag}</span>
            {info.tag}
          </button>
        );
      })}
    </div>
  );
}
