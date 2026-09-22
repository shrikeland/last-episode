// TMDB отдаёт разные справочники жанров для фильмов и сериалов:
// у фильмов «боевик» и «приключения», у сериалов — «Боевик и Приключения».
// В библиотеке они лежат вперемешку, поэтому фильтр работает по каноническому
// (фильмовому, в нижнем регистре) жанру и ищет все его сохранённые варианты.

/** Составные жанры сериалов → канонические жанры фильмов */
const TV_GENRE_MAP: Record<string, string[]> = {
  'Боевик и Приключения': ['боевик', 'приключения'],
  'НФ и Фэнтези': ['фантастика', 'фэнтези'],
  'Война и Политика': ['военный'],
}

/** Канонические жанры, на которые раскладывается сохранённый жанр */
export function toCanonicalGenres(stored: string): string[] {
  return TV_GENRE_MAP[stored] ?? [stored.toLowerCase()]
}

/** Все формы, в которых канонический жанр может лежать в `media_items.genres` */
export function genreVariants(canonical: string): string[] {
  const variants = new Set([canonical, capitalizeGenre(canonical)])
  for (const [tvGenre, mapped] of Object.entries(TV_GENRE_MAP)) {
    if (mapped.includes(canonical)) variants.add(tvGenre)
  }
  return [...variants]
}

/** Уникальные канонические жанры по списку сохранённых, отсортированные по алфавиту */
export function collectCanonicalGenres(stored: string[]): string[] {
  const set = new Set(stored.flatMap(toCanonicalGenres))
  return [...set].sort((a, b) => a.localeCompare(b, 'ru'))
}

export function capitalizeGenre(genre: string): string {
  return genre.charAt(0).toUpperCase() + genre.slice(1)
}
