/**
 * Persistent rate limiter using Supabase
 * Uses per-IP tracking for production deployment
 */

import { createClient } from '@/lib/supabase/server';

interface RateLimitOptions {
  limit: number; // Max requests per window
  windowMs: number; // Time window in milliseconds
}

/**
 * Check if a request should be rate limited
 * Uses Supabase for persistent storage across serverless cold starts
 */
export async function checkRateLimit(
  ipAddress: string,
  endpoint: string,
  options: RateLimitOptions = { limit: 100, windowMs: 60 * 60 * 1000 } // Default: 100 req/hour
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const supabase = await createClient();
  const now = new Date();
  const resetAt = new Date(now.getTime() + options.windowMs);

  // Try to get existing rate limit record
  const { data: existing, error: fetchError } = await supabase
    .from('rate_limits')
    .select('*')
    .eq('ip_address', ipAddress)
    .eq('endpoint', endpoint)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    // PGRST116 = not found, which is expected
    // Log other errors but allow request (fail open for availability)
    if (process.env.NODE_ENV === 'development') {
      console.error('[Rate Limit] Error fetching rate limit:', fetchError);
    }
    return { allowed: true, remaining: options.limit - 1, resetTime: resetAt.getTime() };
  }

  // No entry or window expired - create/reset entry
  if (!existing || new Date(existing.reset_at) < now) {
    const { error: upsertError } = await supabase
      .from('rate_limits')
      .upsert({
        ip_address: ipAddress,
        endpoint,
        request_count: 1,
        window_start: now.toISOString(),
        reset_at: resetAt.toISOString(),
        updated_at: now.toISOString(),
      }, {
        onConflict: 'ip_address,endpoint'
      });

    if (upsertError) {
      if (process.env.NODE_ENV === 'development') {
        console.error('[Rate Limit] Error creating rate limit entry:', upsertError);
      }
      return { allowed: true, remaining: options.limit - 1, resetTime: resetAt.getTime() };
    }

    return {
      allowed: true,
      remaining: options.limit - 1,
      resetTime: resetAt.getTime(),
    };
  }

  // Entry exists and window not expired - check count
  const existingResetTime = new Date(existing.reset_at).getTime();

  if (existing.request_count >= options.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: existingResetTime,
    };
  }

  // Increment count
  const newCount = existing.request_count + 1;
  const { error: updateError } = await supabase
    .from('rate_limits')
    .update({
      request_count: newCount,
      updated_at: now.toISOString(),
    })
    .eq('ip_address', ipAddress)
    .eq('endpoint', endpoint);

  if (updateError) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Rate Limit] Error updating rate limit count:', updateError);
    }
    return { allowed: true, remaining: options.limit - existing.request_count, resetTime: existingResetTime };
  }

  return {
    allowed: true,
    remaining: options.limit - newCount,
    resetTime: existingResetTime,
  };
}

/**
 * Rate limit middleware for API routes
 */
export async function rateLimit(
  request: Request,
  options?: RateLimitOptions
): Promise<Response | null> {
  // Get IP address from request
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : 'unknown';

  // Extract endpoint from URL for per-endpoint rate limiting
  const url = new URL(request.url);
  const endpoint = url.pathname;

  const result = await checkRateLimit(ip, endpoint, options);

  if (!result.allowed) {
    const resetDate = new Date(result.resetTime);
    const retryAfterSeconds = Math.ceil((result.resetTime - Date.now()) / 1000);

    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        retryAfter: retryAfterSeconds,
        resetAt: resetDate.toISOString(),
        message: `Too many requests. Try again at ${resetDate.toLocaleTimeString()}`,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': retryAfterSeconds.toString(),
          'X-RateLimit-Limit': options?.limit?.toString() || '100',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': resetDate.toISOString(),
        },
      }
    );
  }

  return null; // Request allowed
}
