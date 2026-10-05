// Отметки серий и оценка больше не перерисовывают страницы через revalidatePath (см. app/actions/progress.ts).
// «Назад» на библиотеку берёт её из клиентского кэша роутера, поэтому после изменения
// помечаем её устаревшей, а RefreshIfStale один раз обновляет её при следующем показе.
// Модульная переменная живёт, пока живёт вкладка; после полной перезагрузки библиотека и так свежая.
let stale = false

export function markLibraryStale() {
  stale = true
}

export function consumeLibraryStale(): boolean {
  const wasStale = stale
  stale = false
  return wasStale
}
