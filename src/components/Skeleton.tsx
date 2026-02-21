interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div className={`animate-pulse bg-surface-700/50 rounded ${className}`} />
  );
}

export function ChatSkeleton() {
  return (
    <div className="space-y-6 p-4 max-w-3xl mx-auto">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="w-8 h-8 rounded-lg flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            {i % 2 === 0 && <Skeleton className="h-4 w-1/2" />}
          </div>
        </div>
      ))}
    </div>
  );
}

export function SidebarSkeleton() {
  return (
    <div className="space-y-1.5 px-3 py-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-2 px-3 py-2.5">
          <Skeleton className="w-4 h-4 rounded" />
          <Skeleton className="h-3.5 flex-1" />
        </div>
      ))}
    </div>
  );
}

export function DocumentSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 bg-surface-800 border border-surface-700 rounded-lg">
          <Skeleton className="w-5 h-5 rounded flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-2.5 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="space-y-6 max-w-2xl mx-auto p-8">
      <Skeleton className="h-6 w-32" />
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}
