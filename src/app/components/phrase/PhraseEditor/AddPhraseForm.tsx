"use client";

import { FormField } from "@/app/components/ui/FormField";
import { LANGUAGES, type TargetLanguage } from "@/lib/i18n/languages";

interface NewPhrase {
  phrase: string;
  translation: string;
}

interface AddPhraseFormProps {
  newPhrase: NewPhrase;
  /** The phrases' (content) language. */
  language: TargetLanguage;
  saving: boolean;
  onChange: (patch: Partial<NewPhrase>) => void;
  onAdd: () => void;
  onCancel: () => void;
}

/** Inline form for adding a new target-language/English phrase to the extraction. */
export default function AddPhraseForm({
  newPhrase,
  language,
  saving,
  onChange,
  onAdd,
  onCancel,
}: AddPhraseFormProps) {
  const languageName = LANGUAGES[language].englishShortName;

  return (
    <div
      className="rounded-lg p-4"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      <h3 className="font-semibold mb-3" style={{ color: "var(--text)" }}>
        Add New Phrase
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <FormField
          label={`${languageName} Phrase *`}
          value={newPhrase.phrase}
          onChange={(phrase) => onChange({ phrase })}
          placeholder={`Enter ${languageName} phrase...`}
        />
        <FormField
          label="English Translation *"
          value={newPhrase.translation}
          onChange={(translation) => onChange({ translation })}
          placeholder="Enter English translation..."
        />
      </div>
      <div className="flex items-center space-x-2 mt-3">
        <button
          onClick={onAdd}
          disabled={saving}
          className="px-4 py-2 rounded-md disabled:opacity-50 transition-colors"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          {saving ? "Adding..." : "Add Phrase"}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-md transition-colors"
          style={{
            background: "var(--surface2)",
            border: "1px solid var(--border2)",
            color: "var(--text)",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
