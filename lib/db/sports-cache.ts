/**
 * Database Service Layer for Sports Data Caching
 * Handles CRUD operations for game cache, standings cache, etc.
 * Implements aggressive caching strategy to minimize API requests
 */

import { createClient } from '@/lib/supabase/server';
import type { LeagueType } from '@/types/database';

export interface CachedGame {
  id: number;
  game_id: string;
  league_type: LeagueType;
  team_id: string | null; // API team ID (string reference, not FK)
  game_date: string;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  status: 'scheduled' | 'live' | 'final' | 'postponed';
  is_final: boolean;
  venue: string | null;
  game_data: any;
  cached_at: string;
  updated_at: string;
}

export interface CachedStandings {
  id: number;
  league_type: LeagueType;
  season: string;
  team_name: string;
  rank: number;
  wins: number;
  losses: number;
  ties: number | null;
  points: number | null;
  win_pct: number | null;
  games_back: number | null;
  standings_data: any;
  cached_at: string;
}

// Cache TTL constants (in milliseconds)
const TTL = {
  FINAL_GAME: Infinity, // Never expire final games
  LIVE_GAME: 2 * 60 * 1000, // 2 minutes
  SCHEDULED_GAME_TODAY: 60 * 60 * 1000, // 1 hour
  SCHEDULED_GAME_FUTURE: Infinity, // Until game day
  STANDINGS: 24 * 60 * 60 * 1000, // 24 hours
  TEAM_INFO: 7 * 24 * 60 * 60 * 1000, // 7 days
};

/**
 * Get games for a team from cache
 */
export async function getTeamGamesFromCache(
  teamId: string,
  leagueType: LeagueType
): Promise<CachedGame[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('game_cache')
    .select('*')
    .eq('team_id', teamId)
    .eq('league_type', leagueType)
    .order('game_date', { ascending: true });

  if (error) {
    console.error('[Sports Cache] Error fetching games:', error);
    return [];
  }

  return data || [];
}

/**
 * Get a specific game by game_id
 */
export async function getGameFromCache(gameId: string): Promise<CachedGame | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('game_cache')
    .select('*')
    .eq('game_id', gameId)
    .single();

  if (error) {
    console.error('[Sports Cache] Error fetching game:', error);
    return null;
  }

  return data;
}

/**
 * Check if games exist in cache by IDs
 * Returns Set of game IDs that exist and are final (no refresh needed)
 */
export async function getExistingFinalGameIds(
  gameIds: string[],
  leagueType: LeagueType
): Promise<Set<string>> {
  if (gameIds.length === 0) return new Set();

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('game_cache')
    .select('game_id')
    .in('game_id', gameIds)
    .eq('league_type', leagueType)
    .eq('is_final', true);

  if (error) {
    console.error('[Sports Cache] Error checking existing games:', error);
    return new Set();
  }

  return new Set((data || []).map(g => g.game_id));
}

/**
 * Check if team schedule was recently fetched (within TTL)
 */
export async function hasRecentTeamSchedule(
  teamId: string,
  leagueType: LeagueType,
  ttlMs: number = 60 * 60 * 1000 // default 1 hour
): Promise<boolean> {
  const supabase = await createClient();

  const cutoff = new Date(Date.now() - ttlMs).toISOString();

  const { data, error } = await supabase
    .from('game_cache')
    .select('updated_at')
    .eq('team_id', teamId)
    .eq('league_type', leagueType)
    .gte('updated_at', cutoff)
    .limit(1);

  if (error) {
    console.error('[Sports Cache] Error checking recent schedule:', error);
    return false;
  }

  return (data?.length || 0) > 0;
}

/**
 * Save games to cache (upsert)
 */
