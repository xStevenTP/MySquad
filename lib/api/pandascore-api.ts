// PandaScore API client for esports
// Docs: https://pandascore.co/docs

const PANDASCORE_BASE = 'https://api.pandascore.co';
const API_KEY = process.env.PANDASCORE_KEY;

interface PandascoreResponse<T> {
  data?: T;
  error?: string;
}

async function fetchFromPandascore<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${PANDASCORE_BASE}${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  const response = await fetch(url.toString(), {
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Accept': 'application/json',
    },
    next: { revalidate: 3600 }, // Cache for 1 hour
  });

  if (!response.ok) {
    throw new Error(`PandaScore error: ${response.status}`);
  }

  const data = await response.json();
  return data as T;
}

// League of Legends
export async function searchLoLTeams(query: string) {
  return fetchFromPandascore('/lol/teams', { 'search[name]': query, per_page: '20' });
}

export async function getLoLSchedule(teamId: string) {
  // Fetch both past and upcoming games
  const [pastGames, upcomingGames] = await Promise.all([
    fetchFromPandascore('/lol/matches/past', { 'filter[opponent_id]': teamId, per_page: '10', sort: '-begin_at' }),
    fetchFromPandascore('/lol/matches/upcoming', { 'filter[opponent_id]': teamId, per_page: '10', sort: 'begin_at' }),
  ]);

  if (process.env.NODE_ENV === 'development') {
    console.log('[LoL] Past games count:', Array.isArray(pastGames) ? pastGames.length : 0);
    console.log('[LoL] Upcoming games count:', Array.isArray(upcomingGames) ? upcomingGames.length : 0);

    if (Array.isArray(upcomingGames) && upcomingGames.length > 0) {
      console.log('[LoL] Sample upcoming game:', JSON.stringify(upcomingGames[0], null, 2));
    }

    if (Array.isArray(pastGames) && pastGames.length > 0) {
      console.log('[LoL] Sample past game:', JSON.stringify(pastGames[0], null, 2));
    }
  }

  return [...(Array.isArray(pastGames) ? pastGames : []), ...(Array.isArray(upcomingGames) ? upcomingGames : [])];
}

export async function getLoLStandings(tournamentId: string) {
  return fetchFromPandascore(`/lol/tournaments/${tournamentId}/standings`, {});
}

// Counter-Strike (CS:GO / CS2)
export async function searchCSGOTeams(query: string) {
  return fetchFromPandascore('/csgo/teams', { 'search[name]': query, per_page: '20' });
}

export async function getCSGOSchedule(teamId: string) {
  // Fetch both past and upcoming games
  const [pastGames, upcomingGames] = await Promise.all([
    fetchFromPandascore('/csgo/matches/past', { 'filter[opponent_id]': teamId, per_page: '10', sort: '-begin_at' }),
    fetchFromPandascore('/csgo/matches/upcoming', { 'filter[opponent_id]': teamId, per_page: '10', sort: 'begin_at' }),
  ]);

  return [...(Array.isArray(pastGames) ? pastGames : []), ...(Array.isArray(upcomingGames) ? upcomingGames : [])];
}

export async function getCSGOStandings(tournamentId: string) {
  return fetchFromPandascore(`/csgo/tournaments/${tournamentId}/standings`, {});
}

// Valorant
export async function searchValorantTeams(query: string) {
  return fetchFromPandascore('/valorant/teams', { 'search[name]': query, per_page: '20' });
}

export async function getValorantSchedule(teamId: string) {
  // Fetch both past and upcoming games
  const [pastGames, upcomingGames] = await Promise.all([
    fetchFromPandascore('/valorant/matches/past', { 'filter[opponent_id]': teamId, per_page: '10', sort: '-begin_at' }),
    fetchFromPandascore('/valorant/matches/upcoming', { 'filter[opponent_id]': teamId, per_page: '10', sort: 'begin_at' }),
  ]);

  return [...(Array.isArray(pastGames) ? pastGames : []), ...(Array.isArray(upcomingGames) ? upcomingGames : [])];
}

export async function getValorantStandings(tournamentId: string) {
  return fetchFromPandascore(`/valorant/tournaments/${tournamentId}/standings`, {});
}

// Dota 2
export async function searchDota2Teams(query: string) {
  return fetchFromPandascore('/dota2/teams', { 'search[name]': query, per_page: '20' });
}

export async function getDota2Schedule(teamId: string) {
  // Fetch both past and upcoming games
  const [pastGames, upcomingGames] = await Promise.all([
    fetchFromPandascore('/dota2/matches/past', { 'filter[opponent_id]': teamId, per_page: '10', sort: '-begin_at' }),
    fetchFromPandascore('/dota2/matches/upcoming', { 'filter[opponent_id]': teamId, per_page: '10', sort: 'begin_at' }),
  ]);

  return [...(Array.isArray(pastGames) ? pastGames : []), ...(Array.isArray(upcomingGames) ? upcomingGames : [])];
}

export async function getDota2Standings(tournamentId: string) {
  return fetchFromPandascore(`/dota2/tournaments/${tournamentId}/standings`, {});
}

// Search across all esports
export async function searchAllEsportsTeams(query: string) {
  const [lol, csgo, valorant, dota2] = await Promise.allSettled([
    searchLoLTeams(query),
    searchCSGOTeams(query),
    searchValorantTeams(query),
    searchDota2Teams(query),
  ]);

  return {
    lol: lol.status === 'fulfilled' ? lol.value : [],
    csgo: csgo.status === 'fulfilled' ? csgo.value : [],
    valorant: valorant.status === 'fulfilled' ? valorant.value : [],
    dota2: dota2.status === 'fulfilled' ? dota2.value : [],
  };
}
