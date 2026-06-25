"use client";

import type { CSSProperties, ReactNode } from "react";

/** Shared input styling used across form controls in the app's dark theme. */
export const fieldInputClassName = "w-full px-3 py-2 rounded-md focus:outline-none";
export const fieldInputStyle: CSSProperties = {
  background: "var(--bg2)",
  border: "1px solid var(--border)",
  color: "var(--text)",
};

interface FieldLabelProps {
  children: ReactNode;
  icon?: ReactNode;
}

/** A form label matching the app's muted style, optionally with a leading icon. */
export function FieldLabel({ children, icon }: FieldLabelProps) {
  return (
    <label
      className={`block text-sm font-medium mb-1${
        icon ? " flex items-center gap-1" : ""
      }`}
      style={{ color: "var(--muted)" }}
    >
      {icon}
      {children}
    </label>
  );
}

interface FormFieldProps {
  label: ReactNode;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  min?: string | number;
  icon?: ReactNode;
  hint?: ReactNode;
}

/** Labeled single-line input with the shared field styling. `onChange`
 * receives the raw string value; callers parse it (e.g. for number fields). */
export function FormField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  min,
  icon,
  hint,
}: FormFieldProps) {
  return (
    <div>
      <FieldLabel icon={icon}>{label}</FieldLabel>
      <input
        type={type}
        value={value}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={fieldInputClassName}
        style={fieldInputStyle}
      />
      {hint && (
        <p className="text-xs mt-1" style={{ color: "var(--faint)" }}>
          {hint}
        </p>
      )}
    </div>
  );
}

interface FormTextareaProps {
  label: ReactNode;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
}

/** Labeled multi-line textarea with the shared field styling. */
export function FormTextarea({
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
}: FormTextareaProps) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className={fieldInputClassName}
        style={fieldInputStyle}
      />
    </div>
  );
}
