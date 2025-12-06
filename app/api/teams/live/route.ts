import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/utils/rate-limit';
import { getCachedSchedule } from '@/lib/cache/cache-utils';
import { getTeamSchedule } from '@/lib/api/unified-api';
import { isGameLive } from '@/lib/utils/timezone';
import type { LeagueType } from '@/types/database';

export async function GET(request: NextRequest) {
  // Check rate limit
  const rateLimitResponse = await rateLimit(request, { limit: 100, windowMs: 60 * 60 * 1000 });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all user teams
    const { data: teams, error: teamsError } = await supabase
      .from('user_teams')
      .select('*')
      .eq('user_id', user.id);

    if (teamsError || !teams) {
      return NextResponse.json({ liveGames: [] });
    }

    // Check each team for live games
    const liveGamesPromises = teams.map(async (team) => {
      try {
        const schedule = await getCachedSchedule(
          team.team_api_id,
          team.league_type as LeagueType,
          () => getTeamSchedule(team.team_api_id, team.league_type as LeagueType),
          { maxAge: 5 * 60 * 1000 } // 5 minute cache for live data
        );

        if (!Array.isArray(schedule)) {
          return [];
        }

        // Filter for live games
        const liveGames = schedule.filter((game: any) => {
          const startTime = game.date || game.scheduled_at || game.begin_at;
          const endTime = game.end_time || game.end_at;
          if (!startTime) return false;
          return isGameLive(startTime, endTime);
        });

        // Add team info to live games
        return liveGames.map((game: any) => ({
          ...game,
          teamInfo: {
            id: team.id,
            name: (team.team_data as any).name,
            logo: (team.team_data as any).logo,
            leagueName: (team.team_data as any).league_name,
          },
        }));
      } catch (error) {
        console.error(`Error checking live games for team ${team.team_api_id}:`, error);
        return [];
      }
    });

    const allLiveGames = await Promise.all(liveGamesPromises);
    const liveGames = allLiveGames.flat();

    return NextResponse.json({ liveGames });
  } catch (error) {
    console.error('Error fetching live games:', error);
    return NextResponse.json(
      { error: 'Failed to fetch live games' },
      { status: 500 }
    );
  }
}
