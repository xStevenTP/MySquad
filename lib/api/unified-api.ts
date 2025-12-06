/**
 * Unified API wrapper that combines traditional sports and esports APIs
 */

import type { LeagueType } from '@/types/database';
import * as SportsAPI from './sports-api';
import * as EsportsAPI from './pandascore-api';

export interface TeamSearchResult {
  id: string;
  name: string;
  logo?: string;
  leagueType: LeagueType;
  leagueName: string;
}

export interface Game {
  id: string;
  date: string;
  endTime?: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  status: string;
  venue?: string;
}

/**
 * Search for teams across all leagues
 */
export async function searchTeams(query: string): Promise<TeamSearchResult[]> {
  const results: TeamSearchResult[] = [];

  try {
    // Search traditional sports
    const [nba, nfl, mlb, nhl] = await Promise.allSettled([
      SportsAPI.searchNBATeams(query),
      SportsAPI.searchNFLTeams(query),
      SportsAPI.searchMLBTeams(query),
      SportsAPI.searchNHLTeams(query),
    ]);

    // Process NBA results
    if (nba.status === 'fulfilled' && Array.isArray(nba.value)) {
      results.push(
        ...nba.value.map((team: any) => ({
          id: team.id?.toString(),
          name: team.name,
          logo: team.logo,
          leagueType: 'nba' as LeagueType,
          leagueName: 'NBA',
        }))
      );
    }

    // Process NFL results
    if (nfl.status === 'fulfilled' && Array.isArray(nfl.value)) {
      results.push(
        ...nfl.value.map((team: any) => ({
          id: team.id?.toString(),
          name: team.name,
          logo: team.logo,
          leagueType: 'nfl' as LeagueType,
          leagueName: 'NFL',
        }))
      );
    }

    // Process MLB results
    if (mlb.status === 'fulfilled' && Array.isArray(mlb.value)) {
      results.push(
        ...mlb.value.map((team: any) => ({
          id: team.id?.toString(),
          name: team.name,
          logo: team.logo,
          leagueType: 'mlb' as LeagueType,
          leagueName: 'MLB',
        }))
      );
    }

    // Process NHL results
    if (nhl.status === 'fulfilled' && Array.isArray(nhl.value)) {
      results.push(
        ...nhl.value.map((team: any) => ({
          id: team.id?.toString(),
          name: team.name,
          logo: team.logo,
          leagueType: 'nhl' as LeagueType,
          leagueName: 'NHL',
        }))
      );
    }

    // Search esports
    const esports = await EsportsAPI.searchAllEsportsTeams(query);

    // Process LoL results
    if (Array.isArray(esports.lol)) {
      results.push(
        ...esports.lol.map((team: any) => ({
          id: team.id?.toString(),
          name: team.name,
          logo: team.image_url,
          leagueType: 'lol' as LeagueType,
          leagueName: 'League of Legends',
        }))
      );
    }

    // Process CS:GO results
    if (Array.isArray(esports.csgo)) {
      results.push(
        ...esports.csgo.map((team: any) => ({
          id: team.id?.toString(),
          name: team.name,
          logo: team.image_url,
          leagueType: 'csgo' as LeagueType,
          leagueName: 'CS:GO',
        }))
      );
    }

    // Process Valorant results
    if (Array.isArray(esports.valorant)) {
      results.push(
        ...esports.valorant.map((team: any) => ({
          id: team.id?.toString(),
          name: team.name,
          logo: team.image_url,
          leagueType: 'valorant' as LeagueType,
          leagueName: 'Valorant',
        }))
      );
    }

    // Process Dota 2 results
    if (Array.isArray(esports.dota2)) {
      results.push(
        ...esports.dota2.map((team: any) => ({
          id: team.id?.toString(),
          name: team.name,
          logo: team.image_url,
          leagueType: 'dota2' as LeagueType,
          leagueName: 'Dota 2',
        }))
      );
    }
  } catch (error) {
    console.error('Error searching teams:', error);
  }

  return results;
}

/**
 * Transform esports game data to consistent format with scores
 */
