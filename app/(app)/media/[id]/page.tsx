import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerClient, getServerUser } from '@/lib/supabase/server'
import { getMediaItemById } from '@/lib/supabase/media'
import { Badge, badgeVariants } from '@/components/ui/badge'
import { BackButton } from '@/components/media/BackButton'
import { MediaPoster } from '@/components/media/MediaPoster'
import { StatusSelect } from '@/components/media/StatusSelect'
import { RatingInput } from '@/components/media/RatingInput'
import { NotesEditor } from '@/components/media/NotesEditor'
import {
  CastSection,
  FriendsSection,
  RecommendationsSection,
  SeasonsSection,
  SectionSkeleton,
} from '@/components/media/MediaDetailSections'
import { MEDIA_TYPE_LABELS } from '@/types'
import { capitalizeGenre, toCanonicalGenres } from '@/lib/genres'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function MediaDetailPage({ params }: PageProps) {
  const { id } = await params
  const user = await getServerUser()
  if (!user) return null

  const supabase = await createServerClient()

  const item = await getMediaItemById(supabase, id, user.id)
  if (!item) notFound()

  const isSeries = item.type !== 'movie' && item.type !== 'animation'
  // Бейджи — канонические жанры, как в фильтре библиотеки: сериальный «Боевик и Приключения»
  // раскладывается на «Боевик» и «Приключения», у каждого своя ссылка. Порядок TMDB сохраняем
  const genres = [...new Set(item.genres.flatMap(toCanonicalGenres))]

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <BackButton />

      <div className="grid min-w-0 grid-cols-1 gap-8 md:grid-cols-[240px_minmax(0,1fr)]">
        {/* Left column — poster */}
        <div className="flex justify-center md:justify-start">
          <MediaPoster
            posterUrl={item.poster_url}
            title={item.title}
            type={item.type}
          />
        </div>

        {/* Right column — details */}
        <div className="min-w-0 space-y-6">
          {/* Title & meta */}
          <div className="space-y-2">
            <div className="flex items-start gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">{item.title}</h1>
              <Badge variant="secondary">{MEDIA_TYPE_LABELS[item.type]}</Badge>
            </div>
            {(item.original_title || item.release_year != null) && (
              <p className="text-sm text-muted-foreground">
                {item.original_title}
                {item.original_title && item.release_year ? ' · ' : ''}
                {item.release_year}
              </p>
            )}
            {genres.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {genres.map((g) => (
                  <Link
                    key={g}
                    href={`/library?genre=${encodeURIComponent(g)}`}
                    className={cn(badgeVariants({ variant: 'outline' }), 'text-xs hover:text-primary')}
                    data-testid="media-genre-link"
                  >
                    {capitalizeGenre(g)}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Status + Rating */}
          <div className="flex items-center gap-6 flex-wrap">
            <StatusSelect
              mediaItemId={item.id}
              currentStatus={item.status}
              mediaType={item.type}
            />
            <RatingInput
              mediaItemId={item.id}
              currentRating={item.rating}
            />
          </div>

          <Suspense fallback={null}>
            <FriendsSection userId={user.id} item={item} />
          </Suspense>

          {/* Overview */}
          {item.overview && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {item.overview}
            </p>
          )}

          <Suspense fallback={<SectionSkeleton className="h-28" />}>
            <CastSection tmdbId={item.tmdb_id} isSeries={isSeries} />
          </Suspense>

          {/* Notes */}
          <NotesEditor
            mediaItemId={item.id}
            initialNotes={item.notes}
          />

          <Suspense fallback={<SectionSkeleton className="h-56" />}>
            <RecommendationsSection item={item} />
          </Suspense>

          {/* Progress (tv/anime only) */}
          {isSeries && (
            <Suspense fallback={<SectionSkeleton className="h-64" />}>
              <SeasonsSection item={item} />
            </Suspense>
          )}
        </div>
      </div>
    </div>
  )
}
