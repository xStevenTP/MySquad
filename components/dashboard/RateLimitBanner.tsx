'use client';

interface RateLimitBannerProps {
  resetAt?: Date | string | null;
  message?: string;
}

export default function RateLimitBanner({ resetAt, message }: RateLimitBannerProps) {
  if (!resetAt) return null;

  const resetDate = typeof resetAt === 'string' ? new Date(resetAt) : resetAt;
  const resetTimeString = resetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/50 rounded-xl p-4 mb-6">
      <div className="flex items-center gap-3">
        {/* Warning Icon */}
        <div className="flex-shrink-0">
          <svg
            className="w-6 h-6 text-yellow-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Message Content */}
        <div className="flex-1 min-w-0">
          <p className="text-yellow-400 font-semibold text-sm">
            {message || 'Rate Limit Reached'}
          </p>
          <p className="text-white/70 text-sm mt-1">
            Please wait until <span className="font-semibold text-white">{resetTimeString}</span> before trying again
          </p>
        </div>

        {/* Time Badge */}
        <div className="flex-shrink-0">
          <div className="px-3 py-2 bg-yellow-500/20 border border-yellow-500/40 rounded-lg">
            <p className="text-xs text-yellow-400 font-mono whitespace-nowrap">
              Resets at {resetTimeString}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
