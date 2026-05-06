import Image from 'next/image'
import { UserRound } from 'lucide-react'
import type { TmdbCastMember } from '@/lib/tmdb/tmdb.service'

interface CastListProps {
  cast: TmdbCastMember[]
}

export function CastList({ cast }: CastListProps) {
  if (cast.length === 0) return null

  return (
    <section className="space-y-3" aria-labelledby="cast-heading">
      <h2
        id="cast-heading"
        className="text-sm font-medium text-muted-foreground uppercase tracking-wider"
      >
        Актерский состав
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {cast.map((member) => (
          <article
            key={`${member.id}-${member.character}`}
            className="w-[132px] shrink-0 overflow-hidden rounded-lg border border-border/50 bg-card/80"
          >
            <div className="relative aspect-[2/3] bg-secondary">
              {member.profile_url ? (
                <Image
                  src={member.profile_url}
                  alt={member.name}
                  fill
                  className="object-cover"
                  sizes="132px"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <UserRound className="h-10 w-10 text-muted-foreground/35" />
                </div>
              )}
            </div>
            <div className="space-y-1 p-2.5">
              <h3 className="line-clamp-2 text-sm font-medium leading-tight">
                {member.name}
              </h3>
              {member.character && (
                <p className="line-clamp-2 text-xs leading-snug text-muted-foreground">
                  {member.character}
                </p>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
