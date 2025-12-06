'use client';

import { useState, useEffect, useRef } from 'react';
import type { TeamSearchResult } from '@/lib/api/unified-api';

interface SearchBarProps {
  onAddTeam: (team: TeamSearchResult) => void;
  disabled?: boolean;
}

export default function SearchBar({ onAddTeam, disabled }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TeamSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  // Debounced search effect
  useEffect(() => {
    // Clear previous timeout
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }

    // If query is less than 2 characters, clear results
    if (query.length < 2) {
      setResults([]);
      setShowResults(false);
      setLoading(false);
      return;
    }

    // Show loading immediately
    setLoading(true);

    // Set new timeout for search
    debounceTimeout.current = setTimeout(async () => {
      try {
        const response = await fetch('/api/teams/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        });

        if (response.ok) {
          const data = await response.json();
          setResults(data.results || []);
          setShowResults(true);
        } else {
          console.error('Search failed:', response.status, response.statusText);
          setResults([]);
          setShowResults(false);
        }
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
        setShowResults(false);
      } finally {
        setLoading(false);
      }
    }, 500); // Wait 500ms after user stops typing

    // Cleanup function
    return () => {
      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
    };
  }, [query]);

  const handleSelectTeam = (team: TeamSearchResult) => {
    onAddTeam(team);
    setQuery('');
    setResults([]);
    setShowResults(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for teams (NBA, NFL, LoL, CS:GO, etc.)"
          disabled={disabled}
          className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        )}
      </div>

      {showResults && results.length > 0 && (
        <div className="absolute z-10 w-full mt-2 bg-slate-800 border border-white/20 rounded-lg shadow-2xl max-h-96 overflow-y-auto">
          {results.map((team) => (
            <button
              key={`${team.leagueType}-${team.id}`}
              onClick={() => handleSelectTeam(team)}
              className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/10 transition-colors text-left"
            >
              {team.logo && (
                <img
                  src={team.logo}
                  alt={team.name}
                  className="w-10 h-10 object-contain rounded"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold truncate">{team.name}</p>
                <p className="text-slate-400 text-sm">{team.leagueName}</p>
              </div>
              <span className="text-xs text-slate-500 uppercase">{team.leagueType}</span>
            </button>
          ))}
        </div>
      )}

      {showResults && results.length === 0 && !loading && query.length >= 2 && (
        <div className="absolute z-10 w-full mt-2 bg-slate-800 border border-white/20 rounded-lg shadow-2xl p-4">
          <p className="text-slate-400 text-center">No teams found for "{query}"</p>
        </div>
      )}
    </div>
  );
}
