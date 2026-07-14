import React from "react";

interface SkeletonProps {
  className?: string;
  rounded?: string;
}

/** Single shimmering block used to build loading placeholders. */
export const Skeleton: React.FC<SkeletonProps> = ({
  className = "",
  rounded = "rounded-md",
}) => (
  <div
    className={`animate-pulse bg-slate-200/70 dark:bg-zinc-800/70 ${rounded} ${className}`}
    aria-hidden="true"
  />
);

/** Stacked text lines placeholder. */
export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({
  lines = 3,
  className = "",
}) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        className={`h-3 ${i === lines - 1 ? "w-2/3" : "w-full"}`}
      />
    ))}
  </div>
);

/** Card-shaped placeholder mirroring the standard Card surface. */
export const SkeletonCard: React.FC<{ className?: string }> = ({
  className = "",
}) => (
  <div
    className={`rounded-2xl border border-slate-200 dark:border-zinc-800 p-4 sm:p-5 ${className}`}
  >
    <div className="flex items-center gap-3 mb-4">
      <Skeleton className="w-10 h-10 rounded-xl" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-2.5 w-1/3" />
      </div>
    </div>
    <SkeletonText lines={3} />
  </div>
);

/** Table-shaped placeholder for list/table loading states. */
export const SkeletonRows: React.FC<{ rows?: number; className?: string }> = ({
  rows = 5,
  className = "",
}) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-3">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-1/5" />
        <Skeleton className="h-4 w-1/6 ml-auto" />
      </div>
    ))}
  </div>
);
