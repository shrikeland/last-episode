export default function MediaLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Back button skeleton */}
      <div className="h-8 w-20 bg-muted/20 animate-pulse rounded mb-6" />

      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8">
        {/* Poster skeleton */}
        <div className="flex justify-center md:justify-start">
          <div className="w-[200px] md:w-[240px] aspect-[2/3] bg-muted/20 animate-pulse rounded-lg" />
        </div>
        {/* Info skeleton */}
        <div className="space-y-6">
          {/* Title & badge */}
          <div className="space-y-2">
            <div className="flex items-start gap-3 flex-wrap">
              <div className="h-8 w-3/4 bg-muted/20 animate-pulse rounded" />
              <div className="h-6 w-16 bg-muted/20 animate-pulse rounded" />
            </div>
            <div className="h-4 w-1/2 bg-muted/20 animate-pulse rounded" />
            <div className="flex gap-2">
              <div className="h-5 w-16 bg-muted/20 animate-pulse rounded" />
              <div className="h-5 w-16 bg-muted/20 animate-pulse rounded" />
              <div className="h-5 w-16 bg-muted/20 animate-pulse rounded" />
            </div>
          </div>
          {/* Status + Rating */}
          <div className="flex items-center gap-6 flex-wrap">
            <div className="h-10 w-40 bg-muted/20 animate-pulse rounded" />
            <div className="h-10 w-32 bg-muted/20 animate-pulse rounded" />
          </div>
          {/* Overview lines */}
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-4 bg-muted/20 animate-pulse rounded"
                style={{ width: `${85 - i * 10}%` }}
              />
            ))}
          </div>
          {/* Notes area */}
          <div className="h-24 bg-muted/20 animate-pulse rounded" />
        </div>
      </div>
    </div>
  )
}
