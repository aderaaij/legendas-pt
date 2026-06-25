import { useState } from "react";
import { ChevronDown, Heart } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

export type SortOption =
  | "none"
  | "alphabetical"
  | "reverse-alphabetical"
  | "progress-high"
  | "progress-low";
export type FilterOption = "all" | "favorites";

interface PhraseSortAndFilterProps {
  onSortChange: (sort: SortOption) => void;
  onFilterChange: (filter: FilterOption) => void;
  currentSort: SortOption;
  currentFilter: FilterOption;
  totalPhrases: number;
  filteredPhrases: number;
}

export const PhraseSortAndFilter = ({
  onSortChange,
  onFilterChange,
  currentSort,
  currentFilter,
}: PhraseSortAndFilterProps) => {
  const { isAuthenticated } = useAuth();
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);

  const sortOptions = [
    { value: "none" as const, label: "Ordem original" },
    { value: "alphabetical" as const, label: "A-Z" },
    { value: "reverse-alphabetical" as const, label: "Z-A" },
    ...(isAuthenticated
      ? [
          { value: "progress-high" as const, label: "Mais progresso" },
          { value: "progress-low" as const, label: "Menos progresso" },
        ]
      : []),
  ];

  const currentSortLabel =
    sortOptions.find((option) => option.value === currentSort)?.label ||
    "Ordem original";

  const pillBase =
    "rounded-lg px-4 py-2 text-[13px] font-bold transition-colors cursor-pointer";

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Sort */}
      <div
        className="flex items-center gap-2 rounded-[9px] py-[7px] pl-[14px] pr-2 text-[13px]"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          color: "var(--muted)",
        }}
      >
        <span>Ordenar</span>
        <div className="relative">
          <button
            onClick={() => setSortDropdownOpen((v) => !v)}
            className="flex items-center gap-[6px] rounded-md px-[10px] py-[5px] font-semibold"
            style={{ background: "var(--surface2)", color: "var(--text)" }}
          >
            {currentSortLabel}
            <ChevronDown className="h-3 w-3" />
          </button>
          {sortDropdownOpen && (
            <div
              className="absolute left-0 top-full z-20 mt-1 w-full min-w-[160px] overflow-hidden rounded-md shadow-lg"
              style={{ background: "var(--surface2)", border: "1px solid var(--border2)" }}
            >
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onSortChange(option.value);
                    setSortDropdownOpen(false);
                  }}
                  className="block w-full px-3 py-2 text-left text-[13px] transition-colors hover:opacity-80"
                  style={{
                    color:
                      currentSort === option.value ? "var(--accent2)" : "var(--muted)",
                    background:
                      currentSort === option.value
                        ? "rgba(229,9,20,.12)"
                        : "transparent",
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Filter (authenticated only) */}
      {isAuthenticated && (
        <div className="flex gap-[6px]">
          <button
            onClick={() => onFilterChange("all")}
            className={pillBase}
            style={
              currentFilter === "all"
                ? { background: "var(--accent)", color: "#fff" }
                : {
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    color: "var(--muted)",
                  }
            }
          >
            Todas
          </button>
          <button
            onClick={() => onFilterChange("favorites")}
            className={`${pillBase} flex items-center gap-[6px]`}
            style={
              currentFilter === "favorites"
                ? { background: "var(--accent)", color: "#fff" }
                : {
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    color: "var(--muted)",
                  }
            }
          >
            <Heart
              className="h-[13px] w-[13px]"
              fill={currentFilter === "favorites" ? "currentColor" : "none"}
            />
            Favoritas
          </button>
        </div>
      )}
    </div>
  );
};
