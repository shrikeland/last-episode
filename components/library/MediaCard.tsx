'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { toast } from 'sonner'
import { Trash2, Film } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { deleteMediaItem } from '@/app/actions/media'
import { MEDIA_STATUS_LABELS, MEDIA_TYPE_LABELS } from '@/types'
import type { MediaItem } from '@/types'

const STATUS_COLORS: Record<string, string> = {
  watching: 'text-status-watching',
  completed: 'text-status-completed',
  planned: 'text-status-planned',
  dropped: 'text-status-dropped',
  on_hold: 'text-status-on-hold',
}

interface MediaCardProps {
  item: MediaItem
}

export function MediaCard({ item }: MediaCardProps) {
  const router = useRouter()
  const [isDeleting, setIsDeleting] = useState(false)

  async function handleDelete() {
    setIsDeleting(true)
    const result = await deleteMediaItem(item.id)
    if (result.error) {
      toast.error(result.error)
      setIsDeleting(false)
    } else {
      toast.success('Удалено из коллекции')
      router.refresh()
    }
  }

  return (
    <div
      className="group relative bg-card border border-border rounded-lg overflow-hidden hover:border-primary/40 transition-colors"
      data-testid={`media-card-${item.id}`}
    >
      {/* Постер */}
      <Link href={`/media/${item.id}`} className="block">
        <div className="relative aspect-[2/3] bg-secondary">
          {item.poster_url ? (
            <Image
              src={item.poster_url}
              alt={item.title}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Film className="h-12 w-12 text-muted-foreground/30" />
            </div>
          )}
        </div>
      </Link>

      {/* Кнопка удаления */}
      <div className="absolute top-2 right-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              size="icon"
              className="h-7 w-7"
              disabled={isDeleting}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Удалить из коллекции?</AlertDialogTitle>
              <AlertDialogDescription>
                «{item.title}» будет удалён вместе с прогрессом просмотра. Это действие необратимо.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? 'Удаление...' : 'Удалить'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Инфо */}
      <div className="p-3 space-y-1.5">
        <Link href={`/media/${item.id}`} className="block">
          <h3 className="font-medium text-sm leading-tight line-clamp-2 min-h-[2.2rem] hover:text-primary transition-colors">
            {item.title}
          </h3>
        </Link>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="secondary" className="text-xs px-1.5 py-0">
            {MEDIA_TYPE_LABELS[item.type]}
          </Badge>
          <span className={`text-xs font-medium ${STATUS_COLORS[item.status] ?? 'text-muted-foreground'}`}>
            {MEDIA_STATUS_LABELS[item.status]}
          </span>
        </div>

        {item.release_year && (
          <p className="text-xs text-muted-foreground">{item.release_year}</p>
        )}
      </div>
    </div>
  )
}