export async function saveGamesToCache(games: Partial<CachedGame>[]): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('game_cache')
    .upsert(
      games.map(game => ({
        ...game,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: 'game_id' }
    );

  if (error) {
    console.error('[Sports Cache] Error saving games:', error);
  }
}

/**
 * Mark a game as final (will never be updated again)
 */
export async function markGameAsFinal(gameId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('game_cache')
    .update({
      is_final: true,
      status: 'final',
      updated_at: new Date().toISOString(),
    })
    .eq('game_id', gameId);

  if (error) {
    console.error('[Sports Cache] Error marking game final:', error);
  }
}

/**
 * Check if a game needs to be refreshed from API
 */
export function shouldRefreshGame(game: CachedGame): boolean {
  // Refresh final games that have no scores (data was cached before score extraction fix)
  if (game.is_final && game.home_score === null && game.away_score === null) {
    return true;
  }

  // Never refresh final games that have scores
  if (game.is_final) {
    return false;
  }

  const now = new Date();
  const updatedAt = new Date(game.updated_at);
  const gameDate = new Date(game.game_date);
  const timeSinceUpdate = now.getTime() - updatedAt.getTime();

  // Live games: refresh if older than 2 minutes
  if (game.status === 'live') {
    return timeSinceUpdate > TTL.LIVE_GAME;
  }

  // Scheduled games on game day: refresh if older than 1 hour
  const isToday =
    gameDate.getUTCFullYear() === now.getUTCFullYear() &&
    gameDate.getUTCMonth() === now.getUTCMonth() &&
    gameDate.getUTCDate() === now.getUTCDate();

  if (game.status === 'scheduled' && isToday) {
    return timeSinceUpdate > TTL.SCHEDULED_GAME_TODAY;
  }

  // Future games: don't refresh
  if (gameDate > now) {
    return false;
  }

  // Past games that aren't marked final: refresh once
  return game.status !== 'final';
}

/**
 * Get standings from cache
 */
export async function getStandingsFromCache(
  leagueType: LeagueType,
  season: string
): Promise<CachedStandings[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('standings_cache')
    .select('*')
    .eq('league_type', leagueType)
    .eq('season', season)
    .order('rank', { ascending: true });

  if (error) {
    console.error('[Sports Cache] Error fetching standings:', error);
    return [];
  }

  return data || [];
}

/**
 * Check if standings cache is fresh (< 24 hours old)
 */
export function shouldRefreshStandings(standings: CachedStandings[]): boolean {
  if (standings.length === 0) {
    return true;
  }

  const now = new Date();
  const cachedAt = new Date(standings[0].cached_at);
  const timeSinceCache = now.getTime() - cachedAt.getTime();

  return timeSinceCache > TTL.STANDINGS;
}

/**
 * Save standings to cache
 */
export async function saveStandingsToCache(
  standings: Partial<CachedStandings>[]
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('standings_cache')
    .upsert(standings, {
      onConflict: 'league_type,season,team_name',
    });

  if (error) {
    console.error('[Sports Cache] Error saving standings:', error);
  }
}

/**
 * Get today's live games across all teams
 */
export async function getTodaysGamesFromCache(
  leagueType?: LeagueType
): Promise<CachedGame[]> {
  const supabase = await createClient();

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  let query = supabase
    .from('game_cache')
    .select('*')
    .gte('game_date', today.toISOString())
    .lt('game_date', tomorrow.toISOString())
    .order('game_date', { ascending: true });

  if (leagueType) {
    query = query.eq('league_type', leagueType);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[Sports Cache] Error fetching todays games:', error);
    return [];
  }

  return data || [];
}

/**
 * Get live games that need updating
 */
export async function getLiveGamesToUpdate(): Promise<CachedGame[]> {
  const supabase = await createClient();

  const twoMinutesAgo = new Date(Date.now() - TTL.LIVE_GAME);

  const { data, error } = await supabase
    .from('game_cache')
    .select('*')
    .eq('status', 'live')
    .eq('is_final', false)
    .lt('updated_at', twoMinutesAgo.toISOString());

  if (error) {
    console.error('[Sports Cache] Error fetching live games:', error);
    return [];
  }

  return data || [];
}

/**
 * Check if sports data has been seeded
 */
export async function isSportsDataSeeded(): Promise<boolean> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('app_config')
    .select('value')
    .eq('key', 'sports_data_seeded')
    .maybeSingle();

  if (error) {
    console.error('[Sports Cache] Error checking seed status:', error);
    return false;
  }

  return data?.value === 'true';
}

/**
 * Mark sports data as seeded
 */
export async function markSportsDataSeeded(): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('app_config')
    .upsert({
      key: 'sports_data_seeded',
      value: 'true',
      updated_at: new Date().toISOString()
    });

  if (error) {
    console.error('[Sports Cache] Error marking seeded:', error);
  }
}

/**
 * Update team schedule cache timestamp
 */
export async function updateTeamCacheTimestamp(teamId: number): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('teams')
    .update({ schedule_cached_at: new Date().toISOString() })
    .eq('id', teamId);

  if (error) {
    console.error('[Sports Cache] Error updating cache timestamp:', error);
  }
}

/**
 * Delete old non-final games (cleanup)
 */
export async function cleanupOldGames(): Promise<void> {
  const supabase = await createClient();

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const { error } = await supabase
    .from('game_cache')
    .delete()
    .eq('is_final', false)
    .lt('game_date', sixMonthsAgo.toISOString());

  if (error) {
    console.error('[Sports Cache] Error cleaning up old games:', error);
  }
}

/**
 * Clean up finished games older than specified days
 * @param days - Number of days (default 7)
 */
export async function cleanupFinishedGames(days: number = 7): Promise<void> {
  const supabase = await createClient();

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const { error } = await supabase
    .from('game_cache')
    .delete()
    .eq('is_final', true)
    .lt('game_date', cutoffDate.toISOString());

  if (error) {
    console.error('[Sports Cache] Error cleaning up finished games:', error);
  } else {
    console.log(`[Sports Cache] Cleaned up finished games older than ${days} days`);
  }
}

/**
 * Clean up standings from non-current seasons
 * @param currentSeasons - Map of league type to current season string
 */
export async function cleanupOldStandings(
  currentSeasons: { nba: string; nfl: string; mlb: string; nhl: string }
): Promise<void> {
  const supabase = await createClient();

  for (const [leagueType, currentSeason] of Object.entries(currentSeasons)) {
    const { error } = await supabase
      .from('standings_cache')
      .delete()
      .eq('league_type', leagueType)
      .neq('season', currentSeason);

    if (error) {
      console.error(`[Sports Cache] Error cleaning up old ${leagueType} standings:`, error);
    } else {
      console.log(`[Sports Cache] Cleaned up old ${leagueType} standings (keeping ${currentSeason})`);
    }
  }
}
