// Без 'use client': рендерится только из клиентского TitleRecommendations
// и получает колбэки, поэтому из серверного компонента не используется.
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, CheckCircle, Film, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { AddToLibraryState } from '@/components/library/AddToLibraryDialog'
import type { TitleRecommendationItem } from '@/components/media/TitleRecommendations'
import { MEDIA_TYPE_LABELS } from '@/types'

interface RelatedTitleDialogProps {
  item: TitleRecommendationItem
  sourceLabel: string
  open: boolean
  onOpenChange: (open: boolean) => void
  state: AddToLibraryState
  libraryId: string | null
  onAdd: () => void
}

export function RelatedTitleDialog({
  item,
  sourceLabel,
  open,
  onOpenChange,
  state,
  libraryId,
  onAdd,
}: RelatedTitleDialogProps) {
  const overview = item.overview.trim()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pr-6 leading-snug">
            {item.title}
            {item.releaseYear != null && (
              <span className="ml-2 text-base font-normal text-muted-foreground">
                ({item.releaseYear})
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-4">
          <div className="relative aspect-[2/3] w-24 flex-shrink-0 overflow-hidden rounded bg-secondary">
            {item.posterUrl ? (
              <Image
                src={item.posterUrl}
                alt={item.title}
                fill
                className="object-cover"
                sizes="96px"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <Film className="h-8 w-8 text-muted-foreground/30" />
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="secondary" className="text-xs">
                {MEDIA_TYPE_LABELS[item.type]}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {sourceLabel}
              </Badge>
            </div>
            {item.releaseYear != null && (
              <p className="text-sm text-muted-foreground">{item.releaseYear}</p>
            )}
          </div>
        </div>

        <DialogDescription
          className={overview ? 'leading-relaxed text-foreground/80' : 'italic'}
        >
          {overview || 'Описания пока нет.'}
        </DialogDescription>

        <DialogFooter>
          {libraryId ? (
            <Button asChild className="gap-1.5">
              <Link href={`/media/${libraryId}`} onClick={() => onOpenChange(false)}>
                Открыть в библиотеке
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : state === 'added' ? (
            <Button type="button" variant="secondary" disabled className="gap-1.5">
              <CheckCircle className="h-4 w-4 text-green-500" />
              В библиотеке
            </Button>
          ) : (
            <Button
              type="button"
              onClick={onAdd}
              disabled={state !== 'idle'}
              className="gap-1.5"
            >
              {state === 'loading' ? (
                'Добавляю...'
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Добавить
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
