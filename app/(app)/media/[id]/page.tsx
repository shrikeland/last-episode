import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { getMediaItemById } from '@/lib/supabase/media'
import { getSeasonsWithEpisodes } from '@/lib/supabase/progress'
import { Badge } from '@/components/ui/badge'
import { BackButton } from '@/components/media/BackButton'
import { MediaPoster } from '@/components/media/MediaPoster'
import { StatusSelect } from '@/components/media/StatusSelect'
import { RatingInput } from '@/components/media/RatingInput'
import { NotesEditor } from '@/components/media/NotesEditor'
import { SeasonAccordion } from '@/components/media/SeasonAccordion'
import { MEDIA_TYPE_LABELS } from '@/types'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function MediaDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const item = await getMediaItemById(supabase, id, user.id)
  if (!item) notFound()

  const seasons =
    (item.type !== 'movie' && item.type !== 'animation')
      ? await getSeasonsWithEpisodes(supabase, id)
      : []

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <BackButton />

      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8">
        {/* Left column — poster */}
        <div className="flex justify-center md:justify-start">
          <MediaPoster
            posterUrl={item.poster_url}
            title={item.title}
            type={item.type}
          />
        </div>

        {/* Right column — details */}
        <div className="space-y-6">
          {/* Title & meta */}
          <div className="space-y-2">
            <div className="flex items-start gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">{item.title}</h1>
              <Badge variant="secondary">{MEDIA_TYPE_LABELS[item.type]}</Badge>
            </div>
            {(item.original_title || item.release_year) && (
              <p className="text-sm text-muted-foreground">
                {item.original_title}
                {item.original_title && item.release_year ? ' · ' : ''}
                {item.release_year}
              </p>
            )}
            {item.genres.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {item.genres.map((g) => (
                  <Badge key={g} variant="outline" className="text-xs">
                    {g}
                  </Badge>
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

          {/* Overview */}
          {item.overview && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {item.overview}
            </p>
          )}

          {/* Notes */}
          <NotesEditor
            mediaItemId={item.id}
            initialNotes={item.notes}
          />

          {/* Progress (tv/anime only) */}
          {item.type !== 'movie' && seasons.length > 0 && (
            <SeasonAccordion
              seasons={seasons}
              mediaItemId={item.id}
            />
          )}
        </div>
      </div>
    </div>
  )
}