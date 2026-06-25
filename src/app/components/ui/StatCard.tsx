"use client";

import type { ReactNode } from "react";

interface StatCardProps {
  /** Pre-colored icon element shown beside the value. */
  icon: ReactNode;
  value: ReactNode;
  label: string;
  /** Color for the value text (e.g. "var(--blue)"). */
  color: string;
}

/** Compact metric card: a colored icon next to a bold value and a muted label. */
export default function StatCard({ icon, value, label, color }: StatCardProps) {
  return (
    <div
      className="p-4 rounded-[var(--radius)]"
      style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center space-x-2">
        {icon}
        <div>
          <p className="text-lg font-bold" style={{ color }}>
            {value}
          </p>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}
