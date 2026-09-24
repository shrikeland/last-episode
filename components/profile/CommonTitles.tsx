import Image from 'next/image'
import Link from 'next/link'
import { Film, Star } from 'lucide-react'
import type { ReactNode } from 'react'
import { ScrollRow } from '@/components/library/ScrollRow'
import { ProfileAddToLibraryControl } from './ProfileAddToLibraryControl'
import { pluralize } from '@/lib/stats'
import type { LibraryComparison } from '@/lib/compare'
import type { MediaItem } from '@/types'

/** Сколько карточек показывать в ряду; счётчик «общих» при этом полный. */
const COMMON_LIMIT = 30
const FAVORITES_LIMIT = 20

interface CommonTitlesProps {
  username: string
  comparison: LibraryComparison<MediaItem>
}

function itemHref(username: string, item: MediaItem): string {
  return `/profile/${encodeURIComponent(username)}/media/${item.id}`
}

function Poster({ item, href }: { item: MediaItem; href: string }) {
  return (
    <Link
      href={href}
      className="block focus:outline-none focus:ring-2 focus:ring-primary/60"
      aria-label={`Открыть ${item.title}`}
    >
      <div className="relative aspect-[2/3] overflow-hidden bg-background">
        {item.poster_url ? (
          <Image
            src={item.poster_url}
            alt={item.title}
            fill
            className="object-cover"
            sizes="152px"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Film className="h-10 w-10 text-muted-foreground/40" />
          </div>
        )}
      </div>
    </Link>
  )
}

function RatingLine({ label, rating }: { label: string; rating: number | null }) {
  return (
    <div className="flex items-center justify-between gap-2 text-[11px]">
      <span className="truncate text-muted-foreground">{label}</span>
      {rating != null ? (
        <span className="flex flex-shrink-0 items-center gap-0.5 font-semibold tabular-nums text-primary">
          <Star className="h-2.5 w-2.5 fill-current" />
          {rating}
        </span>
      ) : (
        <span className="flex-shrink-0 text-muted-foreground">—</span>
      )}
    </div>
  )
}

function CardShell({ children }: { children: ReactNode }) {
  return (
    <div className="w-[140px] flex-shrink-0 sm:w-[152px]">
      <div className="flex h-full flex-col overflow-hidden rounded-[10px] border border-border bg-card">
        {children}
      </div>
    </div>
  )
}

function CardTitle({ item, href }: { item: MediaItem; href: string }) {
  return (
    <Link
      href={href}
      className="line-clamp-2 min-h-[2.7em] text-[12.5px] font-semibold leading-[1.35] hover:text-primary"
    >
      {item.title}
    </Link>
  )
}

/** Блок «Что у нас общего» на профиле друга. Серверный: клиентские только ScrollRow и кнопка «Добавить». */
export function CommonTitles({ username, comparison }: CommonTitlesProps) {
  const { common, theirFavoritesMissing, theirFavoritesTotal } = comparison
  const commonCount = common.length

  return (
    <section className="space-y-6" data-testid="common-titles">
      <h2 className="text-lg font-semibold">Что у нас общего</h2>

      <div className="space-y-3" data-testid="common-watched">
        <h3 className="text-base font-semibold tracking-tight">Смотрели оба</h3>
        {commonCount === 0 ? (
          <p className="text-sm text-muted-foreground">Пока ни одного общего тайтла</p>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              У вас {commonCount} {pluralize(commonCount, 'общий тайтл', 'общих тайтла', 'общих тайтлов')}
              {commonCount > 1 && ' — сначала те, где оценки расходятся сильнее всего'}
            </p>
            <ScrollRow>
              {common.slice(0, COMMON_LIMIT).map(({ mine, theirs }) => {
                const href = itemHref(username, theirs)
                return (
                  <CardShell key={theirs.id}>
                    <Poster item={theirs} href={href} />
                    <div className="flex flex-1 flex-col gap-2 p-2.5">
                      <CardTitle item={theirs} href={href} />
                      <div className="mt-auto space-y-1">
                        <RatingLine label={`@${username}`} rating={theirs.rating} />
                        <RatingLine label="Вы" rating={mine.rating} />
                      </div>
                    </div>
                  </CardShell>
                )
              })}
            </ScrollRow>
          </>
        )}
      </div>

      {theirFavoritesTotal > 0 && (
        <div className="space-y-3" data-testid="common-favorites">
          <h3 className="text-base font-semibold tracking-tight">
            Любимое @{username}, которого нет у вас
          </h3>
          {theirFavoritesMissing.length === 0 ? (
            <p className="text-sm text-muted-foreground">Всё любимое @{username} у вас уже есть</p>
          ) : (
            <ScrollRow>
              {theirFavoritesMissing.slice(0, FAVORITES_LIMIT).map((item) => {
                const href = itemHref(username, item)
                return (
                  <CardShell key={item.id}>
                    <Poster item={item} href={href} />
                    <div className="flex flex-1 flex-col gap-2 p-2.5">
                      <CardTitle item={item} href={href} />
                      <div className="mt-auto flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <RatingLine label={`@${username}`} rating={item.rating} />
                        </div>
                        <ProfileAddToLibraryControl
                          item={item}
                          iconOnly
                          className="h-7 w-7 flex-shrink-0 rounded-full p-0"
                        />
                      </div>
                    </div>
                  </CardShell>
                )
              })}
            </ScrollRow>
          )}
        </div>
      )}
    </section>
  )
}
