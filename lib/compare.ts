import { mediaTitleKey } from '@/lib/tmdb/kind'
import type { MediaItem } from '@/types'

/** Минимум полей тайтла, нужный для сравнения библиотек. */
export type CompareItem = Pick<MediaItem, 'tmdb_id' | 'type' | 'rating' | 'status' | 'title'>

export interface CommonTitle<T extends CompareItem> {
  mine: T
  theirs: T
}

export interface LibraryComparison<T extends CompareItem> {
  /** Есть у обоих и никто не держит в «Хочу посмотреть». Сначала самые большие расхождения оценок */
  common: CommonTitle<T>[]
  /** Любимое друга, которого нет в моей библиотеке. По его оценке, по убыванию */
  theirFavoritesMissing: T[]
  /** Сколько «любимого» у друга всего — до вычитания моей библиотеки */
  theirFavoritesTotal: number
}

/** С этой оценки тайтл считается любимым — та же граница, что у фильтра библиотеки «8+». */
export const FAVORITE_MIN_RATING = 8
/** Если у друга нет ни одной оценки 8+, любимым считается его топ по оценке такого размера. */
export const FAVORITE_FALLBACK_TOP = 10

/**
 * Ключ совпадения тайтла между библиотеками.
 * У TMDB фильмы и сериалы — разные пространства id, поэтому одного tmdb_id мало.
 * Точный type не годится: anime/animation вычисляются по жанрам при добавлении и могут разойтись,
 * поэтому сравниваем по роду TMDB: movie/animation → фильм, tv/anime → сериал.
 */
export function libraryKey(item: Pick<MediaItem, 'tmdb_id' | 'type'>): string {
  return mediaTitleKey(item.type, item.tmdb_id)
}

function byTitle(a: CompareItem, b: CompareItem): number {
  return a.title.localeCompare(b.title, 'ru')
}

/** Разница и сумма оценок пары; null, если хотя бы у одного оценки нет. */
function ratingPair(pair: CommonTitle<CompareItem>): { diff: number; sum: number } | null {
  const a = pair.mine.rating
  const b = pair.theirs.rating
  if (a == null || b == null) return null
  return { diff: Math.abs(a - b), sum: a + b }
}

function compareCommon(a: CommonTitle<CompareItem>, b: CommonTitle<CompareItem>): number {
  const ra = ratingPair(a)
  const rb = ratingPair(b)
  // Пары без оценки у кого-то из двоих — в конец
  if (ra && !rb) return -1
  if (!ra && rb) return 1
  if (ra && rb) {
    if (ra.diff !== rb.diff) return rb.diff - ra.diff
    if (ra.sum !== rb.sum) return rb.sum - ra.sum
  }
  return byTitle(a.theirs, b.theirs)
}

function pickFavorites<T extends CompareItem>(items: T[]): T[] {
  const rated = items
    .filter((i): i is T & { rating: number } => i.rating != null && i.status !== 'planned')
    .sort((a, b) => b.rating - a.rating || byTitle(a, b))
  const favorites = rated.filter((i) => i.rating >= FAVORITE_MIN_RATING)
  return favorites.length > 0 ? favorites : rated.slice(0, FAVORITE_FALLBACK_TOP)
}

/** Сравнивает мою библиотеку с библиотекой друга. Чистая функция, без запросов. */
export function compareLibraries<T extends CompareItem>(mine: T[], theirs: T[]): LibraryComparison<T> {
  const mineByKey = new Map<string, T>()
  for (const item of mine) mineByKey.set(libraryKey(item), item)

  const common: CommonTitle<T>[] = []
  for (const item of theirs) {
    const my = mineByKey.get(libraryKey(item))
    if (my && my.status !== 'planned' && item.status !== 'planned') {
      common.push({ mine: my, theirs: item })
    }
  }
  common.sort(compareCommon)

  // Порог считается по всей его библиотеке, и только потом вычитается моя —
  // иначе запасной топ зависел бы от того, что лежит у меня
  const favorites = pickFavorites(theirs)
  const theirFavoritesMissing = favorites.filter((i) => !mineByKey.has(libraryKey(i)))

  return { common, theirFavoritesMissing, theirFavoritesTotal: favorites.length }
}
