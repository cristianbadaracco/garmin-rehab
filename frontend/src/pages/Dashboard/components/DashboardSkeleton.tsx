function Shimmer({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-white/5 ${className}`} />;
}

function MetricCardsSkeleton() {
  return (
    <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border-subtle bg-bg-card p-4">
          <Shimmer className="h-3 w-16" />
          <Shimmer className="mt-2 h-7 w-20" />
        </div>
      ))}
    </div>
  );
}

function ChartCardSkeleton() {
  return (
    <div className="rounded-xl border border-border-subtle bg-bg-card p-5">
      <Shimmer className="mb-4 h-4 w-32" />
      <Shimmer className="h-[200px] w-full" />
    </div>
  );
}

function ChartsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <ChartCardSkeleton key={i} />
      ))}
    </div>
  );
}

function ActivityListSkeleton() {
  return (
    <div className="rounded-xl border border-border-subtle bg-bg-card p-5">
      <Shimmer className="mb-4 h-4 w-36" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-lg border border-border-subtle bg-bg-primary p-3"
          >
            <div className="space-y-1.5">
              <Shimmer className="h-4 w-28" />
              <Shimmer className="h-3 w-16" />
            </div>
            <div className="flex gap-4">
              <Shimmer className="h-4 w-12" />
              <Shimmer className="h-4 w-12" />
              <Shimmer className="h-4 w-14" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Shimmer className="h-7 w-32" />
          <Shimmer className="mt-2 h-4 w-56" />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-border-subtle">
            {Array.from({ length: 4 }).map((_, i) => (
              <Shimmer key={i} className="m-1.5 h-5 w-8" />
            ))}
          </div>
          <Shimmer className="h-8 w-24 rounded-lg" />
          <Shimmer className="h-8 w-24 rounded-lg" />
        </div>
      </div>

      <MetricCardsSkeleton />
      <ChartsGridSkeleton />
      <div className="mt-6">
        <ActivityListSkeleton />
      </div>
    </div>
  );
}
