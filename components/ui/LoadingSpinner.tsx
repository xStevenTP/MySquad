interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'green' | 'white';
  className?: string;
}

export default function LoadingSpinner({
  size = 'md',
  color = 'blue',
  className = ''
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-5 w-5 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-4',
  };

  const colorClasses = {
    blue: 'border-blue-500 border-t-transparent',
    green: 'border-green-500 border-t-transparent',
    white: 'border-white border-t-transparent',
  };

  return (
    <div
      className={`animate-spin rounded-full ${sizeClasses[size]} ${colorClasses[color]} ${className}`}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}