function transformEsportsGame(game: any): any {
  // PandaScore format: opponents[], results[]
  const homeTeam = game.opponents?.[0]?.opponent?.name || game.name || 'TBD';
  const awayTeam = game.opponents?.[1]?.opponent?.name || 'TBD';

  // Extract scores from results or opponents
  const homeScore = game.results?.[0]?.score ?? game.opponents?.[0]?.score ?? null;
  const awayScore = game.results?.[1]?.score ?? game.opponents?.[1]?.score ?? null;

  const hasScores = homeScore !== null && awayScore !== null;

  // Calculate winner
  let winner: 'home' | 'away' | 'tie' | null = null;
  if (hasScores) {
    if (homeScore > awayScore) winner = 'home';
    else if (awayScore > homeScore) winner = 'away';
    else winner = 'tie';
  }

  // Normalize status
  const rawStatus = game.status?.toLowerCase() || '';
  let status = 'scheduled';
  if (rawStatus.includes('finished') || rawStatus.includes('completed') || rawStatus.includes('past') || hasScores) {
    status = 'final';
  } else if (rawStatus.includes('running') || rawStatus.includes('live') || rawStatus.includes('progress')) {
    status = 'live';
  }

  return {
    id: game.id?.toString(),
    date: game.begin_at || game.scheduled_at,
    homeTeam,
    awayTeam,
    homeScore,
    awayScore,
    winner,
    status,
    venue: game.league?.name || game.tournament?.name,
    // Keep original data for reference
    _raw: game,
  };
}

/**
 * Filter esports games to last 3 past + next 3 upcoming
 */
function filterEsportsGames(games: any[]): any[] {
  const now = new Date();
  const past: any[] = [];
  const upcoming: any[] = [];
  const live: any[] = [];

  games.forEach((game) => {
    const gameDate = new Date(game.date);

    if (game.status === 'live') {
      live.push(game);
    } else if (game.status === 'final' || gameDate < now) {
      past.push(game);
    } else {
      upcoming.push(game);
    }
  });

  // Sort past games by date descending (most recent first), take last 3
  const lastThreePast = past
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  // Sort upcoming games by date ascending (soonest first), take next 3
  const nextThreeUpcoming = upcoming
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);

  // Combine: past (oldest to newest) + live + upcoming
  return [...lastThreePast.reverse(), ...live, ...nextThreeUpcoming];
}

/**
 * Get team schedule by league type
 */
export async function getTeamSchedule(teamId: string, leagueType: LeagueType): Promise<any[]> {
  try {
    switch (leagueType) {
      case 'nba':
        return (await SportsAPI.getNBASchedule(teamId)) as any[];
      case 'nfl':
        return (await SportsAPI.getNFLSchedule(teamId)) as any[];
      case 'mlb':
        return (await SportsAPI.getMLBSchedule(teamId)) as any[];
      case 'nhl':
        return (await SportsAPI.getNHLSchedule(teamId)) as any[];
      case 'lol': {
        const games = await EsportsAPI.getLoLSchedule(teamId);
        const transformed = Array.isArray(games) ? games.map(transformEsportsGame) : [];
        return filterEsportsGames(transformed);
      }
      case 'csgo': {
        const games = await EsportsAPI.getCSGOSchedule(teamId);
        const transformed = Array.isArray(games) ? games.map(transformEsportsGame) : [];
        return filterEsportsGames(transformed);
      }
      case 'valorant': {
        const games = await EsportsAPI.getValorantSchedule(teamId);
        const transformed = Array.isArray(games) ? games.map(transformEsportsGame) : [];
        return filterEsportsGames(transformed);
      }
      case 'dota2': {
        const games = await EsportsAPI.getDota2Schedule(teamId);
        const transformed = Array.isArray(games) ? games.map(transformEsportsGame) : [];
        return filterEsportsGames(transformed);
      }
      default:
        return [];
    }
  } catch (error) {
    console.error(`Error fetching schedule for ${leagueType} team ${teamId}:`, error);
    return [];
  }
}

/**
 * Get league standings by league type
 */
export async function getLeagueStandings(leagueId: string, leagueType: LeagueType): Promise<any[]> {
  try {
    switch (leagueType) {
      case 'nba':
        return (await SportsAPI.getNBAStandings()) as any[];
      case 'nfl':
        return (await SportsAPI.getNFLStandings()) as any[];
      case 'mlb':
        return (await SportsAPI.getMLBStandings()) as any[];
      case 'nhl':
        return (await SportsAPI.getNHLStandings()) as any[];
      case 'lol':
        return (await EsportsAPI.getLoLStandings(leagueId)) as any[];
      case 'csgo':
        return (await EsportsAPI.getCSGOStandings(leagueId)) as any[];
      case 'valorant':
        return (await EsportsAPI.getValorantStandings(leagueId)) as any[];
      case 'dota2':
        return (await EsportsAPI.getDota2Standings(leagueId)) as any[];
      default:
        return [];
    }
  } catch (error) {
    console.error(`Error fetching standings for ${leagueType} league ${leagueId}:`, error);
    return [];
  }
}
