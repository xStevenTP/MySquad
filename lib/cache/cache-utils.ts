import { createClient } from '@/lib/supabase/server';
import type { LeagueType } from '@/types/database';

const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

interface CacheOptions {
  maxAge?: number; // in milliseconds
}

/**
 * Check if cached data is still fresh
 */
export function isCacheFresh(updatedAt: string, maxAge: number = CACHE_DURATION_MS): boolean {
  const cacheTime = new Date(updatedAt).getTime();
  const now = Date.now();
  return now - cacheTime < maxAge;
}

/**
 * Get team data from cache or fetch from API
 */
export async function getCachedTeam(
  apiId: string,
  leagueType: LeagueType,
  fetchFn: () => Promise<any>,
  options: CacheOptions = {}
) {
  const supabase = await createClient();

  // Check cache first
  const { data: cached } = await supabase
    .from('teams_cache')
    .select('*')
    .eq('api_id', apiId)
    .eq('league_type', leagueType)
    .single();

  if (cached && isCacheFresh(cached.updated_at, options.maxAge)) {
    return cached.data;
  }

  // Fetch from API
  const freshData = await fetchFn();

  // Update cache
  await supabase
    .from('teams_cache')
    .upsert({
      api_id: apiId,
      league_type: leagueType,
      data: freshData,
      updated_at: new Date().toISOString(),
    });

  return freshData;
}

/**
 * Get schedule data from cache or fetch from API
 */
export async function getCachedSchedule(
  teamApiId: string,
  leagueType: LeagueType,
  fetchFn: () => Promise<any>,
  options: CacheOptions = {}
) {
  const supabase = await createClient();

  // Check cache first
  const { data: cached } = await supabase
    .from('schedules_cache')
    .select('*')
    .eq('team_api_id', teamApiId)
    .eq('league_type', leagueType)
    .single();

  if (cached && isCacheFresh(cached.updated_at, options.maxAge)) {
    return cached.games;
  }

  // Fetch from API
  const freshData = await fetchFn();

  // Update cache
  await supabase
    .from('schedules_cache')
    .upsert({
      team_api_id: teamApiId,
      league_type: leagueType,
      games: freshData,
      updated_at: new Date().toISOString(),
    });

  return freshData;
}

/**
 * Get standings data from cache or fetch from API
 */
export async function getCachedStandings(
  leagueId: string,
  leagueType: LeagueType,
  fetchFn: () => Promise<any>,
  options: CacheOptions = {}
) {
  const supabase = await createClient();

  // Check cache first
  const { data: cached } = await supabase
    .from('standings_cache')
    .select('*')
    .eq('league_id', leagueId)
    .eq('league_type', leagueType)
    .single();

  if (cached && isCacheFresh(cached.updated_at, options.maxAge)) {
    return cached.data;
  }

  // Fetch from API
  const freshData = await fetchFn();

  // Update cache
  await supabase
    .from('standings_cache')
    .upsert({
      league_id: leagueId,
      league_type: leagueType,
      data: freshData,
      updated_at: new Date().toISOString(),
    });

  return freshData;
}

/**
 * Invalidate cache for a specific resource
 */
export async function invalidateCache(
  table: 'teams_cache' | 'schedules_cache' | 'standings_cache',
  id: string
) {
  const supabase = await createClient();

  let query;
  switch (table) {
    case 'teams_cache':
      query = supabase.from(table).delete().eq('api_id', id);
      break;
    case 'schedules_cache':
      query = supabase.from(table).delete().eq('team_api_id', id);
      break;
    case 'standings_cache':
      query = supabase.from(table).delete().eq('league_id', id);
      break;
  }

  await query;
}
