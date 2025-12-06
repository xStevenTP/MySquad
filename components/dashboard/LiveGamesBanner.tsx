'use client';

import { useState, useEffect } from 'react';
import { formatTime } from '@/lib/utils/timezone';

interface LiveGame {
  id: string;
  date: string;
  homeTeam?: string;
  awayTeam?: string;
  homeScore?: number;
  awayScore?: number;
  status: string;
  teamInfo: {
    id: string;
    name: string;
    logo?: string;
    leagueName: string;
  };
  home_team?: { name: string };
  away_team?: { name: string };
  opponents?: Array<{ opponent: { name: string } }>;
  scores?: number[];
}

export default function LiveGamesBanner() {
  const [liveGames, setLiveGames] = useState<LiveGame[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLiveGames();

    // Refresh every 30 seconds
    const interval = setInterval(fetchLiveGames, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchLiveGames = async () => {
    try {
      const response = await fetch('/api/teams/live');
      if (response.ok) {
        const data = await response.json();
        setLiveGames(data.liveGames || []);
      }
    } catch (error) {
      console.error('Error fetching live games:', error);
    } finally {
      setLoading(false);
    }
  };

  // Don't show anything if no live games
  if (!loading && liveGames.length === 0) {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/50 rounded-xl p-4 mb-6">
        <div className="flex items-center justify-center gap-2">
          <div className="animate-spin h-5 w-5 border-2 border-green-500 border-t-transparent rounded-full"></div>
          <span className="text-green-400 font-semibold">Checking for live games...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/50 rounded-xl p-6 mb-6 animate-pulse-slow">
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
        </div>
        <h3 className="text-xl font-bold text-white">
          Live Games ({liveGames.length})
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {liveGames.map((game, idx) => {
          const homeTeam = game.homeTeam || game.home_team?.name || game.opponents?.[0]?.opponent?.name || 'TBD';
          const awayTeam = game.awayTeam || game.away_team?.name || game.opponents?.[1]?.opponent?.name || 'TBD';
          const homeScore = game.homeScore ?? game.scores?.[0] ?? '-';
          const awayScore = game.awayScore ?? game.scores?.[1] ?? '-';

          return (
            <div
              key={`${game.teamInfo.id}-${idx}`}
              className="bg-white/10 backdrop-blur-lg rounded-lg p-4 border border-green-500/30 hover:border-green-500/60 transition-all"
            >
              <div className="flex items-center gap-2 mb-3">
                {game.teamInfo.logo && (
                  <img
                    src={game.teamInfo.logo}
                    alt={game.teamInfo.name}
                    className="w-6 h-6 object-contain rounded"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-green-400 font-semibold truncate">
                    {game.teamInfo.name}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {game.teamInfo.leagueName}
                  </p>
                </div>
                <span className="px-2 py-1 bg-green-500 text-white text-xs font-bold rounded animate-pulse">
                  LIVE
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-white font-medium text-sm">{homeTeam}</span>
                  <span className="text-white font-bold text-lg">{homeScore}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white font-medium text-sm">{awayTeam}</span>
                  <span className="text-white font-bold text-lg">{awayScore}</span>
                </div>
              </div>

              {game.date && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <p className="text-xs text-slate-400">
                    Started at {formatTime(game.date)}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
