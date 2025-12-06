interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="text-center py-20">
      <div className="bg-white/10 backdrop-blur-lg rounded-xl p-12 border border-white/20 max-w-md mx-auto">
        {icon ? (
          <div className="mb-4">{icon}</div>
        ) : (
          <svg
            className="w-16 h-16 mx-auto mb-4 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
        )}
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-slate-400 mb-6">{description}</p>
        {action && (
          <button
            onClick={action.onClick}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}
