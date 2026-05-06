import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, CheckCircle2, Circle } from 'lucide-react'
import { createServiceClient } from '@/lib/supabase/service'
import { getMediaItemById } from '@/lib/supabase/media'
import { getSeasonsWithEpisodes } from '@/lib/supabase/progress'
import { getTopCast } from '@/lib/tmdb/tmdb.service'
import { Badge } from '@/components/ui/badge'
import { CastList } from '@/components/media/CastList'
import { MediaPoster } from '@/components/media/MediaPoster'
import {
  MEDIA_STATUS_LABELS,
  MEDIA_TYPE_LABELS,
  type Profile,
  type SeasonWithEpisodes,
} from '@/types'

export const dynamic = 'force-dynamic'

interface PublicMediaDetailPageProps {
  params: Promise<{ username: string; id: string }>
}

function formatRating(rating: number | null): string {
  if (rating == null) return 'Без оценки'
  return `${Number.isInteger(rating) ? rating.toFixed(0) : rating.toFixed(1)}/10`
}

function formatDate(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function ReadOnlyProgress({ seasons }: { seasons: SeasonWithEpisodes[] }) {
  const totalEpisodes = seasons.reduce((sum, season) => sum + season.episodes.length, 0)
  const watchedEpisodes = seasons.reduce(
    (sum, season) => sum + season.episodes.filter((episode) => episode.is_watched).length,
    0
  )

  if (totalEpisodes === 0) return null

  return (
    <section className="space-y-3" aria-labelledby="readonly-progress-heading">
      <div className="flex items-center gap-2">
        <h2
          id="readonly-progress-heading"
          className="text-sm font-medium text-muted-foreground uppercase tracking-wider"
        >
          Прогресс
        </h2>
        <Badge variant="outline" className="text-xs">
          {watchedEpisodes}/{totalEpisodes} эп.
        </Badge>
      </div>

      <div className="space-y-2">
        {seasons.map((season) => {
          const watchedCount = season.episodes.filter((episode) => episode.is_watched).length
          const totalCount = season.episodes.length

          return (
            <details
              key={season.id}
              className="group rounded-lg border border-border/50 bg-card/35 px-4 py-3"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm">
                <span className="font-medium">{season.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {watchedCount}/{totalCount} эп.
                </span>
              </summary>
              <div className="mt-3 space-y-0.5 border-t border-border/40 pt-3">
                {season.episodes.map((episode) => (
                  <div
                    key={episode.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded px-1 py-1.5 text-sm"
                  >
                    {episode.is_watched ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-orange-500" />
                    ) : (
                      <Circle className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                    )}
                    <span className="w-8 shrink-0 font-mono text-xs text-muted-foreground">
                      E{String(episode.episode_number).padStart(2, '0')}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{episode.name}</span>
                    {episode.is_filler && (
                      <Badge
                        variant="outline"
                        className="shrink-0 border-amber-500/30 px-1.5 py-0 text-xs text-amber-500/70"
                      >
                        Филлер
                      </Badge>
                    )}
                    {episode.runtime_minutes !== null && (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {episode.runtime_minutes} мин
                      </span>
                    )}
                    {episode.is_watched && episode.watched_at && (
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatDate(episode.watched_at)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </details>
          )
        })}
      </div>
    </section>
  )
}

export default async function PublicMediaDetailPage({ params }: PublicMediaDetailPageProps) {
  const { username, id } = await params
  const service = createServiceClient()

  const { data: profile, error: profileError } = await service
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single()

  if (profileError || !profile || !(profile as Profile).is_library_public) notFound()

  const typedProfile = profile as Profile
  const item = await getMediaItemById(service, id, typedProfile.id)
  if (!item) notFound()

  const tmdbMediaType = item.type === 'movie' || item.type === 'animation' ? 'movie' : 'tv'
  const [seasons, cast] = await Promise.all([
    item.type !== 'movie' && item.type !== 'animation'
      ? getSeasonsWithEpisodes(service, item.id)
      : Promise.resolve([]),
    getTopCast(item.tmdb_id, tmdbMediaType),
  ])

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          href={`/profile/${encodeURIComponent(username)}`}
          className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-orange-500/60"
        >
          <ArrowLeft className="h-4 w-4" />
          К профилю
        </Link>
        <span className="text-sm text-muted-foreground">Библиотека @{typedProfile.username}</span>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-8 md:grid-cols-[240px_minmax(0,1fr)]">
        <div className="flex justify-center md:justify-start">
          <MediaPoster
            posterUrl={item.poster_url}
            title={item.title}
            type={item.type}
          />
        </div>

        <div className="min-w-0 space-y-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-start gap-3">
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
            {item.genres.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {item.genres.map((genre) => (
                  <Badge key={genre} variant="outline" className="text-xs">
                    {genre}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              Статус: {MEDIA_STATUS_LABELS[item.status]}
            </Badge>
            <Badge variant="outline">
              Оценка: {formatRating(item.rating)}
            </Badge>
          </div>

          {item.overview && (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {item.overview}
            </p>
          )}

          <CastList cast={cast} />

          {item.type !== 'movie' && item.type !== 'animation' && (
            <ReadOnlyProgress seasons={seasons} />
          )}
        </div>
      </div>
    </div>
  )
}
