'use client';

import { useState, useEffect } from 'react';
import { signOut } from '@/lib/auth/actions';
import SearchBar from './SearchBar';
import TeamCard from './TeamCard';
import LiveGamesBanner from './LiveGamesBanner';
import RateLimitBanner from './RateLimitBanner';
import type { TeamSearchResult } from '@/lib/api/unified-api';
import type { UserTeam } from '@/types/database';

interface DashboardContentProps {
  user: {
    id: string;
    email?: string;
  };
}

export default function DashboardContent({ user }: DashboardContentProps) {
  const [teams, setTeams] = useState<UserTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState({ current: 0, total: 0 });
  const [rateLimitResetAt, setRateLimitResetAt] = useState<Date | null>(null);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const response = await fetch('/api/teams');
      if (response.ok) {
        const data = await response.json();
        setTeams(data.teams || []);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
      setError('Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTeam = async (team: TeamSearchResult) => {
    if (teams.length >= 10) {
      setError('Maximum 10 teams allowed');
      setTimeout(() => setError(null), 3000);
      return;
    }

    try {
      const response = await fetch('/api/teams/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamApiId: team.id,
          leagueType: team.leagueType,
          teamData: {
            name: team.name,
            logo: team.logo,
            league_name: team.leagueName,
          },
        }),
      });

      if (response.ok) {
        await fetchTeams();
      } else if (response.status === 429) {
        const data = await response.json();
        if (data.resetAt) {
          setRateLimitResetAt(new Date(data.resetAt));
        }
        setError(data.message || 'Too many requests. Please wait before trying again.');
        setTimeout(() => setError(null), 5000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to add team');
        setTimeout(() => setError(null), 3000);
      }
    } catch (error) {
      console.error('Error adding team:', error);
      setError('Failed to add team');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleRemoveTeam = async (teamId: string) => {
    try {
      const response = await fetch(`/api/teams/${teamId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setTeams(teams.filter((t) => t.id !== teamId));
      } else if (response.status === 429) {
        const data = await response.json();
        if (data.resetAt) {
          setRateLimitResetAt(new Date(data.resetAt));
        }
        setError(data.message || 'Too many requests. Please wait before trying again.');
        setTimeout(() => setError(null), 5000);
      } else {
        setError('Failed to remove team');
        setTimeout(() => setError(null), 3000);
      }
    } catch (error) {
      console.error('Error removing team:', error);
      setError('Failed to remove team');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleRefreshAll = async () => {
    const isRateLimited = !!(rateLimitResetAt && rateLimitResetAt > new Date());
    if (refreshing || teams.length === 0 || isRateLimited) return;

    setRefreshing(true);
    setRefreshProgress({ current: 0, total: teams.length });

    try {
      let completed = 0;
      const results = await Promise.allSettled(
        teams.map(async (team) => {
          const response = await fetch(`/api/teams/${team.id}/schedule?force=true`);
          if (response.status === 429) {
            const data = await response.json();
            if (data.resetAt) {
              setRateLimitResetAt(new Date(data.resetAt));
            }
            throw new Error(data.message || 'Rate limit exceeded');
          }
          completed++;
          setRefreshProgress({ current: completed, total: teams.length });
        })
      );

      // Check if any requests were rate limited
      const rateLimitError = results.find(r => r.status === 'rejected' && r.reason?.message?.includes('Rate limit'));
      if (rateLimitError) {
        setError('Rate limit exceeded. Please wait before refreshing again.');
        setTimeout(() => setError(null), 5000);
        setRefreshing(false);
        setRefreshProgress({ current: 0, total: 0 });
        return;
      }

      // Trigger re-render of team cards by forcing a refresh
      window.location.reload();
    } catch (error) {
      console.error('Error refreshing teams:', error);
      setError('Failed to refresh schedules');
      setTimeout(() => setError(null), 3000);
    } finally {
      setRefreshing(false);
      setRefreshProgress({ current: 0, total: 0 });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Navigation */}
      <nav className="bg-white/10 backdrop-blur-lg border-b border-white/20 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-white">MySquad</h1>
            <div className="flex items-center gap-4">
              <span className="text-slate-300 text-sm hidden sm:inline">{user.email}</span>
              <form action={signOut}>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  Sign Out
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Toast */}
        {error && (
          <div className="fixed top-20 right-4 z-50 bg-red-500/90 backdrop-blur-lg text-white px-6 py-3 rounded-lg shadow-xl animate-slide-in">
            {error}
          </div>
        )}

        {/* Rate Limit Banner */}
        <RateLimitBanner resetAt={rateLimitResetAt} />

        {/* Live Games Banner */}
        {teams.length > 0 && <LiveGamesBanner />}

        {/* Search Bar */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white">My Teams</h2>
              <p className="text-slate-400 text-sm">
                {teams.length}/10 teams added
              </p>
            </div>
            {teams.length > 0 && (() => {
              const isRateLimited = !!(rateLimitResetAt && rateLimitResetAt > new Date());
              return (
                <button
                  onClick={handleRefreshAll}
                  disabled={refreshing || isRateLimited}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  {isRateLimited ? (
                    <span>Rate Limited</span>
                  ) : refreshing ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Refreshing {refreshProgress.current}/{refreshProgress.total}</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Refresh All</span>
                    </>
                  )}
                </button>
              );
            })()}
          </div>
          <SearchBar onAddTeam={handleAddTeam} disabled={teams.length >= 10} />
          {teams.length >= 10 && (
            <p className="text-yellow-400 text-sm mt-2">
              Maximum team limit reached. Remove a team to add more.
            </p>
          )}
        </div>

        {/* Teams Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        ) : teams.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team) => (
              <TeamCard key={team.id} team={team} onRemove={handleRemoveTeam} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-12 border border-white/20 max-w-md mx-auto">
              <svg
                className="w-16 h-16 mx-auto mb-4 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <h3 className="text-xl font-bold text-white mb-2">No Teams Yet</h3>
              <p className="text-slate-400">
                Search for your favorite teams above and add them to your dashboard!
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
