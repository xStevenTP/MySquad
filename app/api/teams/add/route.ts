import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/utils/rate-limit';
import { z } from 'zod';
import type { LeagueType } from '@/types/database';

// Validation schema
const addTeamSchema = z.object({
  teamApiId: z.string().min(1, 'Team API ID is required'),
  leagueType: z.enum(['nba', 'nfl', 'mlb', 'nhl', 'lol', 'csgo', 'valorant', 'dota2'], {
    message: 'Invalid league type'
  }),
  teamData: z.object({
    name: z.string().min(1, 'Team name is required'),
    logo: z.string().nullable().optional(),
    league_name: z.string().optional(),
  }),
});

export async function POST(request: NextRequest) {
  // Check rate limit - increased for user actions
  const rateLimitResponse = await rateLimit(request, { limit: 200, windowMs: 60 * 60 * 1000 });
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

    // Validate request body
    const body = await request.json();
    const validation = addTeamSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { teamApiId, leagueType, teamData } = validation.data;

    // Check if user already has 10 teams
    const { count } = await supabase
      .from('user_teams')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (count !== null && count >= 10) {
      return NextResponse.json(
        { error: 'Maximum 10 teams allowed' },
        { status: 400 }
      );
    }

    // Check if team already exists for this user
    const { data: existing } = await supabase
      .from('user_teams')
      .select('*')
      .eq('user_id', user.id)
      .eq('team_api_id', teamApiId)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Team already added to your dashboard' },
        { status: 400 }
      );
    }

    // Add team
    const { data, error } = await supabase
      .from('user_teams')
      .insert({
        user_id: user.id,
        team_api_id: teamApiId,
        league_type: leagueType as LeagueType,
        team_data: teamData,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding team:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to add team' },
        { status: 500 }
      );
    }

    return NextResponse.json({ team: data });
  } catch (error) {
    console.error('Error adding team:', error);
    return NextResponse.json({ error: 'Failed to add team' }, { status: 500 });
  }
}
