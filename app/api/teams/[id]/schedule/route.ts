import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/utils/rate-limit';
import { getTeamSchedule } from '@/lib/api/unified-api';
import type { LeagueType } from '@/types/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check rate limit
  const rateLimitResponse = await rateLimit(request, { limit: 100, windowMs: 60 * 60 * 1000 });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const supabase = await createClient();
    const { id } = await params;

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get team info from user_teams
    const { data: team, error: teamError } = await supabase
      .from('user_teams')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (teamError || !team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Get schedule - uses game_cache internally which has proper scores
    const schedule = await getTeamSchedule(team.team_api_id, team.league_type as LeagueType);

    // Debug: log first game to check if scores are present
    if (Array.isArray(schedule) && schedule.length > 0) {
      console.log('[Schedule API] First game returned:', JSON.stringify(schedule[0], null, 2));
    }

    return NextResponse.json({ schedule });
  } catch (error) {
    console.error('Error fetching schedule:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schedule' },
      { status: 500 }
    );
  }
}
