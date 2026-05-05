export default function StatsLoading() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-40 bg-muted/20 animate-pulse rounded" />
        <div className="h-4 w-56 bg-muted/20 animate-pulse rounded" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-lg p-4 space-y-2">
            <div className="h-4 w-20 bg-muted/20 animate-pulse rounded" />
            <div className="h-8 w-12 bg-muted/20 animate-pulse rounded" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="h-48 bg-muted/20 animate-pulse rounded-lg" />
        <div className="h-48 bg-muted/20 animate-pulse rounded-lg" />
      </div>
    </div>
  )
}
