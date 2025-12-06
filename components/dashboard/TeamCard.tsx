'use client';

import { useState, useEffect } from 'react';
import { formatShortDate, formatTime } from '@/lib/utils/timezone';
import { getTeamScheduleUrl, getTeamPageUrl } from '@/lib/utils/team-urls';
import type { UserTeam } from '@/types/database';

interface TeamCardProps {
  team: UserTeam;
  onRemove: (teamId: string) => void;
}

export default function TeamCard({ team, onRemove }: TeamCardProps) {
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSchedule();
  }, [team.id]);

  const fetchSchedule = async () => {
    try {
      const response = await fetch(`/api/teams/${team.id}/schedule`);
      if (response.ok) {
        const data = await response.json();
        setSchedule(data.schedule || []);
      }
    } catch (error) {
      console.error('Error fetching schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const categorizeGames = () => {
    const now = new Date();
    const past: any[] = [];
    const upcoming: any[] = [];
    const live: any[] = [];

    schedule.forEach((game: any) => {
      const startTime = game.date || game.scheduled_at || game.begin_at;
      if (!startTime) return;

      // Use API status first, then fall back to date-based logic
      const apiStatus = game.status?.toLowerCase?.() || '';
      const hasScores = (game.homeScore !== null && game.homeScore !== undefined) ||
                        (game.home_score !== null && game.home_score !== undefined);

      // Determine game status from API data
      let status: 'live' | 'past' | 'upcoming';
      if (apiStatus.includes('live') || apiStatus.includes('progress') || apiStatus.includes('playing')) {
        status = 'live';
      } else if (apiStatus.includes('final') || apiStatus.includes('completed') || apiStatus.includes('finished') || hasScores) {
        status = 'past';
      } else {
        // Fall back to date-based logic for scheduled games
        const gameDate = new Date(startTime);
        status = gameDate < now ? 'past' : 'upcoming';
      }

      if (status === 'live') {
        live.push(game);
      } else if (status === 'past') {
        past.push(game);
      } else {
        upcoming.push(game);
      }
    });

    return { past: past.slice(-3), upcoming: upcoming.slice(0, 3), live };
  };

  const { past, upcoming, live } = categorizeGames();
  const displayGames = [...past, ...live, ...upcoming];

  const teamData = team.team_data as any;

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6 hover:border-white/40 transition-all">
      {/* Team Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          {teamData.logo && (
            <img
              src={teamData.logo}
              alt={teamData.name}
              className="w-12 h-12 object-contain rounded"
            />
          )}
          <div>
            <h3 className="text-xl font-bold text-white">{teamData.name}</h3>
            <p className="text-sm text-slate-400">{teamData.league_name}</p>
          </div>
        </div>
        <button
          onClick={() => onRemove(team.id)}
          className="p-2 hover:bg-red-500/20 rounded-lg transition-colors group"
          title="Remove team"
        >
          <svg
            className="w-5 h-5 text-slate-400 group-hover:text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Schedule */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">
          Schedule
        </h4>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
          </div>
        ) : displayGames.length > 0 ? (
          <>
            <div className="space-y-2">
              {displayGames.map((game: any, idx: number) => {
                const startTime = game.date || game.scheduled_at || game.begin_at;

                // Extract team names and scores
                const homeTeam = game.homeTeam || game.home_team?.name || game.opponents?.[0]?.opponent?.name || 'TBD';
                const awayTeam = game.awayTeam || game.away_team?.name || game.opponents?.[1]?.opponent?.name || 'TBD';
                const homeScore = game.homeScore ?? game.home_score ?? game.scores?.[0];
                const awayScore = game.awayScore ?? game.away_score ?? game.scores?.[1];

                // Use API status to determine game state
                const apiStatus = game.status?.toLowerCase?.() || '';
                const hasScores = homeScore !== undefined && homeScore !== null &&
                                  awayScore !== undefined && awayScore !== null;

                // Determine display status from API data
                let status: 'live' | 'past' | 'upcoming';
                if (apiStatus.includes('live') || apiStatus.includes('progress') || apiStatus.includes('playing')) {
                  status = 'live';
                } else if (apiStatus.includes('final') || apiStatus.includes('completed') || apiStatus.includes('finished') || hasScores) {
                  status = 'past';
                } else {
                  const gameDate = new Date(startTime);
                  status = gameDate < new Date() ? 'past' : 'upcoming';
                }

                // Debug logging for first game
                if (idx === 0 && schedule.length > 0) {
                  console.log('[TeamCard] First game data:', {
                    homeTeam,
                    awayTeam,
                    homeScore,
                    awayScore,
                    winner: game.winner,
                    status,
                    rawStatus: game.status,
                    hasScores
                  });
                }

                // Use calculated winner from API or calculate it
                const winner = game.winner || (hasScores ?
                  (homeScore > awayScore ? 'home' : awayScore > homeScore ? 'away' : 'tie')
                  : null);

                const homeWon = winner === 'home';
                const awayWon = winner === 'away';
                const isTie = winner === 'tie';
                const isFinishedGame = hasScores && status !== 'live'; // Show scores for any non-live game with scores

                // Check if this is user's team
                const userTeamName = teamData.name;
                const isHomeTeam = homeTeam.toLowerCase().includes(userTeamName.toLowerCase()) ||
                                   userTeamName.toLowerCase().includes(homeTeam.toLowerCase());
                const isAwayTeam = awayTeam.toLowerCase().includes(userTeamName.toLowerCase()) ||
                                   userTeamName.toLowerCase().includes(awayTeam.toLowerCase());
                const userWon = (isHomeTeam && homeWon) || (isAwayTeam && awayWon);
                const userLost = (isHomeTeam && awayWon) || (isAwayTeam && homeWon);

                return (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border ${
                      status === 'live'
                        ? 'bg-green-500/20 border-green-500/50'
                        : isFinishedGame && userWon
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : isFinishedGame && userLost
                        ? 'bg-red-500/10 border-red-500/30'
                        : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex-1">
                        {isFinishedGame ? (
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1">
                              <span className={`text-sm ${homeWon ? 'text-white font-bold' : 'text-slate-400'}`}>
                                {homeTeam}
                              </span>
                              <span className={`text-sm font-bold ${homeWon ? 'text-emerald-400' : 'text-slate-300'}`}>
                                {homeScore}
                              </span>
                            </div>
                            <span className="text-slate-500 text-xs">-</span>
                            <div className="flex items-center gap-2 flex-1 justify-end">
                              <span className={`text-sm font-bold ${awayWon ? 'text-emerald-400' : 'text-slate-300'}`}>
                                {awayScore}
                              </span>
                              <span className={`text-sm ${awayWon ? 'text-white font-bold' : 'text-slate-400'}`}>
                                {awayTeam}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-white text-sm font-medium">
                            {homeTeam} vs {awayTeam}
                          </p>
                        )}
                      </div>
                      {status === 'live' && (
                        <span className="ml-2 px-2 py-1 bg-green-500 text-white text-xs font-bold rounded">
                          LIVE
                        </span>
                      )}
                      {isFinishedGame && (
                        <span className={`ml-2 px-2 py-1 text-xs font-bold rounded ${
                          userWon
                            ? 'bg-emerald-500 text-white'
                            : userLost
                            ? 'bg-red-500 text-white'
                            : isTie
                            ? 'bg-slate-500 text-white'
                            : 'bg-slate-600 text-white'
                        }`}>
                          {userWon ? 'W' : userLost ? 'L' : isTie ? 'T' : 'F'}
                        </span>
                      )}
                    </div>
                    <div className="flex justify-between items-center text-xs text-slate-400">
                      <span>{formatShortDate(startTime)} at {formatTime(startTime)}</span>
                      {status === 'live' && hasScores && (
                        <span className="font-semibold text-white">
                          {homeScore} - {awayScore}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <p className="text-slate-400 text-sm text-center py-4">
            No games scheduled
          </p>
        )}
      </div>

      {/* Official Links */}
      <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
        {/* Team Page Link */}
        {teamData.name && team.league_type && (
          <a
            href={getTeamPageUrl(teamData.name, team.league_type as any) || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            <span>View Team Page</span>
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        )}

        {/* Schedule Link (Traditional Sports Only) */}
        {teamData.abbreviation && team.league_type && ['nba', 'nfl', 'mlb', 'nhl'].includes(team.league_type) && (
          <a
            href={getTeamScheduleUrl(teamData.abbreviation, team.league_type as any) || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-slate-300 transition-colors"
          >
            <span>Full Schedule</span>
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        )}
      </div>
    </div>
  );
}
