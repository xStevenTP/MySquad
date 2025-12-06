// Highlightly API client for traditional sports
// Docs: https://highlightly.net/documentation/sports/
// Free tier: 100 requests/day

import { createClient } from '@/lib/supabase/server';
import { withRateLimit } from '@/lib/utils/api-rate-limiter';
import {
  getTeamGamesFromCache,
  saveGamesToCache,
  shouldRefreshGame,
  getStandingsFromCache,
  saveStandingsToCache,
  shouldRefreshStandings,
  markGameAsFinal,
  cleanupFinishedGames,
  hasRecentTeamSchedule,
  type CachedGame,
} from '@/lib/db/sports-cache';

const API_KEY = process.env.HIGHLIGHTLY_API_KEY;

// Official team abbreviations
const OFFICIAL_NBA_TEAMS = new Set([
  'ATL', 'BOS', 'BKN', 'CHA', 'CHI', 'CLE', 'DAL', 'DEN', 'DET', 'GSW',
  'HOU', 'IND', 'LAC', 'LAL', 'MEM', 'MIA', 'MIL', 'MIN', 'NOP', 'NYK',
  'OKC', 'ORL', 'PHI', 'PHX', 'POR', 'SAC', 'SAS', 'TOR', 'UTA', 'WAS'
]);

const OFFICIAL_NFL_TEAMS = new Set([
  'ARI', 'ATL', 'BAL', 'BUF', 'CAR', 'CHI', 'CIN', 'CLE', 'DAL', 'DEN',
  'DET', 'GB', 'HOU', 'IND', 'JAX', 'KC', 'LAC', 'LAR', 'LV', 'MIA',
  'MIN', 'NE', 'NO', 'NYG', 'NYJ', 'PHI', 'PIT', 'SEA', 'SF', 'TB',
  'TEN', 'WAS'
]);

const OFFICIAL_MLB_TEAMS = new Set([
  'ARI', 'ATL', 'BAL', 'BOS', 'CHC', 'CHW', 'CIN', 'CLE', 'COL', 'DET',
  'HOU', 'KC', 'LAA', 'LAD', 'MIA', 'MIL', 'MIN', 'NYM', 'NYY', 'OAK',
  'PHI', 'PIT', 'SD', 'SEA', 'SF', 'STL', 'TB', 'TEX', 'TOR', 'WSH',
  'CWS' // Alternative for Chicago White Sox
]);

const OFFICIAL_NHL_TEAMS = new Set([
  'ANA', 'ARI', 'BOS', 'BUF', 'CAR', 'CBJ', 'CGY', 'CHI', 'COL', 'DAL',
  'DET', 'EDM', 'FLA', 'LAK', 'MIN', 'MTL', 'NSH', 'NJD', 'NYI', 'NYR',
  'OTT', 'PHI', 'PIT', 'SEA', 'SJS', 'STL', 'TBL', 'TOR', 'VAN', 'VGK',
  'WPG', 'WSH'
]);

// Sport-specific base URLs
const BASE_URLS = {
  nfl: 'https://american-football.highlightly.net',
  nba: 'https://nba.highlightly.net',
  mlb: 'https://baseball.highlightly.net',
  nhl: 'https://nhl.highlightly.net',
} as const;

type SportLeague = keyof typeof BASE_URLS;

interface HighlightlyResponse<T> {
  data: T;
  [key: string]: any;
}

/**
 * Make API request to Highlightly with rate limiting and error handling
 */
