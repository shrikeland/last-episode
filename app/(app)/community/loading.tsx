export default function CommunityLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-36 bg-muted/20 animate-pulse rounded" />
        <div className="h-4 w-64 bg-muted/20 animate-pulse rounded" />
      </div>

      <div className="space-y-8">
        <div>
          <div className="h-3 w-12 bg-muted/20 animate-pulse rounded mb-3" />
          <div className="h-10 w-full bg-muted/20 animate-pulse rounded" />
        </div>

        <div className="border-t border-border pt-6 space-y-4">
          <div className="h-4 w-20 bg-muted/20 animate-pulse rounded" />
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-muted/20 animate-pulse shrink-0" />
                <div className="h-4 w-32 bg-muted/20 animate-pulse rounded" />
                <div className="ml-auto h-8 w-24 bg-muted/20 animate-pulse rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}