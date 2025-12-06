import { format, formatDistanceToNow, parseISO, isPast, isFuture, isToday } from 'date-fns';

/**
 * Format a game date/time for display in user's local timezone
 */
export function formatGameTime(dateString: string, userTimezone?: string): string {
  const date = parseISO(dateString);
  return format(date, 'MMM d, yyyy h:mm a');
}

/**
 * Get relative time (e.g., "2 hours ago", "in 3 days")
 */
export function getRelativeTime(dateString: string): string {
  const date = parseISO(dateString);
  return formatDistanceToNow(date, { addSuffix: true });
}

/**
 * Check if a game is currently live
 * Assumes a game lasts approximately 3 hours
 */
export function isGameLive(startTime: string, endTime?: string, durationHours: number = 3): boolean {
  const start = parseISO(startTime);
  const now = new Date();

  if (endTime) {
    const end = parseISO(endTime);
    return now >= start && now <= end;
  }

  // If no end time, estimate based on duration
  const estimatedEnd = new Date(start.getTime() + durationHours * 60 * 60 * 1000);
  return now >= start && now <= estimatedEnd;
}

/**
 * Check if a game has finished
 */
export function isGameFinished(dateString: string, endTime?: string): boolean {
  if (endTime) {
    return isPast(parseISO(endTime));
  }
  // If no end time, consider finished if more than 3 hours past start
  const start = parseISO(dateString);
  const estimatedEnd = new Date(start.getTime() + 3 * 60 * 60 * 1000);
  return isPast(estimatedEnd);
}

/**
 * Check if a game is upcoming
 */
export function isGameUpcoming(dateString: string): boolean {
  return isFuture(parseISO(dateString));
}

/**
 * Check if a game is happening today
 */
export function isGameToday(dateString: string): boolean {
  return isToday(parseISO(dateString));
}

/**
 * Format date for display (short format)
 */
export function formatShortDate(dateString: string): string {
  const date = parseISO(dateString);
  return format(date, 'MMM d');
}

/**
 * Format time only
 */
export function formatTime(dateString: string): string {
  const date = parseISO(dateString);
  return format(date, 'h:mm a');
}

/**
 * Categorize games into past, live, and upcoming
 */
export function categorizeGames<T extends { date: string; endTime?: string }>(
  games: T[]
): {
  past: T[];
  live: T[];
  upcoming: T[];
} {
  const past: T[] = [];
  const live: T[] = [];
  const upcoming: T[] = [];

  games.forEach((game) => {
    if (isGameLive(game.date, game.endTime)) {
      live.push(game);
    } else if (isGameFinished(game.date, game.endTime)) {
      past.push(game);
    } else {
      upcoming.push(game);
    }
  });

  return { past, live, upcoming };
}

/**
 * Get game status as a string
 */
export function getGameStatus(startTime: string, endTime?: string): 'past' | 'live' | 'upcoming' {
  if (isGameLive(startTime, endTime)) {
    return 'live';
  } else if (isGameFinished(startTime, endTime)) {
    return 'past';
  }
  return 'upcoming';
}