async function fetchFromHighlightly<T>(
  sport: SportLeague,
  endpoint: string,
  params: Record<string, string> = {}
): Promise<T | null> {
  if (!API_KEY) {
    console.error('[Highlightly] API key missing. Set HIGHLIGHTLY_API_KEY in .env.local');
    throw new Error('Highlightly API key not configured');
  }

  const url = new URL(`${BASE_URLS[sport]}${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.append(key, value);
  });

  if (process.env.NODE_ENV === 'development') {
    console.log('[Highlightly] Full API URL:', url.toString());
  }

  const { data, rateLimited, message } = await withRateLimit(
    `highlightly-${sport}` as any,
    endpoint,
    async () => {
      const response = await fetch(url.toString(), {
        headers: {
          'x-rapidapi-key': API_KEY!,
        },
        next: { revalidate: 0 }, // Let DB cache handle caching
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Highlightly] Error response:', response.status, errorText);
        throw new Error(`Highlightly HTTP ${response.status}: ${errorText}`);
      }

      return await response.json();
    }
  );

  if (rateLimited) {
    console.warn('[Highlightly] Rate limit reached:', message);
    return null; // Will fall back to cache
  }

  return data;
}

/**
 * Get current season format for each league
 */
function getCurrentSeason(league: SportLeague): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  switch (league) {
    case 'nba':
      return month >= 10 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
    case 'nfl':
      return month >= 9 ? `${year}` : `${year - 1}`;
    case 'mlb':
      return month >= 3 && month <= 10 ? `${year}` : `${year - 1}`;
    case 'nhl':
      return month >= 10 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
    default:
      return `${year}`;
  }
}

/**
 * Get current year as integer for standings API
 * (API expects just the year, not season format)
 */
function getCurrentYear(): number {
  return new Date().getFullYear();
}

// Basketball (NBA)
export async function searchNBATeams(query: string) {
  const supabase = await createClient();

  // Query teams_cache first
  const { data: cachedTeams } = await supabase
    .from('teams_cache')
    .select('*')
    .eq('league_type', 'nba');

  if (cachedTeams && cachedTeams.length > 0) {
    // Filter cached teams by query client-side
    const lowerQuery = query.toLowerCase();
    return cachedTeams
      .map(ct => ct.data)
      .filter((team: any) =>
        OFFICIAL_NBA_TEAMS.has(team.abbreviation) && // Only official NBA teams
        (!query ||
         team.name?.toLowerCase().includes(lowerQuery) ||
         team.abbreviation?.toLowerCase().includes(lowerQuery))
      );
  }

  // Fallback to API if cache empty
  if (process.env.NODE_ENV === 'development') {
    console.log('[NBA Search] Cache empty, fetching from API...');
  }
  const response = await fetchFromHighlightly<any>(
    'nba',
    '/teams',
    query ? { name: query } : {}
  );

  if (process.env.NODE_ENV === 'development') {
    console.log('[NBA Search] API response:', response ? `${Array.isArray(response) ? response.length : 0} teams` : 'null/rate limited');
  }

  if (!response || !Array.isArray(response)) return [];

  const teams = response
    .filter((team: any) => OFFICIAL_NBA_TEAMS.has(team.abbreviation)) // Only official NBA teams
    .map((team: any) => ({
      id: team.id?.toString(),
      name: team.displayName || team.name,
      abbreviation: team.abbreviation,
      logo: team.logo || null,
    }));

  if (process.env.NODE_ENV === 'development') {
    console.log(`[NBA Search] Returning ${teams.length} official NBA teams from API (filtered from ${response.length} total)`);
  }
  return teams;
}

export async function getNBASchedule(teamId: string) {
  // Check cache first
  const cachedGames = await getTeamGamesFromCache(teamId, 'nba');

  // Filter games that need refresh
  const gamesToRefresh = cachedGames.filter(shouldRefreshGame);

  // If no games need refresh, return cached data
  if (gamesToRefresh.length === 0 && cachedGames.length > 0) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[NBA] Returning cached schedule');
    }
    return transformCachedGames(cachedGames);
  }

  // Only skip API if cache has games with scores (not stale data)
  const hasGamesWithScores = cachedGames.some(g => g.home_score !== null || g.away_score !== null);
  if (hasGamesWithScores && await hasRecentTeamSchedule(teamId, 'nba', 30 * 60 * 1000)) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[NBA] Schedule recently fetched with scores, using cache');
    }
    return transformCachedGames(cachedGames);
  }

  // Fetch past games + upcoming games
  const [lastFiveGames, homeGames, awayGames] = await Promise.all([
    fetchFromHighlightly<any>('nba', '/last-five-games', { teamId }),
    fetchFromHighlightly<any>('nba', '/matches', { homeTeamId: teamId }),
    fetchFromHighlightly<any>('nba', '/matches', { awayTeamId: teamId }),
  ]);

  if (!lastFiveGames && !homeGames && !awayGames) {
    // Rate limited or error, return cache
    return transformCachedGames(cachedGames);
  }

  // Limit to last 3 past games
  const lastThreeGames = Array.isArray(lastFiveGames) ? lastFiveGames.slice(0, 3) : [];

  // Filter upcoming games (scheduled/future only)
  const now = new Date();
  const allUpcomingGames = [
    ...(Array.isArray(homeGames) ? homeGames : []),
    ...(Array.isArray(awayGames) ? awayGames : []),
  ].filter((game: any) => {
    const gameDate = new Date(game.date || game.scheduled_at || game.begin_at);
    return gameDate > now && (game.status === 'scheduled' || game.status === 'STATUS_SCHEDULED' || !game.status);
  });

  // Limit to next 3 upcoming games
  const sortedUpcoming = allUpcomingGames
    .sort((a: any, b: any) => {
      const dateA = new Date(a.date || a.scheduled_at || a.begin_at);
      const dateB = new Date(b.date || b.scheduled_at || b.begin_at);
      return dateA.getTime() - dateB.getTime();
    })
    .slice(0, 3);

  // Combine last 3 past + next 3 upcoming
  const allGames = [
    ...lastThreeGames,
    ...sortedUpcoming,
  ];

  const uniqueGames = Array.from(
    new Map(allGames.map(game => [game.id, game])).values()
  );

  // Log sample game for debugging scores
  if (process.env.NODE_ENV === 'development' && uniqueGames.length > 0) {
    console.log('[NBA Schedule] ==================== DEBUG INFO ====================');
    console.log('[NBA Schedule] Total games fetched:', uniqueGames.length);
    console.log('[NBA Schedule] Last-five-games count:', Array.isArray(lastFiveGames) ? lastFiveGames.length : 0);
    console.log('[NBA Schedule] Upcoming games count:', sortedUpcoming.length);

    if (Array.isArray(lastFiveGames) && lastFiveGames.length > 0) {
      console.log('[NBA Schedule] Sample PAST game from last-five (FULL):', JSON.stringify(lastFiveGames[0], null, 2));
      // Debug extract score on first past game
      console.log('[NBA Schedule] Extracting scores with debug:');
      extractScore(lastFiveGames[0], true, true);
    }

    if (sortedUpcoming.length > 0) {
      console.log('[NBA Schedule] Sample UPCOMING game:', JSON.stringify(sortedUpcoming[0], null, 2));
    }

    // Count games after score extraction
    const gamesWithScores = uniqueGames.filter(g => {
      const homeScore = extractScore(g, true);
      const awayScore = extractScore(g, false);
      return homeScore !== null && awayScore !== null;
    });

    console.log('[NBA Schedule] Games WITH scores (extracted):', gamesWithScores.length);
    console.log('[NBA Schedule] Games WITHOUT scores:', uniqueGames.length - gamesWithScores.length);

    if (gamesWithScores.length > 0) {
      const sampleWithScore = gamesWithScores[0];
      console.log('[NBA Schedule] Sample game WITH score:', {
        homeTeam: sampleWithScore.homeTeam?.name || sampleWithScore.home_team?.name,
        awayTeam: sampleWithScore.awayTeam?.name || sampleWithScore.away_team?.name,
        homeScore: extractScore(sampleWithScore, true),
        awayScore: extractScore(sampleWithScore, false),
        status: sampleWithScore.status
      });
    }

    console.log('[NBA Schedule] =====================================================');
  }

  // Save to cache
  await saveGamesToCache(
    uniqueGames.map(game => transformToCache(game, teamId, 'nba'))
  );

  // Mark final games
  uniqueGames.forEach(game => {
    if (game.status === 'final' || game.status === 'STATUS_FINAL') {
      markGameAsFinal(game.id);
    }
  });

  // Cleanup finished games older than 7 days
  await cleanupFinishedGames(7);

  return uniqueGames.map(transformGame);
}

export async function getNBAStandings(season?: string) {
  const currentSeason = season || getCurrentSeason('nba');
  const currentYear = getCurrentYear();

  // Check cache first
  const cachedStandings = await getStandingsFromCache('nba', currentSeason);

  if (cachedStandings.length > 0 && !shouldRefreshStandings(cachedStandings)) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[NBA] Returning cached standings');
    }
    return cachedStandings.map(s => s.standings_data);
  }

  // Fetch from API (API expects integer year)
  const response = await fetchFromHighlightly<any>('nba', '/standings', {
    year: currentYear.toString(),
  });

  if (!response || !Array.isArray(response) || response.length === 0) {
    // Rate limited or no data, return cache
    return cachedStandings.map(s => s.standings_data);
  }

  // Save to cache (filter out teams with missing names and deduplicate)
  const standingsToCache = response
    .map((team: any) => ({
      league_type: 'nba',
      season: currentSeason,
      team_name: team.team?.displayName || team.team?.name || team.team?.shortDisplayName || `Team ${team.team?.id}`,
      rank: team.rank,
      wins: team.stats?.wins,
      losses: team.stats?.losses,
      win_pct: team.stats?.winPercent,
      games_back: team.stats?.gamesBehind,
      standings_data: team,
    }))
    .filter((entry: any) => entry.team_name && entry.team_name !== 'Team undefined' && entry.team_name !== 'Team null');

  // Deduplicate by team_name (keep first occurrence)
  const uniqueStandings = Array.from(
    new Map(standingsToCache.map(item => [item.team_name, item])).values()
  ) as any[];

  if (uniqueStandings.length > 0) {
    await saveStandingsToCache(uniqueStandings);
  }

  return response.map((team: any) => ({
    rank: team.rank,
    team: team.team?.displayName || team.team?.name,
    wins: team.stats?.wins,
    losses: team.stats?.losses,
    winPct: team.stats?.winPercent,
    gamesBack: team.stats?.gamesBehind,
  }));
}

// Football (NFL)
export async function searchNFLTeams(query: string) {
  const supabase = await createClient();

  // Query teams_cache first
  const { data: cachedTeams } = await supabase
    .from('teams_cache')
    .select('*')
    .eq('league_type', 'nfl');

  if (cachedTeams && cachedTeams.length > 0) {
    // Filter cached teams by query client-side
    const lowerQuery = query.toLowerCase();
    return cachedTeams
      .map(ct => ct.data)
      .filter((team: any) =>
        OFFICIAL_NFL_TEAMS.has(team.abbreviation) && // Only official NFL teams
        (!query ||
         team.name?.toLowerCase().includes(lowerQuery) ||
         team.abbreviation?.toLowerCase().includes(lowerQuery))
      );
  }

  // Fallback to API if cache empty
  const response = await fetchFromHighlightly<any>(
    'nfl',
    '/teams',
    query ? { name: query } : {}
  );

  if (!response || !Array.isArray(response)) return [];

  return response
    .filter((team: any) => OFFICIAL_NFL_TEAMS.has(team.abbreviation)) // Only official NFL teams
    .map((team: any) => ({
      id: team.id?.toString(),
      name: team.displayName || team.name,
      abbreviation: team.abbreviation,
      logo: team.logo || null,
    }));
}

export async function getNFLSchedule(teamId: string) {
  const cachedGames = await getTeamGamesFromCache(teamId, 'nfl');
  const gamesToRefresh = cachedGames.filter(shouldRefreshGame);

  if (gamesToRefresh.length === 0 && cachedGames.length > 0) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[NFL] Returning cached schedule');
    }
    return transformCachedGames(cachedGames);
  }

  // Only skip API if cache has games with scores (not stale data)
  const hasGamesWithScores = cachedGames.some(g => g.home_score !== null || g.away_score !== null);
  if (hasGamesWithScores && await hasRecentTeamSchedule(teamId, 'nfl', 30 * 60 * 1000)) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[NFL] Schedule recently fetched with scores, using cache');
    }
    return transformCachedGames(cachedGames);
  }

  const [lastFiveGames, homeGames, awayGames] = await Promise.all([
    fetchFromHighlightly<any>('nfl', '/last-five-games', { teamId }),
    fetchFromHighlightly<any>('nfl', '/matches', { homeTeamId: teamId }),
    fetchFromHighlightly<any>('nfl', '/matches', { awayTeamId: teamId }),
  ]);

  if (!lastFiveGames && !homeGames && !awayGames) {
    return transformCachedGames(cachedGames);
  }

  // Limit to last 3 past games
  const lastThreeGames = Array.isArray(lastFiveGames) ? lastFiveGames.slice(0, 3) : [];

  // Filter upcoming games (scheduled/future only)
  const now = new Date();
  const allUpcomingGames = [
    ...(Array.isArray(homeGames) ? homeGames : []),
    ...(Array.isArray(awayGames) ? awayGames : [])
  ].filter((game: any) => {
    const gameDate = new Date(game.date || game.scheduled_at || game.begin_at);
    return gameDate > now && (game.status === 'scheduled' || game.status === 'STATUS_SCHEDULED' || !game.status);
  });

  // Limit to next 3 upcoming games
  const sortedUpcoming = allUpcomingGames
    .sort((a: any, b: any) => {
      const dateA = new Date(a.date || a.scheduled_at || a.begin_at);
      const dateB = new Date(b.date || b.scheduled_at || b.begin_at);
      return dateA.getTime() - dateB.getTime();
    })
    .slice(0, 3);

  // Combine last 3 past + next 3 upcoming
  const allGames = [
    ...lastThreeGames,
    ...sortedUpcoming,
  ];

  const uniqueGames = Array.from(
    new Map(allGames.map(game => [game.id, game])).values()
  );

  await saveGamesToCache(
    uniqueGames.map(game => transformToCache(game, teamId, 'nfl'))
  );

  uniqueGames.forEach(game => {
    if (game.status === 'final' || game.status === 'STATUS_FINAL') {
      markGameAsFinal(game.id);
    }
  });

  // Cleanup finished games older than 7 days
  await cleanupFinishedGames(7);

  return uniqueGames.map(transformGame);
}

export async function getNFLStandings(season?: string) {
  const currentSeason = season || getCurrentSeason('nfl');
  const currentYear = getCurrentYear();
  const cachedStandings = await getStandingsFromCache('nfl', currentSeason);

  if (cachedStandings.length > 0 && !shouldRefreshStandings(cachedStandings)) {
    return cachedStandings.map(s => s.standings_data);
  }

  const response = await fetchFromHighlightly<any>('nfl', '/standings', {
    year: currentYear.toString(),
  });

  if (!response || !Array.isArray(response) || response.length === 0) {
    return cachedStandings.map(s => s.standings_data);
  }

  const standingsToCache = response
    .map((team: any) => ({
      league_type: 'nfl',
      season: currentSeason,
      team_name: team.team?.displayName || team.team?.name || team.team?.shortDisplayName || `Team ${team.team?.id}`,
      rank: team.rank,
      wins: team.stats?.wins,
      losses: team.stats?.losses,
      ties: team.stats?.ties,
      points: team.stats?.points,
      standings_data: team,
    }))
    .filter((entry: any) => entry.team_name && entry.team_name !== 'Team undefined' && entry.team_name !== 'Team null');

  const uniqueStandings = Array.from(
    new Map(standingsToCache.map(item => [item.team_name, item])).values()
  ) as any[];

  if (uniqueStandings.length > 0) {
    await saveStandingsToCache(uniqueStandings);
  }

  return response.map((team: any) => ({
    rank: team.rank,
    team: team.team?.displayName || team.team?.name,
    wins: team.stats?.wins,
    losses: team.stats?.losses,
    ties: team.stats?.ties,
    pointsFor: team.stats?.pointsFor,
    pointsAgainst: team.stats?.pointsAgainst,
  }));
}

// Baseball (MLB)
export async function searchMLBTeams(query: string) {
  const supabase = await createClient();

  // Query teams_cache first
  const { data: cachedTeams } = await supabase
    .from('teams_cache')
    .select('*')
    .eq('league_type', 'mlb');

  if (cachedTeams && cachedTeams.length > 0) {
    // Filter cached teams by query client-side
    const lowerQuery = query.toLowerCase();
    return cachedTeams
      .map(ct => ct.data)
      .filter((team: any) =>
        OFFICIAL_MLB_TEAMS.has(team.abbreviation) && // Only official MLB teams
        (!query ||
         team.name?.toLowerCase().includes(lowerQuery) ||
         team.abbreviation?.toLowerCase().includes(lowerQuery))
      );
  }

  // Fallback to API if cache empty
  const response = await fetchFromHighlightly<any>(
    'mlb',
    '/teams',
    query ? { name: query } : {}
  );

  if (!response || !Array.isArray(response)) return [];

  return response
    .filter((team: any) => OFFICIAL_MLB_TEAMS.has(team.abbreviation)) // Only official MLB teams
    .map((team: any) => ({
      id: team.id?.toString(),
      name: team.displayName || team.name,
      abbreviation: team.abbreviation,
      logo: team.logo || null,
    }));
}

export async function getMLBSchedule(teamId: string) {
  const cachedGames = await getTeamGamesFromCache(teamId, 'mlb');
  const gamesToRefresh = cachedGames.filter(shouldRefreshGame);

  if (gamesToRefresh.length === 0 && cachedGames.length > 0) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[MLB] Returning cached schedule');
    }
    return transformCachedGames(cachedGames);
  }

  // Only skip API if cache has games with scores (not stale data)
  const hasGamesWithScores = cachedGames.some(g => g.home_score !== null || g.away_score !== null);
  if (hasGamesWithScores && await hasRecentTeamSchedule(teamId, 'mlb', 30 * 60 * 1000)) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[MLB] Schedule recently fetched with scores, using cache');
    }
    return transformCachedGames(cachedGames);
  }

  const [lastFiveGames, homeGames, awayGames] = await Promise.all([
    fetchFromHighlightly<any>('mlb', '/last-five-games', { teamId }),
    fetchFromHighlightly<any>('mlb', '/matches', { homeTeamId: teamId }),
    fetchFromHighlightly<any>('mlb', '/matches', { awayTeamId: teamId }),
  ]);

  if (!lastFiveGames && !homeGames && !awayGames) {
    return transformCachedGames(cachedGames);
  }

  // Limit to last 3 past games
  const lastThreeGames = Array.isArray(lastFiveGames) ? lastFiveGames.slice(0, 3) : [];

  // Filter upcoming games (scheduled/future only)
  const now = new Date();
  const allUpcomingGames = [
    ...(Array.isArray(homeGames) ? homeGames : []),
    ...(Array.isArray(awayGames) ? awayGames : [])
  ].filter((game: any) => {
    const gameDate = new Date(game.date || game.scheduled_at || game.begin_at);
    return gameDate > now && (game.status === 'scheduled' || game.status === 'STATUS_SCHEDULED' || !game.status);
  });

  // Limit to next 3 upcoming games
  const sortedUpcoming = allUpcomingGames
    .sort((a: any, b: any) => {
      const dateA = new Date(a.date || a.scheduled_at || a.begin_at);
      const dateB = new Date(b.date || b.scheduled_at || b.begin_at);
      return dateA.getTime() - dateB.getTime();
    })
    .slice(0, 3);

  // Combine last 3 past + next 3 upcoming
  const allGames = [
    ...lastThreeGames,
    ...sortedUpcoming,
  ];

  const uniqueGames = Array.from(
    new Map(allGames.map(game => [game.id, game])).values()
  );

  await saveGamesToCache(
    uniqueGames.map(game => transformToCache(game, teamId, 'mlb'))
  );

  uniqueGames.forEach(game => {
    if (game.status === 'final' || game.status === 'STATUS_FINAL') {
      markGameAsFinal(game.id);
    }
  });

  // Cleanup finished games older than 7 days
  await cleanupFinishedGames(7);

  return uniqueGames.map(transformGame);
}

export async function getMLBStandings(season?: string) {
  const currentSeason = season || getCurrentSeason('mlb');
  const currentYear = getCurrentYear();
  const cachedStandings = await getStandingsFromCache('mlb', currentSeason);

  if (cachedStandings.length > 0 && !shouldRefreshStandings(cachedStandings)) {
    return cachedStandings.map(s => s.standings_data);
  }

  const response = await fetchFromHighlightly<any>('mlb', '/standings', {
    year: currentYear.toString(),
  });

  if (!response || !Array.isArray(response) || response.length === 0) {
    return cachedStandings.map(s => s.standings_data);
  }

  const standingsToCache = response
    .map((team: any) => ({
      league_type: 'mlb',
      season: currentSeason,
      team_name: team.team?.displayName || team.team?.name || team.team?.shortDisplayName || `Team ${team.team?.id}`,
      rank: team.rank,
      wins: team.stats?.wins,
      losses: team.stats?.losses,
      win_pct: team.stats?.winPercent,
      games_back: team.stats?.gamesBehind,
      standings_data: team,
    }))
    .filter((entry: any) => entry.team_name && entry.team_name !== 'Team undefined' && entry.team_name !== 'Team null');

  const uniqueStandings = Array.from(
    new Map(standingsToCache.map(item => [item.team_name, item])).values()
  ) as any[];

  if (uniqueStandings.length > 0) {
    await saveStandingsToCache(uniqueStandings);
  }

  return response.map((team: any) => ({
    rank: team.rank,
    team: team.team?.displayName || team.team?.name,
    wins: team.stats?.wins,
    losses: team.stats?.losses,
    winPct: team.stats?.winPercent,
    gamesBack: team.stats?.gamesBehind,
  }));
}

// Hockey (NHL)
export async function searchNHLTeams(query: string) {
  const supabase = await createClient();

  // Query teams_cache first
  const { data: cachedTeams } = await supabase
    .from('teams_cache')
    .select('*')
    .eq('league_type', 'nhl');

  if (cachedTeams && cachedTeams.length > 0) {
    // Filter cached teams by query client-side
    const lowerQuery = query.toLowerCase();
    return cachedTeams
      .map(ct => ct.data)
      .filter((team: any) =>
        OFFICIAL_NHL_TEAMS.has(team.abbreviation) && // Only official NHL teams
        (!query ||
         team.name?.toLowerCase().includes(lowerQuery) ||
         team.abbreviation?.toLowerCase().includes(lowerQuery))
      );
  }

  // Fallback to API if cache empty
  const response = await fetchFromHighlightly<any>(
    'nhl',
    '/teams',
    query ? { name: query } : {}
  );

  if (!response || !Array.isArray(response)) return [];

  return response
    .filter((team: any) => OFFICIAL_NHL_TEAMS.has(team.abbreviation)) // Only official NHL teams
    .map((team: any) => ({
      id: team.id?.toString(),
      name: team.displayName || team.name,
      abbreviation: team.abbreviation,
      logo: team.logo || null,
    }));
}

export async function getNHLSchedule(teamId: string) {
  const cachedGames = await getTeamGamesFromCache(teamId, 'nhl');
  const gamesToRefresh = cachedGames.filter(shouldRefreshGame);

  if (gamesToRefresh.length === 0 && cachedGames.length > 0) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[NHL] Returning cached schedule');
    }
    return transformCachedGames(cachedGames);
  }

  // Only skip API if cache has games with scores (not stale data)
  const hasGamesWithScores = cachedGames.some(g => g.home_score !== null || g.away_score !== null);
  if (hasGamesWithScores && await hasRecentTeamSchedule(teamId, 'nhl', 30 * 60 * 1000)) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[NHL] Schedule recently fetched with scores, using cache');
    }
    return transformCachedGames(cachedGames);
  }

  const [lastFiveGames, homeGames, awayGames] = await Promise.all([
    fetchFromHighlightly<any>('nhl', '/last-five-games', { teamId }),
    fetchFromHighlightly<any>('nhl', '/matches', { homeTeamId: teamId }),
    fetchFromHighlightly<any>('nhl', '/matches', { awayTeamId: teamId }),
  ]);

  if (!lastFiveGames && !homeGames && !awayGames) {
    return transformCachedGames(cachedGames);
  }

  // Limit to last 3 past games
  const lastThreeGames = Array.isArray(lastFiveGames) ? lastFiveGames.slice(0, 3) : [];

  // Filter upcoming games (scheduled/future only)
  const now = new Date();
  const allUpcomingGames = [
    ...(Array.isArray(homeGames) ? homeGames : []),
    ...(Array.isArray(awayGames) ? awayGames : [])
  ].filter((game: any) => {
    const gameDate = new Date(game.date || game.scheduled_at || game.begin_at);
    return gameDate > now && (game.status === 'scheduled' || game.status === 'STATUS_SCHEDULED' || !game.status);
  });

  // Limit to next 3 upcoming games
  const sortedUpcoming = allUpcomingGames
    .sort((a: any, b: any) => {
      const dateA = new Date(a.date || a.scheduled_at || a.begin_at);
      const dateB = new Date(b.date || b.scheduled_at || b.begin_at);
      return dateA.getTime() - dateB.getTime();
    })
    .slice(0, 3);

  // Combine last 3 past + next 3 upcoming
  const allGames = [
    ...lastThreeGames,
    ...sortedUpcoming,
  ];

  const uniqueGames = Array.from(
    new Map(allGames.map(game => [game.id, game])).values()
  );

  await saveGamesToCache(
    uniqueGames.map(game => transformToCache(game, teamId, 'nhl'))
  );

  uniqueGames.forEach(game => {
    if (game.status === 'final' || game.status === 'STATUS_FINAL') {
      markGameAsFinal(game.id);
    }
  });

  // Cleanup finished games older than 7 days
  await cleanupFinishedGames(7);

  return uniqueGames.map(transformGame);
}

export async function getNHLStandings(season?: string) {
  const currentSeason = season || getCurrentSeason('nhl');
  const currentYear = getCurrentYear();
  const cachedStandings = await getStandingsFromCache('nhl', currentSeason);

  if (cachedStandings.length > 0 && !shouldRefreshStandings(cachedStandings)) {
    return cachedStandings.map(s => s.standings_data);
  }

  const response = await fetchFromHighlightly<any>('nhl', '/standings', {
    year: currentYear.toString(),
  });

  if (!response || !Array.isArray(response) || response.length === 0) {
    return cachedStandings.map(s => s.standings_data);
  }

  const standingsToCache = response
    .map((team: any) => ({
      league_type: 'nhl',
      season: currentSeason,
      team_name: team.team?.displayName || team.team?.name || team.team?.shortDisplayName || `Team ${team.team?.id}`,
      rank: team.rank,
      wins: team.stats?.wins,
      losses: team.stats?.losses,
      points: team.stats?.points,
      standings_data: team,
    }))
    .filter((entry: any) => entry.team_name && entry.team_name !== 'Team undefined' && entry.team_name !== 'Team null');

  const uniqueStandings = Array.from(
    new Map(standingsToCache.map(item => [item.team_name, item])).values()
  ) as any[];

  if (uniqueStandings.length > 0) {
    await saveStandingsToCache(uniqueStandings);
  }

  return response.map((team: any) => ({
    rank: team.rank,
    team: team.team?.displayName || team.team?.name,
    wins: team.stats?.wins,
    losses: team.stats?.losses,
    overtimeLosses: team.stats?.overtimeLosses,
    points: team.stats?.points,
    winPct: team.stats?.winPercent,
  }));
}

// Helper function to parse score string like "110 - 105" or "3 - 1"
function parseScoreString(scoreStr: string | undefined | null): { home: number; away: number } | null {
  if (!scoreStr || typeof scoreStr !== 'string') return null;
  const match = scoreStr.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (match) {
    return { home: parseInt(match[1], 10), away: parseInt(match[2], 10) };
  }
  return null;
}

// Helper function to sum quarter scores for basketball
function sumQuarterScores(quarters: any[] | undefined | null): number | null {
  if (!Array.isArray(quarters) || quarters.length === 0) return null;
  const sum = quarters.reduce((total, q) => {
    const val = typeof q === 'number' ? q : parseInt(q, 10);
    return total + (isNaN(val) ? 0 : val);
  }, 0);
  return sum > 0 ? sum : null;
}

// Helper function to extract score from various formats
function extractScore(game: any, isHome: boolean, debug: boolean = false): number | null {
  if (debug) {
    console.log('[extractScore] Raw game object keys:', Object.keys(game || {}));
    console.log('[extractScore] homeScore:', game.homeScore);
    console.log('[extractScore] homeTeam:', game.homeTeam);
    console.log('[extractScore] awayTeam:', game.awayTeam);
    console.log('[extractScore] score:', game.score);
    console.log('[extractScore] scores:', game.scores);
    console.log('[extractScore] state:', game.state);
    console.log('[extractScore] competitors:', game.competitors);
    console.log('[extractScore] competitions:', game.competitions);
  }

  // Basketball format: score.homeTeam = [28, 25, 30, 27] (quarter scores)
  if (game.state.score?.homeTeam && Array.isArray(game.state.score.homeTeam)) {
    const homeTotal = sumQuarterScores(game.state.score.homeTeam);
    const awayTotal = sumQuarterScores(game.state.score.awayTeam);
    if (homeTotal !== null && awayTotal !== null) {
      if (debug) {
        console.log('[extractScore] Basketball quarter format detected (homeTeam/awayTeam)');
        console.log('[extractScore] Home quarters:', game.state.score.homeTeam, '= Total:', homeTotal);
        console.log('[extractScore] Away quarters:', game.state.score.awayTeam, '= Total:', awayTotal);
      }
      return isHome ? homeTotal : awayTotal;
    }
  }

  // Also try score.home and score.away as arrays (alternative format)
  if (game.score?.home && Array.isArray(game.score.home)) {
    const homeTotal = sumQuarterScores(game.score.home);
    const awayTotal = sumQuarterScores(game.score.away);
    if (homeTotal !== null && awayTotal !== null) {
      if (debug) {
        console.log('[extractScore] Basketball quarter format detected (home/away)');
        console.log('[extractScore] Home quarters:', game.score.home, '= Total:', homeTotal);
        console.log('[extractScore] Away quarters:', game.score.away, '= Total:', awayTotal);
      }
      return isHome ? homeTotal : awayTotal;
    }
  }

  // Try parsing Highlightly format: state.score.current = "110 - 105"
  const highlightlyScore = parseScoreString(game.state?.score?.current);
  if (highlightlyScore) {
    return isHome ? highlightlyScore.home : highlightlyScore.away;
  }

  // Also try score.current directly
  const scoreCurrentParsed = parseScoreString(game.score?.current);
  if (scoreCurrentParsed) {
    return isHome ? scoreCurrentParsed.home : scoreCurrentParsed.away;
  }

  if (isHome) {
    return game.homeScore ??
           game.homeTeam?.score ??
           game.home_score ??
           game.homeTeam?.finalScore ??
           (typeof game.score?.home === 'number' ? game.score.home : null) ??
           game.scores?.[0] ??
           game.competitors?.[0]?.score ??
           game.competitions?.[0]?.competitors?.[0]?.score ??
           game.opponents?.[0]?.score ?? // PandaScore format for esports
           game.results?.[0]?.score ??
           null;
  } else {
    return game.awayScore ??
           game.awayTeam?.score ??
           game.away_score ??
           game.awayTeam?.finalScore ??
           (typeof game.score?.away === 'number' ? game.score.away : null) ??
           game.scores?.[1] ??
           game.competitors?.[1]?.score ??
           game.competitions?.[0]?.competitors?.[1]?.score ??
           game.opponents?.[1]?.score ?? // PandaScore format for esports
           game.results?.[1]?.score ??
           null;
  }
}

// Helper functions
function transformGame(game: any) {
  const homeScore = extractScore(game, true);
  const awayScore = extractScore(game, false);
  const hasScores = homeScore !== null && awayScore !== null;

  // Calculate winner if scores exist
  // For all leagues (sports & esports), higher score = winner
  let winner: 'home' | 'away' | 'tie' | null = null;
  if (hasScores) {
    if (homeScore > awayScore) winner = 'home';
    else if (awayScore > homeScore) winner = 'away';
    else winner = 'tie';
  }

  return {
    id: game.id?.toString(),
    date: game.date || game.scheduled_at || game.begin_at || game.startTime,
    homeTeam: game.homeTeam?.displayName ||
              game.homeTeam?.name ||
              game.home_team?.name ||
              game.opponents?.[0]?.opponent?.name, // Esports format
    awayTeam: game.awayTeam?.displayName ||
              game.awayTeam?.name ||
              game.away_team?.name ||
              game.opponents?.[1]?.opponent?.name, // Esports format
    homeScore,
    awayScore,
    winner,
    status: game.status,
    venue: game.venue?.name,
  };
}

function transformCachedGames(games: CachedGame[]) {
  return games.map(game => {
    const homeScore = game.home_score;
    const awayScore = game.away_score;
    const hasScores = homeScore !== null && awayScore !== null;

    // Calculate winner from cached scores
    let winner: 'home' | 'away' | 'tie' | null = null;
    if (hasScores) {
      if (homeScore > awayScore) winner = 'home';
      else if (awayScore > homeScore) winner = 'away';
      else winner = 'tie';
    }

    return {
      id: game.game_id,
      date: game.game_date,
      homeTeam: game.home_team,
      awayTeam: game.away_team,
      homeScore,
      awayScore,
      winner,
      status: game.status,
      venue: game.venue,
    };
  });
}

function transformToCache(game: any, teamId: string, leagueType: string): Partial<CachedGame> {
  const homeScore = extractScore(game, true);
  const awayScore = extractScore(game, false);
  const normalizedStatus = normalizeStatus(game.status, game);

  return {
    game_id: game.id,
    league_type: leagueType as any,
    team_id: teamId,
    game_date: game.date || game.scheduled_at || game.begin_at || game.startTime,
    home_team: game.homeTeam?.displayName ||
               game.homeTeam?.name ||
               game.home_team?.name ||
               game.opponents?.[0]?.opponent?.name, // Esports format
    away_team: game.awayTeam?.displayName ||
               game.awayTeam?.name ||
               game.away_team?.name ||
               game.opponents?.[1]?.opponent?.name, // Esports format
    home_score: homeScore,
    away_score: awayScore,
    status: normalizedStatus,
    is_final: normalizedStatus === 'final',
    venue: game.venue?.name,
    game_data: game,
  };
}

function normalizeStatus(status: string | undefined | null, game?: any): 'scheduled' | 'live' | 'final' | 'postponed' {
  // If no status but has scores, it's likely a finished game
  if (!status && game) {
    const homeScore = extractScore(game, true);
    const awayScore = extractScore(game, false);
    const hasScores = homeScore !== null && awayScore !== null;
    if (hasScores) return 'final';
    return 'scheduled';
  }
  if (!status) return 'scheduled';

  const s = status.toLowerCase();
  if (s.includes('final') || s.includes('completed') || s.includes('finished')) return 'final';
  if (s.includes('live') || s.includes('progress') || s.includes('playing')) return 'live';
  if (s.includes('postponed') || s.includes('cancelled')) return 'postponed';
  return 'scheduled';
}
