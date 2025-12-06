/**
 * API Rate Limiter for External Sports APIs
 * Tracks daily usage to stay under provider limits (e.g., Highlightly: 100 req/day)
 * Database-backed to persist across server restarts
 */

import { createClient } from '@/lib/supabase/server';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetTime: Date;
  message?: string;
}

const API_LIMITS = {
  'highlightly-nba': 100,
  'highlightly-nfl': 100,
  'highlightly-mlb': 100,
  'highlightly-nhl': 100,
  pandascore: 1000, // per hour
} as const;

type ApiProvider = keyof typeof API_LIMITS;

/**
 * Check if API request is allowed based on daily limit
 */
export async function checkApiRateLimit(
  provider: ApiProvider
): Promise<RateLimitResult> {
  const supabase = await createClient();
  const limit = API_LIMITS[provider];

  try {
    // Get today's request count from database
    const { data, error } = await supabase.rpc('get_daily_api_count', {
      p_provider: provider
    });

    if (error) {
      console.error('[API Rate Limiter] Error checking rate limit:', error);
      // Allow request if we can't check (fail open)
      return {
        allowed: true,
        remaining: limit,
        limit,
        resetTime: getResetTime(),
        message: 'Rate limit check failed, proceeding with caution'
      };
    }

    const count = data || 0;
    const remaining = Math.max(0, limit - count);
    const allowed = count < limit;

    return {
      allowed,
      remaining,
      limit,
      resetTime: getResetTime(),
      message: allowed
        ? undefined
        : `Daily API limit reached (${limit}). Using cached data. Resets at midnight UTC.`
    };
  } catch (error) {
    console.error('[API Rate Limiter] Unexpected error:', error);
    // Fail open - allow request
    return {
      allowed: true,
      remaining: limit,
      limit,
      resetTime: getResetTime(),
    };
  }
}

/**
 * Log an API request to database
 */
export async function logApiRequest(
  provider: ApiProvider,
  endpoint: string,
  success: boolean = true,
  errorMessage?: string
): Promise<void> {
  const supabase = await createClient();

  try {
    const { error } = await supabase
      .from('api_request_log')
      .insert({
        api_provider: provider,
        endpoint,
        success,
        error_message: errorMessage,
      });

    if (error) {
      console.error('[API Rate Limiter] Failed to log request:', error);
    }
  } catch (error) {
    console.error('[API Rate Limiter] Error logging request:', error);
  }
}

/**
 * Get remaining requests for today
 */
export async function getRemainingRequests(
  provider: ApiProvider
): Promise<number> {
  const result = await checkApiRateLimit(provider);
  return result.remaining;
}

/**
 * Check if we're close to limit (within 10%)
 */
export async function isNearLimit(provider: ApiProvider): Promise<boolean> {
  const result = await checkApiRateLimit(provider);
  const threshold = result.limit * 0.9;
  const used = result.limit - result.remaining;
  return used >= threshold;
}

/**
 * Get time when rate limit resets (midnight UTC)
 */
function getResetTime(): Date {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return tomorrow;
}

/**
 * Get today's API usage stats
 */
export async function getApiUsageStats(provider: ApiProvider): Promise<{
  used: number;
  limit: number;
  remaining: number;
  percentUsed: number;
  resetTime: Date;
}> {
  const result = await checkApiRateLimit(provider);
  const used = result.limit - result.remaining;
  const percentUsed = (used / result.limit) * 100;

  return {
    used,
    limit: result.limit,
    remaining: result.remaining,
    percentUsed: Math.round(percentUsed),
    resetTime: result.resetTime,
  };
}

/**
 * Wrapper function to make API request with rate limiting
 */
export async function withRateLimit<T>(
  provider: ApiProvider,
  endpoint: string,
  fetchFn: () => Promise<T>
): Promise<{ data: T | null; rateLimited: boolean; message?: string }> {
  const rateLimit = await checkApiRateLimit(provider);

  console.log(`[API Rate Limiter] ${provider} - Used: ${rateLimit.limit - rateLimit.remaining}/${rateLimit.limit}, Remaining: ${rateLimit.remaining}`);

  if (!rateLimit.allowed) {
    console.warn(`[API Rate Limiter] ${provider} rate limit exceeded`);
    return {
      data: null,
      rateLimited: true,
      message: rateLimit.message,
    };
  }

  try {
    const data = await fetchFn();
    await logApiRequest(provider, endpoint, true);
    return {
      data,
      rateLimited: false,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await logApiRequest(provider, endpoint, false, errorMessage);
    throw error;
  }
}
