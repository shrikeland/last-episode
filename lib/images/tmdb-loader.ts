import type { ImageLoaderProps } from 'next/image'

// Ширины постеров, которые отдаёт сам TMDB (configuration → images.poster_sizes)
const POSTER_WIDTHS = [92, 154, 185, 342, 500, 780]

// https://image.tmdb.org/t/p/w500/abc.jpg → ['500', '/abc.jpg']
const TMDB_SIZED_URL = /^https:\/\/image\.tmdb\.org\/t\/p\/w(\d+)(\/.+)$/

/**
 * Загрузчик next/image: картинки идут прямо с CDN TMDB нужного размера, без Vercel Image
 * Optimization (лишний хоп и квота Hobby, после которой картинки отдают 402).
 *
 * - Постер: ближайший размер TMDB не меньше запрошенного, но не больше сохранённого в src.
 * - Всё остальное (фото актёров w185 — у профилей свой набор размеров, локальные /public)
 *   отдаётся как есть; такие <Image> помечены unoptimized.
 *
 * В dev Next предупреждает «loader does not implement width», когда результат совпал с src
 * (например, w500 для широкой карточки) — это ожидаемо, в проде проверки нет.
 */
export default function tmdbImageLoader({ src, width }: ImageLoaderProps): string {
  const match = TMDB_SIZED_URL.exec(src)
  if (!match) return src

  const stored = Number(match[1])
  // w185 у нас — фото актёров (профили): w92/w154 для них TMDB не отдаёт
  if (stored === 185 || !POSTER_WIDTHS.includes(stored)) return src

  const fit = POSTER_WIDTHS.find((w) => w >= width) ?? stored
  return `https://image.tmdb.org/t/p/w${Math.min(fit, stored)}${match[2]}`
}
