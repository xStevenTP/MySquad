import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/utils/rate-limit';

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
    const { data: teams, error } = await supabase
      .from('user_teams')
      .select('*')
      .eq('user_id', user.id)
      .order('added_at', { ascending: false });

    if (error) {
      console.error('Error fetching teams:', error);
      return NextResponse.json(
        { error: 'Failed to fetch teams' },
        { status: 500 }
      );
    }

    return NextResponse.json({ teams });
  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json(
      { error: 'Failed to fetch teams' },
      { status: 500 }
    );
  }
}
