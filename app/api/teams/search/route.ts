import { NextRequest, NextResponse } from 'next/server';
import { searchTeams } from '@/lib/api/unified-api';
import { rateLimit } from '@/lib/utils/rate-limit';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Validation schema
const searchSchema = z.object({
  query: z.string().min(2, 'Query must be at least 2 characters').max(100, 'Query too long'),
});

export async function POST(request: NextRequest) {
  // Check rate limit - increased for search typing
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
    const validation = searchSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.format() },
        { status: 400 }
      );
    }

    const { query } = validation.data;

    const results = await searchTeams(query);

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Error searching teams:', error);
    return NextResponse.json(
      { error: 'Failed to search teams' },
      { status: 500 }
    );
  }
}
