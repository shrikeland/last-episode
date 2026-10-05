export default function RecommendationsLoading() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-36 bg-muted/20 animate-pulse rounded" />
        <div className="h-4 w-96 max-w-full bg-muted/20 animate-pulse rounded" />
      </div>
      {/* Taste profile card */}
      <div className="h-28 bg-muted/20 animate-pulse rounded-lg" />
      {/* Questionnaire */}
      <div className="h-72 bg-muted/20 animate-pulse rounded-lg" />
    </div>
  )
}
