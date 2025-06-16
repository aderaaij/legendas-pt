"use client";

import { useState, useEffect } from "react";

interface ClientDateProps {
  dateString: string;
  className?: string;
}

export const ClientDate = ({ dateString, className }: ClientDateProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return a stable server-side render - just the raw date or a simple format
    const date = new Date(dateString);
    return (
      <span className={className}>
        {date.toISOString().split('T')[0]} {/* YYYY-MM-DD format */}
      </span>
    );
  }

  // Client-side render with locale-specific formatting
  return (
    <span className={className}>
      {new Date(dateString).toLocaleDateString()}
    </span>
  );
};