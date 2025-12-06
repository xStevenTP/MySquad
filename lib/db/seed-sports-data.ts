/**
 * Auto-Seed Script for Sports Data
 * Runs once on first deploy to populate database with:
 * - All teams for NFL, NBA, MLB, NHL (with logos)
 * - Limited schedules (last 5 past + next 5 upcoming games per team)
 * - Current season standings
 *
 * Estimated API requests: ~380 (one-time cost)
 * - Teams: 4 requests (1 per sport)
 * - Schedules: ~372 requests (3 per team: last-five-games + home matches + away matches)
 * - Standings: 4 requests (1 per sport)
 */

import { isSportsDataSeeded, markSportsDataSeeded } from './sports-cache';
import * as SportsAPI from '../api/sports-api';
import { createClient } from '../supabase/server';

export async function seedSportsData(): Promise<{
  success: boolean;
  message: string;
  requestsUsed: number;
}> {
  // Check if already seeded
  const alreadySeeded = await isSportsDataSeeded();
  if (alreadySeeded) {
    console.log('[Seed] Sports data already seeded');
    return {
      success: true,
      message: 'Sports data already seeded',
      requestsUsed: 0,
    };
  }

  console.log('[Seed] Starting sports data seed...');
  let requestCount = 0;

  try {
    const supabase = await createClient();

    // NBA Teams and Schedule
    console.log('[Seed] Fetching NBA teams...');
    const allNbaTeams = await SportsAPI.searchNBATeams('');
    requestCount++; // 1 request for all teams

    // Filter teams with logos only (excludes minor league/test teams)
    const nbaTeams = allNbaTeams.filter(team => team.logo != null);
    console.log(`[Seed] Filtered to ${nbaTeams.length} NBA teams with logos (from ${allNbaTeams.length} total)`);

    // Save NBA teams to cache (batch insert)
    console.log(`[Seed] Saving ${nbaTeams.length} NBA teams to cache...`);
    const { error: nbaTeamsError } = await supabase.from('teams_cache').upsert(
      nbaTeams.map(team => ({
        api_id: team.id,
        league_type: 'nba',
        data: team,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: 'api_id' }
    );
    if (nbaTeamsError) {
      console.error(`[Seed] Error saving NBA teams:`, nbaTeamsError);
    } else {
      console.log(`[Seed] NBA teams saved to cache`);
    }

    for (const team of nbaTeams.slice(0, 30)) { // All NBA teams
      console.log(`[Seed] Fetching NBA schedule for ${team.name}...`);
      await SportsAPI.getNBASchedule(team.id);
      requestCount++; // 2 requests per team (home + away)
      await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay to avoid rate limits
    }

    // NBA Standings
    console.log('[Seed] Fetching NBA standings...');
    await SportsAPI.getNBAStandings();
    requestCount++;

    // Delay between sports
    console.log('[Seed] Pausing before NFL...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // NFL Teams and Schedule
    console.log('[Seed] Fetching NFL teams...');
    const allNflTeams = await SportsAPI.searchNFLTeams('');
    requestCount++;

    // Filter teams with logos only
    const nflTeams = allNflTeams.filter(team => team.logo != null);
    console.log(`[Seed] Filtered to ${nflTeams.length} NFL teams with logos (from ${allNflTeams.length} total)`);

    // Save NFL teams to cache (batch insert)
    const { error: nflTeamsError } = await supabase.from('teams_cache').upsert(
      nflTeams.map(team => ({
        api_id: team.id,
        league_type: 'nfl',
        data: team,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: 'api_id' }
    );
    if (nflTeamsError) console.error(`[Seed] Error saving NFL teams:`, nflTeamsError);

    for (const team of nflTeams.slice(0, 32)) { // All NFL teams
      console.log(`[Seed] Fetching NFL schedule for ${team.name}...`);
      await SportsAPI.getNFLSchedule(team.id);
      requestCount++;
      await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay to avoid rate limits
    }

    // NFL Standings
    console.log('[Seed] Fetching NFL standings...');
    await SportsAPI.getNFLStandings();
    requestCount++;

    // Delay between sports
    console.log('[Seed] Pausing before MLB...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // MLB Teams and Schedule
    console.log('[Seed] Fetching MLB teams...');
    const allMlbTeams = await SportsAPI.searchMLBTeams('');
    requestCount++;

    // Filter teams with logos only
    const mlbTeams = allMlbTeams.filter(team => team.logo != null);
    console.log(`[Seed] Filtered to ${mlbTeams.length} MLB teams with logos (from ${allMlbTeams.length} total)`);

    // Save MLB teams to cache (batch insert)
    const { error: mlbTeamsError } = await supabase.from('teams_cache').upsert(
      mlbTeams.map(team => ({
        api_id: team.id,
        league_type: 'mlb',
        data: team,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: 'api_id' }
    );
    if (mlbTeamsError) console.error(`[Seed] Error saving MLB teams:`, mlbTeamsError);

    for (const team of mlbTeams.slice(0, 30)) { // All MLB teams
      console.log(`[Seed] Fetching MLB schedule for ${team.name}...`);
      await SportsAPI.getMLBSchedule(team.id);
      requestCount++;
      await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay to avoid rate limits
    }

    // MLB Standings
    console.log('[Seed] Fetching MLB standings...');
    await SportsAPI.getMLBStandings();
    requestCount++;

    // Delay between sports
    console.log('[Seed] Pausing before NHL...');
    await new Promise(resolve => setTimeout(resolve, 1000));

    // NHL Teams and Schedule
    console.log('[Seed] Fetching NHL teams...');
    const allNhlTeams = await SportsAPI.searchNHLTeams('');
    requestCount++;

    // Filter teams with logos only
    const nhlTeams = allNhlTeams.filter(team => team.logo != null);
    console.log(`[Seed] Filtered to ${nhlTeams.length} NHL teams with logos (from ${allNhlTeams.length} total)`);

    // Save NHL teams to cache (batch insert)
    const { error: nhlTeamsError } = await supabase.from('teams_cache').upsert(
      nhlTeams.map(team => ({
        api_id: team.id,
        league_type: 'nhl',
        data: team,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: 'api_id' }
    );
    if (nhlTeamsError) console.error(`[Seed] Error saving NHL teams:`, nhlTeamsError);

    for (const team of nhlTeams.slice(0, 32)) { // All NHL teams
      console.log(`[Seed] Fetching NHL schedule for ${team.name}...`);
      await SportsAPI.getNHLSchedule(team.id);
      requestCount++;
      await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay to avoid rate limits
    }

    // NHL Standings
    console.log('[Seed] Fetching NHL standings...');
    await SportsAPI.getNHLStandings();
    requestCount++;

    // Mark as seeded
    await markSportsDataSeeded();

    console.log(`[Seed] Complete! Used ${requestCount} API requests`);

    return {
      success: true,
      message: `Successfully seeded sports data. Used ${requestCount} API requests.`,
      requestsUsed: requestCount,
    };
  } catch (error) {
    console.error('[Seed] Error seeding sports data:', error);
    return {
      success: false,
      message: `Error seeding sports data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      requestsUsed: requestCount,
    };
  }
}

/**
 * Check and run seed if needed
 * Call this from app initialization
 */
export async function checkAndSeed(): Promise<void> {
  const alreadySeeded = await isSportsDataSeeded();

  if (!alreadySeeded) {
    console.log('[Seed] First-time setup detected. Running seed...');
    const result = await seedSportsData();

    if (result.success) {
      console.log('[Seed] ✓ Seed completed successfully');
    } else {
      console.error('[Seed] ✗ Seed failed:', result.message);
    }
  }
}
