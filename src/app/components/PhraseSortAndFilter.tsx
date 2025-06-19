import { useState } from 'react';
import { ArrowUpDown, Heart, HeartOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export type SortOption = 'none' | 'alphabetical' | 'reverse-alphabetical' | 'progress-high' | 'progress-low';
export type FilterOption = 'all' | 'favorites';

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
  totalPhrases,
  filteredPhrases,
}: PhraseSortAndFilterProps) => {
  const { isAuthenticated } = useAuth();
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);

  const sortOptions = [
    { value: 'none' as const, label: 'Original Order' },
    { value: 'alphabetical' as const, label: 'A-Z' },
    { value: 'reverse-alphabetical' as const, label: 'Z-A' },
    ...(isAuthenticated ? [
      { value: 'progress-high' as const, label: 'Most Progress' },
      { value: 'progress-low' as const, label: 'Least Progress' },
    ] : []),
  ];

  const getSortLabel = (sort: SortOption) => {
    return sortOptions.find(option => option.value === sort)?.label || 'Original Order';
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
      {/* Sort Controls */}
      <div className="flex items-center gap-2">
        <ArrowUpDown className="w-4 h-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-700">Sort:</span>
        <div className="relative">
          <button
            onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm"
          >
            {getSortLabel(currentSort)}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {sortDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg z-10">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onSortChange(option.value);
                    setSortDropdownOpen(false);
                  }}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors ${
                    currentSort === option.value ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Filter Controls - Only show if user is authenticated */}
      {isAuthenticated && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Filter:</span>
          <div className="flex gap-2">
            <button
              onClick={() => onFilterChange('all')}
              className={`px-3 py-2 rounded-md text-sm transition-colors ${
                currentFilter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              All
            </button>
            <button
              onClick={() => onFilterChange('favorites')}
              className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
                currentFilter === 'favorites'
                  ? 'bg-red-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {currentFilter === 'favorites' ? (
                <Heart className="w-4 h-4 fill-current" />
              ) : (
                <HeartOff className="w-4 h-4" />
              )}
              Favorites
            </button>
          </div>
        </div>
      )}

      {/* Results Summary */}
      <div className="flex items-center gap-2 ml-auto">
        <span className="text-sm text-gray-600">
          Showing {filteredPhrases} of {totalPhrases} phrases
        </span>
      </div>
    </div>
  );
};