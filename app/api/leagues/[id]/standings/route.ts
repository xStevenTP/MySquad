import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/utils/rate-limit';
import { getCachedStandings } from '@/lib/cache/cache-utils';
import { getLeagueStandings } from '@/lib/api/unified-api';
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
    const { searchParams } = new URL(request.url);
    const leagueType = searchParams.get('leagueType') as LeagueType;

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!leagueType) {
      return NextResponse.json(
        { error: 'leagueType query parameter is required' },
        { status: 400 }
      );
    }

    // Get cached standings or fetch from API
    const standings = await getCachedStandings(
      id,
      leagueType,
      () => getLeagueStandings(id, leagueType)
    );

    return NextResponse.json({ standings });
  } catch (error) {
    console.error('Error fetching standings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch standings' },
      { status: 500 }
    );
  }
}
