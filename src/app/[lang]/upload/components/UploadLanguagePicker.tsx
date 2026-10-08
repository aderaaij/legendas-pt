"use client";

import {
  LANGUAGES,
  TARGET_LANGUAGES,
  type TargetLanguage,
} from "@/lib/i18n/languages";

interface UploadLanguagePickerProps {
  value: TargetLanguage;
  onChange: (language: TargetLanguage) => void;
}

/** Which language an uploaded subtitle file is in. */
export default function UploadLanguagePicker({
  value,
  onChange,
}: UploadLanguagePickerProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-sm font-medium" style={{ color: "var(--muted)" }}>
        Subtitle language
      </span>
      <div
        role="radiogroup"
        aria-label="Subtitle language"
        className="flex rounded-lg p-1"
        style={{ border: "1px solid var(--border2)" }}
      >
        {TARGET_LANGUAGES.map((code) => {
          const active = code === value;
          const info = LANGUAGES[code];
          return (
            <button
              key={code}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(code)}
              className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors"
              style={
                active
                  ? { background: "var(--accent)", color: "white" }
                  : { color: "var(--muted)" }
              }
            >
              <span aria-hidden>{info.flag}</span>
              {info.englishName}
            </button>
          );
        })}
      </div>
    </div>
  );
}
