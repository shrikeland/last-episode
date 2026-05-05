function CardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="aspect-[2/3] bg-muted/20 animate-pulse" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-muted/20 animate-pulse rounded w-3/4" />
        <div className="h-3 bg-muted/20 animate-pulse rounded w-1/2" />
      </div>
    </div>
  )
}

export default function LibraryLoading() {
  return (
    <div className="space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-muted/20 animate-pulse rounded" />
        <div className="h-4 w-24 bg-muted/20 animate-pulse rounded" />
      </div>
      {/* Filter bar skeleton */}
      <div className="flex gap-3">
        <div className="h-10 flex-1 min-w-[200px] bg-muted/20 animate-pulse rounded" />
        <div className="h-10 w-[160px] bg-muted/20 animate-pulse rounded" />
        <div className="h-10 w-[180px] bg-muted/20 animate-pulse rounded" />
      </div>
      {/* Grid skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
