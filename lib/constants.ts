export const STATUS_COLORS: Record<string, string> = {
  watching: 'text-status-watching',
  completed: 'text-status-completed',
  planned: 'text-status-planned',
  dropped: 'text-status-dropped',
  on_hold: 'text-status-on-hold',
}

// Vercel runs in UTC — group watch history by the users' local day, not the server's
export const WATCH_TIMEZONE = 'Europe/Moscow'
export const WATCH_TIMELINE_DAYS = 30
