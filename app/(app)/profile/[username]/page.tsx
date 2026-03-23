import { notFound } from 'next/navigation'
import { UserCircle2, CalendarDays, Lock } from 'lucide-react'
import { getUserProfile } from '@/app/actions/users'
import { StatsOverview } from '@/components/stats/StatsOverview'
import { StatsBreakdown } from '@/components/stats/StatsBreakdown'
import { GenreTopList } from '@/components/stats/GenreTopList'
import { ProfileLibrarySections } from '@/components/profile/ProfileLibrarySections'

export const dynamic = 'force-dynamic'

interface ProfilePageProps {
  params: Promise<{ username: string }>
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params
  const data = await getUserProfile(username)

  if (!data) notFound()

  const { profile, mediaItems, stats } = data

  const joinDate = new Date(profile.created_at).toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
  })

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
      {/* Шапка профиля */}
      <div className="flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
          <UserCircle2 className="h-10 w-10 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">@{profile.username}</h1>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
            <CalendarDays className="h-3.5 w-3.5" />
            <span>На сайте с {joinDate}</span>
          </div>
        </div>
      </div>

      {/* Статистика */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Статистика</h2>
        <StatsOverview stats={stats} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatsBreakdown stats={stats} />
          <GenreTopList topGenres={stats.topGenres} />
        </div>
      </section>

      {/* Библиотека */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Библиотека</h2>

        {!profile.is_library_public ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
            <Lock className="h-4 w-4" />
            <span>Библиотека скрыта пользователем</span>
          </div>
        ) : mediaItems.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6">Библиотека пуста</p>
        ) : (
          <ProfileLibrarySections items={mediaItems} />
        )}
      </section>
    </div>
  )
}