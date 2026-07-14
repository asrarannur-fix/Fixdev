import React from "react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = "",
}) => {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      {icon && (
        <div className="mb-4 text-slate-300 dark:text-zinc-600">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-black text-slate-700 dark:text-zinc-300 mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-xs text-slate-400 dark:text-zinc-500 max-w-sm mb-4">
          {description}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
};
