export default function SearchLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-32 bg-muted/20 animate-pulse rounded" />
        <div className="h-4 w-80 max-w-full bg-muted/20 animate-pulse rounded" />
      </div>
      {/* Search input */}
      <div className="h-10 w-full bg-muted/20 animate-pulse rounded-md" />
    </div>
  )
}
