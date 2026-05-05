function StatCardsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border/50 bg-card p-6 space-y-2">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 bg-muted/20 animate-pulse rounded" />
          <div className="h-4 w-44 bg-muted/20 animate-pulse rounded" />
        </div>
        <div className="h-9 w-40 bg-muted/20 animate-pulse rounded" />
        <div className="h-4 w-32 bg-muted/20 animate-pulse rounded" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/50 bg-card p-4 space-y-2">
            <div className="h-3 w-16 bg-muted/20 animate-pulse rounded" />
            <div className="h-8 w-10 bg-muted/20 animate-pulse rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}

function LibrarySectionSkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="h-5 w-5 bg-muted/20 animate-pulse rounded" />
        <div className="h-5 w-24 bg-muted/20 animate-pulse rounded" />
      </div>
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex-shrink-0 w-[140px] sm:w-[152px]">
            <div className="rounded-lg bg-card border border-border overflow-hidden">
              <div className="aspect-[2/3] bg-muted/20 animate-pulse" />
              <div className="p-2 space-y-1">
                <div className="h-3 w-3/4 bg-muted/20 animate-pulse rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ProfileLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-muted/20 animate-pulse shrink-0" />
        <div className="space-y-2">
          <div className="h-7 w-40 bg-muted/20 animate-pulse rounded" />
          <div className="h-4 w-32 bg-muted/20 animate-pulse rounded" />
        </div>
      </div>

      <section className="space-y-4">
        <div className="h-6 w-28 bg-muted/20 animate-pulse rounded" />
        <StatCardsSkeleton />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
            <div className="h-3 w-20 bg-muted/20 animate-pulse rounded" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-muted/20 animate-pulse shrink-0" />
                  <div className="h-4 flex-1 bg-muted/20 animate-pulse rounded" />
                  <div className="h-4 w-6 bg-muted/20 animate-pulse rounded" />
                  <div className="h-3 w-10 bg-muted/20 animate-pulse rounded" />
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-border/50 bg-card p-6 space-y-4">
            <div className="h-3 w-24 bg-muted/20 animate-pulse rounded" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-4 bg-muted/20 animate-pulse rounded" />
                      <div className="h-4 w-20 bg-muted/20 animate-pulse rounded" />
                    </div>
                    <div className="h-4 w-6 bg-muted/20 animate-pulse rounded" />
                  </div>
                  <div className="h-1.5 rounded-full bg-border/50" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="h-6 w-24 bg-muted/20 animate-pulse rounded" />
        <div className="space-y-10">
          <LibrarySectionSkeleton />
          <LibrarySectionSkeleton />
        </div>
      </section>
    </div>
  )
}