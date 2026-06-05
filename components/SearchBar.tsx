'use client';

// Address search bar with autocomplete dropdown.
// Uses the geocoding abstraction layer (lib/geocoding.ts) — swap the provider there.
import { useState, useEffect, useRef, useCallback } from 'react';
import { searchAddress, GeocodingResult } from '@/lib/geocoding';
import { useTranslation } from '@/lib/languageContext';

interface SearchBarProps {
  /** Called when the user selects a result — map should fly to these coordinates */
  onFlyTo: (lat: number, lng: number) => void;
}

export default function SearchBar({ onFlyTo }: SearchBarProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Ref for the whole container — used to detect clicks outside the dropdown
  const containerRef = useRef<HTMLDivElement>(null);
  // Ref to hold the debounce timer
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Ref to hold the AbortController for the in-flight geocoding request
  const abortRef = useRef<AbortController | null>(null);

  /** Run the search against the geocoding provider */
  const runSearch = useCallback(async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    // Cancel any in-flight request before starting a new one
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      const found = await searchAddress(trimmed, abortRef.current.signal);
      setResults(found);
      setIsOpen(true);
    } catch (err) {
      // AbortError = request was superseded by a newer search — ignore silently
      if (err instanceof Error && err.name === 'AbortError') return;
      setError(t('search.loadError'));
      setResults([]);
      setIsOpen(true);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  /** Debounce input changes — search fires 500 ms after the user stops typing */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(value), 500);
  };

  /** Search immediately on Enter */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      runSearch(query);
    }
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  /** Select a result: fly the map there and close the dropdown */
  const handleSelect = (result: GeocodingResult) => {
    onFlyTo(result.lat, result.lng);
    setQuery(result.name);
    setIsOpen(false);
  };

  /** Close dropdown when clicking outside the component */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [t]);

  // Clean up debounce timer and any in-flight request on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, [t]);

  const showDropdown = isOpen && (isLoading || results.length > 0 || error !== null || query.trim().length > 0);

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Search input with magnifier icon */}
      <div className="relative">
        {/* Magnifier icon */}
        <svg
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>

        <input
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => { if (results.length > 0 || error) setIsOpen(true); }}
          placeholder={t('search.inputPlaceholder')}
          className="w-full bg-[#0f1117] text-white text-xs placeholder-gray-500 rounded-lg pl-8 pr-3 py-2 border border-gray-700 focus:outline-none focus:border-blue-500 transition-colors"
        />

        {/* Loading spinner inside input on the right */}
        {isLoading && (
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
            <div className="w-3 h-3 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-[#1a1d27] border border-gray-700 rounded-lg shadow-xl z-[2000] overflow-hidden">
          {/* Loading state */}
          {isLoading && (
            <div className="px-3 py-2 text-xs text-gray-400">
              {t('search.searching')}
            </div>
          )}

          {/* Error state */}
          {!isLoading && error && (
            <div className="px-3 py-2 text-xs text-red-400">
              {error}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !error && results.length === 0 && query.trim().length > 0 && (
            <div className="px-3 py-2 text-xs text-gray-400">
              {t('search.noResultsInline')}
            </div>
          )}

          {/* Results list */}
          {!isLoading && !error && results.map((result, index) => (
            <button
              key={result.placeId ?? index}
              onClick={() => handleSelect(result)}
              className="w-full text-left px-3 py-2 hover:bg-[#252836] transition-colors border-b border-gray-800 last:border-0"
            >
              <div className="text-white text-xs font-medium leading-tight truncate">
                {result.name}
              </div>
              <div className="text-gray-500 text-xs leading-tight truncate mt-0.5">
                {result.displayName}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
